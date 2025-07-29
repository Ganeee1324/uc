from bge_model import Visualized_BGE
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration
import os
import torch
from PIL import Image
import pymupdf
import numpy as np
import logging
from flask import Flask, request, jsonify
import uuid
import base64
import json
from io import BytesIO

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('model_server.log')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"

logger.info(f"Using model path: {model_path}")

reranker = None
reranker_processor = None
logger.info("Initializing embedder model...")
embedder = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path, device="cpu")
logger.info("Embedder model initialized successfully")


def load_reranker():
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
    global reranker, reranker_processor
    if reranker is None:
        return
    logger.info("Unloading reranker model...")
    reranker = None
    reranker_processor = None
    logger.info("Reranker model unloaded successfully")


def compute_similarity_score(query: str, image: Image.Image) -> float:
    """Compute relevance score using commercial reranker"""
    logger.debug(f"Computing similarity score for query: {query[:50]}...")
    
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
    return score


def get_sentence_embedding(sentence: str) -> np.ndarray:
    logger.debug(f"Getting sentence embedding for: {sentence[:50]}...")
    with torch.no_grad():
        embedding = embedder.encode(text=sentence).detach().cpu().numpy()
        logger.debug(f"Sentence embedding computed with shape: {embedding.shape}")
        return embedding


def get_chunk_embeddings(description: str, image: Image.Image, context: str) -> np.ndarray:
    logger.debug(f"Getting chunk embeddings for description: {description[:50]}...")
    with torch.no_grad():
        embedding = embedder.encode(image=image, text=f"{description} {context}").detach().cpu().numpy()
        logger.debug(f"Chunk embedding computed with shape: {embedding.shape}")
        return embedding


def convert_pil_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string for JSON serialization"""
    logger.debug("Converting PIL image to base64")
    buffered = BytesIO()
    image.save(buffered, format="PNG")
    img_b64_str = base64.b64encode(buffered.getvalue()).decode()
    logger.debug(f"Image converted to base64, length: {len(img_b64_str)}")
    return img_b64_str


def retrieve_snippet_images(
    document_path: str, snippets: list[dict[str, str | int | np.ndarray]], num_windows: int = 8, window_height_percentage: float = 0.35
) -> list[dict[str, str | Image.Image | int | np.ndarray]]:
    """
    Modifies the snippets list in place to add the image field.

    Args:
        document_path: Path to the PDF document
        snippets: List of snippets to retrieve images for
        num_windows: Number of windows to extract (default: 8)

    """
    logger.info(f"Processing document: {document_path}")
    logger.info(f"Number of snippets to process: {len(snippets)}")
    logger.info(f"Using {num_windows} windows with {window_height_percentage*100}% height")

    page_images = []
    logger.info("Loading PDF pages...")
    with pymupdf.open(document_path) as doc:
        for page in doc:
            page_images.append(page.get_pixmap(matrix=pymupdf.Matrix(2, 2)).pil_image())
    logger.info(f"Loaded {len(page_images)} pages from PDF")

    # Get page dimensions
    width, height = page_images[0].size
    logger.info(f"Page dimensions: {width}x{height}")

    # Calculate window height (35% of page height)
    window_height = int(height * window_height_percentage)
    logger.info(f"Window height: {window_height}")

    # Calculate step size to get num_windows windows
    # We want to cover the full height with overlapping windows
    step_size = (height - window_height) / (num_windows - 1) if num_windows > 1 else 0
    logger.info(f"Step size: {step_size}")

    for i, snippet in enumerate(snippets):
        logger.info(f"Processing snippet {i+1}/{len(snippets)}")
        page_number = snippet["page_number"]
        description = snippet["description"]
        page_image = page_images[page_number - 1]
        logger.info(f"Snippet on page {page_number}, description: {description[:50]}...")

        windows = []

        for j in range(num_windows):
            # Calculate top position for this window
            top = int(j * step_size)

            # Ensure we don't go beyond the page boundaries
            if top + window_height > height:
                top = height - window_height

            # Crop the image to get the window
            window_image = page_image.crop((0, top, width, top + window_height))

            # Get score from commercial reranker
            logger.debug(f"Computing score for window {j+1}/{num_windows}")
            score = compute_similarity_score(description, window_image)

            windows.append((window_image, float(score)))

            logger.debug(f"Window {j+1}: top={top}, score={score:.4f}")
        
        best_image = max(windows, key=lambda x: x[1])[0]
        best_score = max(windows, key=lambda x: x[1])[1]
        logger.info(f"Best window score: {best_score:.4f}")
        
        snippet["image"] = convert_pil_to_base64(best_image)
        logger.debug("Computing chunk embedding...")
        embedding = get_chunk_embeddings(description, page_image, snippet["context"])
        snippet["embedding"] = embedding.tolist()  # Convert numpy array to list
        logger.info(f"Snippet {i+1} processing completed")

    logger.info("All snippets processed successfully")
    return snippets


@app.route("/enrich_snippets", methods=["POST"])
def enrich_snippets():
    """
    Endpoint to compute snippets from a PDF document.

    Expects:
    - PDF file in the request
    - Optional parameters for snippet generation

    Returns:
    - JSON with snippets containing text, page numbers, and relevant images
    """
    logger.info("Received enrich_snippets request")
    
    # Check if PDF file is in the request
    if "pdf" not in request.files:
        logger.error("No PDF file provided in request")
        return jsonify({"error": "No PDF file provided"}), 400

    pdf_file = request.files["pdf"]
    logger.info(f"Received PDF file: {pdf_file.filename}")

    # Validate file type
    if not pdf_file.filename.lower().endswith(".pdf"):
        logger.error(f"Invalid file type: {pdf_file.filename}")
        return jsonify({"error": "File must be a PDF"}), 400

    snippets_json = request.form.get("snippets", "[]")
    try:
        snippets = json.loads(snippets_json)
        logger.info(f"Loaded {len(snippets)} snippets from request")
    except json.JSONDecodeError:
        logger.error("Invalid snippets JSON provided")
        return jsonify({"error": "Invalid snippets JSON"}), 400

    if not snippets:
        logger.error("No snippets provided in request")
        return jsonify({"error": "No snippets provided"}), 400

    temp_uuid = str(uuid.uuid4())
    temp_pdf_path = f"temp_document_{temp_uuid}.pdf"
    logger.info(f"Saving PDF to temporary file: {temp_pdf_path}")
    pdf_file.save(temp_pdf_path)

    num_windows = request.form.get("num_windows", 8, type=int)
    window_height_percentage = request.form.get("window_height_percentage", 0.35, type=float)
    logger.info(f"Using parameters: num_windows={num_windows}, window_height_percentage={window_height_percentage}")

    logger.info("Loading reranker model...")
    load_reranker()
    
    logger.info("Starting snippet image retrieval...")
    snippets = retrieve_snippet_images(temp_pdf_path, snippets, num_windows, window_height_percentage)
    
    logger.info("Unloading reranker model...")
    unload_reranker()

    # Clean up temporary file
    try:
        os.remove(temp_pdf_path)
        logger.info(f"Cleaned up temporary file: {temp_pdf_path}")
    except Exception as e:
        logger.warning(f"Failed to clean up temporary file {temp_pdf_path}: {e}")

    logger.info("Request processing completed successfully")
    return jsonify({"success": True, "snippets": snippets})


if __name__ == "__main__":
    logger.info("Starting model server...")
    # run flask server
    app.run(host="0.0.0.0", port=8222)
