import hashlib
import os
from chunker import process_pdf_chunks
import redact
import torch
import numpy as np
import logging
import pymupdf
from PIL import Image
from io import BytesIO
from typing import List, Dict, Union, Any
from bge_model import Visualized_BGE
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration
import dotenv

dotenv.load_dotenv()

# Import database functions and models
import database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("celery_worker.log")],
)
logger = logging.getLogger(__name__)

FILES_FOLDER = os.getenv("FILES_FOLDER")

# Configuration
import config

# Import the Celery app from celery_config
from celery_config import celery_app as app

# Model configuration
model_path = config.MODEL_PATH

# Global model instances - embedder always loaded, reranker loaded on demand
embedder = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path, device="cpu")
reranker = None
reranker_processor = None


def load_reranker():
    """Load the reranker model temporarily for processing"""
    global reranker, reranker_processor

    if reranker is not None:
        return

    logger.info("Loading reranker model...")

    reranker_processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")
    logger.info("Reranker processor loaded successfully")
    reranker = Qwen2VLForConditionalGeneration.from_pretrained(
        "lightonai/MonoQwen2-VL-v0.1",
        device_map="auto",
    )
    logger.info("Reranker model loaded successfully")


def unload_reranker():
    """Unload the reranker model after processing"""
    global reranker, reranker_processor

    if reranker is not None:
        logger.info("Unloading reranker model...")
        del reranker
        del reranker_processor
        reranker = None
        reranker_processor = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("Reranker model unloaded successfully")


def compute_similarity_score(query: str, image: Image.Image) -> float:
    """Compute relevance score using reranker model"""
    logger.debug(f"Computing similarity score for query: {query[:50]}...")

    # Reranker should already be loaded by the calling function

    # Construct the prompt
    prompt = ("Assert the relevance of the previous image document to the following query, " "answer True or False. The query is: {query}").format(
        query=query
    )

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    # Apply chat template and tokenize
    text = reranker_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = reranker_processor(text=text, images=image, return_tensors="pt").to("cuda")

    # Run inference to obtain logits
    with torch.no_grad():
        outputs = reranker(**inputs)
        logits_for_last_token = outputs.logits[:, -1, :]

    # Convert tokens and calculate relevance score
    true_token_id = reranker_processor.tokenizer.convert_tokens_to_ids("True")
    false_token_id = reranker_processor.tokenizer.convert_tokens_to_ids("False")
    relevance_score = torch.softmax(logits_for_last_token[:, [true_token_id, false_token_id]], dim=-1)

    # Return True probability as the score
    score = relevance_score[0, 0].item()
    logger.debug(f"Similarity score computed: {score:.4f}")

    # Free VRAM
    del inputs, outputs, logits_for_last_token, relevance_score
    torch.cuda.empty_cache()

    return score


def get_sentence_embedding(sentence: str) -> np.ndarray:
    """Get sentence embedding using embedder model"""
    logger.debug(f"Getting sentence embedding for: {sentence[:50]}...")

    with torch.no_grad():
        embedding = embedder.encode(text=sentence)[0].detach().cpu().numpy()
        logger.debug(f"Sentence embedding computed with shape: {embedding.shape}")
        return embedding


def get_chunk_embeddings(description: str, image: Image.Image, context: str) -> np.ndarray:
    """Get chunk embeddings using embedder model"""
    logger.debug(f"Getting chunk embeddings for description: {description[:50]}...")

    with torch.no_grad():
        embedding = embedder.encode(image=image, text=f"{description} {context}")[0].detach().cpu().numpy()
        logger.debug(f"Chunk embedding computed with shape: {embedding.shape}")
        return embedding


def retrieve_snippet_images(
    doc: pymupdf.Document, snippets: List[Dict[str, Union[str, int]]], num_windows: int = 8, window_height_percentage: float = 0.35
) -> List[Dict[str, Any]]:
    """
    Process snippets to add images and embeddings from PDF data in memory.

    Args:
        doc: PDF document
        snippets: List of snippets to process
        num_windows: Number of windows to extract (default: 8)
        window_height_percentage: Height of each window as percentage of page height

    Returns:
        List of enriched snippets with images and embeddings
    """
    logger.info(f"Number of snippets to process: {len(snippets)}")

    # Load reranker for this processing session
    load_reranker()

    try:
        page_images = []
        logger.info("Loading PDF pages from memory...")

        for page in doc:
            page_images.append(page.get_pixmap(matrix=pymupdf.Matrix(2, 2)).pil_image())
        logger.info(f"Loaded {len(page_images)} pages from PDF")

        width, height = page_images[0].size
        window_height = int(height * window_height_percentage)
        step_size = (height - window_height) / (num_windows - 1) if num_windows > 1 else 0

        for i, snippet in enumerate(snippets):
            logger.info(f"Processing snippet {i+1}/{len(snippets)}")
            page_number = snippet["page_number"]
            description = snippet["description"]
            page_image = page_images[page_number - 1]
            logger.info(f"Snippet on page {page_number}, description: {description[:50]}...")

            windows = []

            for j in range(num_windows):
                top = int(j * step_size)
                if top + window_height > height:
                    top = height - window_height

                window_image = page_image.crop((0, top, width, top + window_height))
                score = compute_similarity_score(description, window_image)

                windows.append((window_image, float(score)))
                logger.debug(f"Window {j+1}: top={top}, score={score:.4f}")

            best_image = max(windows, key=lambda x: x[1])[0]
            best_score = max(windows, key=lambda x: x[1])[1]
            logger.info(f"Best window score: {best_score:.4f}")

            snippet["image"] = best_image
            embedding = get_chunk_embeddings(description, page_image, snippet["context"])
            snippet["embedding"] = embedding
            logger.info(f"Snippet {i+1} processing completed")

        logger.info("All snippets processed successfully")
        return snippets

    finally:
        # Always unload reranker after processing
        unload_reranker()


@app.task(bind=True, name="celery_worker.process_pending_files")
def process_pending_files(self):
    """
    Periodic task to process pending files from the queue.
    This task runs every 30 seconds and processes ALL pending files until the queue is empty.
    Each file is processed one at a time.
    """
    logger.info("Starting periodic file processing - checking for pending files...")

    while True:
        with database.connect(vector=True) as conn:
            with conn.cursor() as cursor:
                pending_file = None
                try:
                    with conn.transaction():  # TODO: add error handling
                        cursor.execute(
                            """
                            SELECT * FROM file_processing_queue 
                            WHERE failed = FALSE
                            ORDER BY upload_date ASC 
                            LIMIT 1 FOR UPDATE SKIP LOCKED
                            """
                        )
                        pending_file = cursor.fetchone()
                        if not pending_file:
                            break

                        with pymupdf.open(stream=BytesIO(pending_file["file_data"]), filetype="pdf") as doc:
                            chunks = process_pdf_chunks(doc, pending_file["display_name"], "")
                            logger.info(f"Generated {len(chunks)} chunks")
                            num_pages = doc.page_count
                            doc.save(os.path.join(FILES_FOLDER, pending_file["file_name"]))

                            enriched_chunks = retrieve_snippet_images(doc, chunks, num_windows=8, window_height_percentage=0.35)
                            logger.info(f"Enriched {len(enriched_chunks)} chunks")
                            
                            redacted_doc = redact.blur_pages(doc, [1])
                            redacted_doc.save(os.path.join(FILES_FOLDER, pending_file["file_name"] + "_redacted.pdf"))


                        db_file = database.add_file_to_vetrina(
                            cursor=cursor,
                            requester_id=pending_file["requester_id"],
                            vetrina_id=pending_file["vetrina_id"],
                            file_name=pending_file["file_name"],
                            sha256=hashlib.sha256(pending_file["file_data"]).hexdigest(),
                            extension=pending_file["extension"],
                            price=pending_file["price"],
                            size=len(pending_file["file_data"]),
                            tag=pending_file["tag"],
                            language=pending_file["language"],
                            num_pages=num_pages,
                            display_name=pending_file["display_name"],
                        )

                        database.insert_chunk_embeddings(pending_file["vetrina_id"], db_file.file_id, enriched_chunks, cursor)

                        cursor.execute("DELETE FROM file_processing_queue WHERE uploading_file_id = %s", (pending_file["uploading_file_id"],))
                        pending_file = None
                except Exception as e:
                    logger.error(f"Error processing file: {e}")
                    try:
                        pass
                        # cursor.execute(
                        #     "UPDATE file_processing_queue SET failed = TRUE WHERE uploading_file_id = %s", (pending_file["uploading_file_id"],)
                        # )
                        # conn.commit()
                    except Exception as e:
                        logger.error(f"Error marking file as failed in file processing queue: {e}")
                    finally:
                        pending_file = None

    logger.info("No pending files found in queue")
    return {"message": "No pending files"}
