import os
import time
# import base64
# from io import BytesIO

# os.environ['HF_HUB_OFFLINE'] = '1'
# os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import pymupdf
from PIL import Image, ImageShow
import numpy as np
import logging
import torch
# from visual_bge.modeling import Visualized_BGE
# from transformers import AutoModel
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration


model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"
model = None
# jina_model = None
commercial_processor = None
commercial_model = None


def load_model():
    global model

    if model is None:
        logging.debug(f"Loading BGE model...")
        model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path)
        model.eval()
    return model


# def load_jina_model():
#     global jina_model
    
#     if jina_model is None:
#         logging.debug(f"Loading Jina reranker model...")
#         jina_model = AutoModel.from_pretrained(
#             'jinaai/jina-reranker-m0',
#             torch_dtype="auto",
#             trust_remote_code=True,
#             # attn_implementation="flash_attention_2"  # Uncomment if you have compatible GPU
#         )
#         jina_model.to('cuda')  # or 'cpu' if no GPU is available
#         jina_model.eval()
#     return jina_model


# def image_to_base64(image: Image.Image) -> str:
#     """Convert PIL Image to base64 string"""
#     buffer = BytesIO()
#     image.save(buffer, format="JPEG")
#     buffer.seek(0)
#     img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
#     return f"data:image/jpeg;base64,{img_base64}"


def load_commercial_reranker():
    global commercial_processor, commercial_model
    
    if commercial_processor is None or commercial_model is None:
        logging.debug(f"Loading commercial reranker model...")
        commercial_processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")
        commercial_model = Qwen2VLForConditionalGeneration.from_pretrained(
            "lightonai/MonoQwen2-VL-v0.1",
            device_map="auto",
            # attn_implementation="flash_attention_2",
            # torch_dtype=torch.bfloat16,
        )
    return commercial_processor, commercial_model


def compute_commercial_score(query: str, image: Image.Image, processor, model) -> float:
    """Compute relevance score using commercial reranker"""
    # Construct the prompt
    prompt = (
        "Assert the relevance of the previous image document to the following query, "
        "answer True or False. The query is: {query}"
    ).format(query=query)

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
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = processor(text=text, images=image, return_tensors="pt").to("cuda")

    # Run inference to obtain logits
    with torch.no_grad():
        outputs = model(**inputs)
        logits_for_last_token = outputs.logits[:, -1, :]

    # Convert tokens and calculate relevance score
    true_token_id = processor.tokenizer.convert_tokens_to_ids("True")
    false_token_id = processor.tokenizer.convert_tokens_to_ids("False")
    relevance_score = torch.softmax(logits_for_last_token[:, [true_token_id, false_token_id]], dim=-1)

    # Return True probability as the score
    return relevance_score[0, 0].item()


def get_document_embedding(document_path: str) -> list[np.ndarray]:
    images_text = []
    with pymupdf.open(document_path) as doc:
        for i, page in enumerate(doc):
            text = page.get_text()
            mat: pymupdf.Matrix = pymupdf.Matrix(1, 1)
            image: Image.Image = page.get_pixmap(matrix=mat).pil_image()
            images_text.append((image, text))
    embeddings = []
    with torch.no_grad():
        for image, text in images_text:
            embeddings.append(model.encode(image=image, text=text))
    logging.debug(f"Embeddings for {len(images_text)} pages processed")
    return [emb.detach().cpu().numpy() for emb in embeddings]


def get_sentence_embedding(sentence: str) -> np.ndarray:
    with torch.no_grad():
        return model.encode(text=sentence).detach().cpu().numpy()


def get_chunk_embeddings(description: str, image: Image.Image, context: str) -> np.ndarray:
    with torch.no_grad():
        return model.encode(image=image, text=f"{description} {context}").detach().cpu().numpy()


def test_rolling_window(
    document_path: str, num_windows: int = 8, query_text: str = "Image of a bell curve"
) -> list[tuple[Image.Image, float]]:
    """
    Extract images from the first page using a rolling window approach and calculate similarity with text query using commercial reranker.

    Args:
        document_path: Path to the PDF document
        num_windows: Number of windows to extract (default: 8)
        query_text: Text query to compare against (default: "Example of bernoulli distribution")

    Returns:
        List of tuples containing (PIL Image, similarity_score) for each windowed region
    """
    # Load commercial reranker
    processor, model = load_commercial_reranker()

    with pymupdf.open(document_path) as doc:
        # Get the first page
        page = doc[20]

        # Get the full page image
        mat = pymupdf.Matrix(2, 2)
        full_image = page.get_pixmap(matrix=mat).pil_image()

        # Get page dimensions
        width, height = full_image.size

        # Calculate window height (35% of page height)
        window_height = int(height * 0.35)

        # Calculate step size to get num_windows windows
        # We want to cover the full height with overlapping windows
        step_size = (height - window_height) / (num_windows - 1) if num_windows > 1 else 0

        windowed_results = []

        for i in range(num_windows):
            # Calculate top position for this window
            top = int(i * step_size)

            # Ensure we don't go beyond the page boundaries
            if top + window_height > height:
                top = height - window_height

            # Crop the image to get the window
            window_image = full_image.crop((0, top, width, top + window_height))

            # Get score from commercial reranker
            score = compute_commercial_score(query_text, window_image, processor, model)

            windowed_results.append((window_image, float(score)))

            print(f"Window {i+1}: top={top}, score={score:.4f}")
            logging.debug(f"Window {i+1}: top={top}, height={window_height}, size={window_image.size}, score={score:.4f}")

        return windowed_results


def unload_model():
    global model, commercial_processor, commercial_model

    if model is not None:
        del model
        model = None
        logging.info(f"BGE model unloaded")
    
    if commercial_processor is not None:
        del commercial_processor
        commercial_processor = None
        logging.info(f"Commercial processor unloaded")
    
    if commercial_model is not None:
        del commercial_model
        commercial_model = None
        logging.info(f"Commercial model unloaded")
    
    torch.cuda.empty_cache()


# load_model()


if __name__ == "__main__":
    # Load commercial reranker
    # load_model()
    load_commercial_reranker()
    
    path = r"Statistics Exam - DONE.pdf" if os.name == "nt" else r"/home/ubuntu/esercizi Ecolgia.pdf"

    # Create images folder if it doesn't exist
    images_folder = "images"
    if not os.path.exists(images_folder):
        os.makedirs(images_folder)
        print(f"Created images folder: {images_folder}")

    windowed_results = test_rolling_window(path)
    print(f"Extracted {len(windowed_results)} windowed images with similarity scores")

    # Save images to the images folder
    for i, (image, similarity) in enumerate(windowed_results):
        # Create filename with similarity score
        filename = f"window_{i+1:02d}_similarity_{similarity:.4f}.png"
        filepath = os.path.join(images_folder, filename)

        # Save the image
        image.save(filepath)
        print(f"Saved: {filename} (similarity: {similarity:.4f})")

    # # Original embedding test
    # embeddings = get_document_embedding(path)
    # query = "bernoulli"
    # enc_query = get_sentence_embedding(query)
    # sims = [enc_query @ emb.T for emb in embeddings]
    # for i, sim in enumerate(sims):
    #     print(f"Similarity with {i + 1}: {round(sim.item(), 2)}")

# load_model()
