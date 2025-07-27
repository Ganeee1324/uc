import os
import time

# os.environ['HF_HUB_OFFLINE'] = '1'
# os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

import pymupdf
from PIL import Image, ImageShow
import numpy as np
import logging
import torch
from visual_bge.modeling import Visualized_BGE


model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"
model = None


def load_model():
    global model

    if model is None:
        logging.debug(f"Loading BGE model...")
        model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path)
        model.eval()
    return model


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


def compute_colbert_similarity(colbert_vectors_q: np.ndarray, colbert_vectors_d: np.ndarray) -> float:
    """
    Computes the ColBERT similarity (MaxSim) between a query and a document's ColBERT vectors.

    Args:
        colbert_vectors_q: NumPy array of shape (N, D) for the query's ColBERT vectors.
        colbert_vectors_d: NumPy array of shape (M, D) for the document's ColBERT vectors.

    Returns:
        The final ColBERT similarity score.
    """
    # Ensure inputs are NumPy arrays
    if not isinstance(colbert_vectors_q, np.ndarray):
        colbert_vectors_q = np.array(colbert_vectors_q)
    if not isinstance(colbert_vectors_d, np.ndarray):
        colbert_vectors_d = np.array(colbert_vectors_d)

    # Calculate the similarity matrix (dot product)
    # Shape: (N, M)
    similarity_matrix = colbert_vectors_q @ colbert_vectors_d.T

    # For each query token, find the max similarity with any document token
    # Shape: (N,)
    max_similarity_scores = np.max(similarity_matrix, axis=1)

    # The final score is the mean of these max scores
    colbert_score = np.mean(max_similarity_scores)

    return float(colbert_score)


def compute_top_n_colbert_similarity(colbert_vectors_q: np.ndarray, colbert_vectors_d: np.ndarray, n: int = 200) -> float:
    """
    Computes the average similarity of the best n matching vectors for each query token.

    Args:
        colbert_vectors_q: NumPy array of shape (N, D) for the query's ColBERT vectors.
        colbert_vectors_d: NumPy array of shape (M, D) for the document's ColBERT vectors.
        n: The number of top matches to consider for each query token.

    Returns:
        The overall similarity, averaged from the top n matches.
    """
    # Ensure n is not larger than the number of document vectors
    if n > colbert_vectors_d.shape[0]:
        n = colbert_vectors_d.shape[0]

    # Calculate the similarity matrix (dot product)
    similarity_matrix = colbert_vectors_q @ colbert_vectors_d.T

    # For each query token, sort similarities and get the top n
    # np.sort sorts in ascending order, so we take the last 'n' elements
    top_n_similarities = np.sort(similarity_matrix, axis=1)[:, -n:]

    # Calculate the mean of these top n scores for each query token
    avg_per_query_token = np.mean(top_n_similarities, axis=1)

    # The final score is the mean of these averages
    overall_similarity = np.mean(avg_per_query_token)

    return float(overall_similarity)


def test_rolling_window(
    document_path: str, num_windows: int = 6, query_text: str = "Example of bernoulli distribution"
) -> list[tuple[Image.Image, float]]:
    """
    Extract images from the first page using a rolling window approach and calculate similarity with text query.

    Args:
        document_path: Path to the PDF document
        num_windows: Number of windows to extract (default: 10)
        query_text: Text query to compare against (default: "An example about bernoulli")

    Returns:
        List of tuples containing (PIL Image, similarity_score) for each windowed region
    """
    # Get query embedding
    result = model.encode(text=query_text)
    query_embedding, query_embedding_colbert = result[0].detach().cpu().numpy().squeeze(), result[1].detach().cpu().numpy().squeeze()

    with pymupdf.open(document_path) as doc:
        # Get the first page
        page = doc[20]

        # Get the full page image
        mat = pymupdf.Matrix(2, 2)
        full_image = page.get_pixmap(matrix=mat).pil_image()

        # Get page dimensions
        width, height = full_image.size

        # Calculate window height (50% of page height)
        window_height = int(height * 0.5)

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

            # Get embedding for the windowed image (no text context for now)
            with torch.no_grad():
                result = model.encode(image=window_image)
                image_embedding, image_embedding_colbert = result[0].detach().cpu().numpy().squeeze(), result[1].detach().cpu().numpy().squeeze()

            # Calculate similarity with query
            similarity = float(query_embedding @ image_embedding.T)
            # colbert_similarity = compute_top_n_colbert_similarity(query_embedding_colbert, image_embedding_colbert)

            windowed_results.append((window_image, similarity))

            print(f"Window {i+1}: top={top}, similarity={similarity:.4f}")
            logging.debug(f"Window {i+1}: top={top}, height={window_height}, size={window_image.size}, similarity={similarity:.4f}")

        return windowed_results


def unload_model():
    global model

    del model
    torch.cuda.empty_cache()
    model = None
    logging.info(f"BGE model unloaded")


load_model()


if __name__ == "__main__":
    path = r"C:\Users\fdimo\Desktop\Statistics Exam - DONE.pdf" if os.name == "nt" else r"/home/ubuntu/esercizi Ecolgia.pdf"

    # Create images folder if it doesn't exist
    images_folder = "images"
    if not os.path.exists(images_folder):
        os.makedirs(images_folder)
        print(f"Created images folder: {images_folder}")

    # Test the rolling window function
    print("Testing rolling window function...")
    print(f"Query: 'An example about bernoulli'")
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
