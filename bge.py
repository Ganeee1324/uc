import os
import time
import base64
from io import BytesIO

# os.environ['HF_HUB_OFFLINE'] = '1'
# os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import pymupdf
from PIL import Image, ImageShow
import numpy as np
import logging
import torch
# from visual_bge.modeling import Visualized_BGE
from transformers import AutoModel


model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"
model = None
jina_model = None


def load_model():
    global model

    if model is None:
        logging.debug(f"Loading BGE model...")
        model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path)
        model.eval()
    return model


def load_jina_model():
    global jina_model
    
    if jina_model is None:
        logging.debug(f"Loading Jina reranker model...")
        jina_model = AutoModel.from_pretrained(
            'jinaai/jina-reranker-m0',
            torch_dtype="auto",
            trust_remote_code=True,
            # attn_implementation="flash_attention_2"  # Uncomment if you have compatible GPU
        )
        jina_model.to('cuda')  # or 'cpu' if no GPU is available
        jina_model.eval()
    return jina_model


def image_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string"""
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{img_base64}"


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
    document_path: str, num_windows: int = 8, query_text: str = "Example of bernoulli distribution"
) -> list[tuple[Image.Image, float]]:
    """
    Extract images from the first page using a rolling window approach and calculate similarity with text query using Jina reranker.

    Args:
        document_path: Path to the PDF document
        num_windows: Number of windows to extract (default: 6)
        query_text: Text query to compare against (default: "Example of bernoulli distribution")

    Returns:
        List of tuples containing (PIL Image, similarity_score) for each windowed region
    """
    # Load Jina model
    jina_model = load_jina_model()

    with pymupdf.open(document_path) as doc:
        # Get the first page
        page = doc[20]

        # Get the full page image
        mat = pymupdf.Matrix(2, 2)
        full_image = page.get_pixmap(matrix=mat).pil_image()

        # Get page dimensions
        width, height = full_image.size

        # Calculate window height (50% of page height)
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

            # Convert image to base64 for Jina
            image_base64 = image_to_base64(window_image)
            
            # Create image pair for Jina
            image_pair = [query_text, image_base64]
            
            # Get score from Jina model
            with torch.no_grad():
                score = jina_model.compute_score([image_pair], max_length=2048, doc_type="image")

            windowed_results.append((window_image, float(score)))

            print(f"Window {i+1}: top={top}, score={score:.4f}")
            logging.debug(f"Window {i+1}: top={top}, height={window_height}, size={window_image.size}, score={score:.4f}")

        return windowed_results


def unload_model():
    global model, jina_model

    if model is not None:
        del model
        model = None
        logging.info(f"BGE model unloaded")
    
    if jina_model is not None:
        del jina_model
        jina_model = None
        logging.info(f"Jina model unloaded")
    
    torch.cuda.empty_cache()


# load_model()


if __name__ == "__main__":
    # Load both models
    # load_model()
    load_jina_model()
    
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
