import base64
from io import BytesIO
import pymupdf
from PIL import Image
from transformers import AutoModel
import torch

# Initialize Jina reranker model
model = AutoModel.from_pretrained(
    'jinaai/jina-reranker-m0',
    torch_dtype="auto",
    trust_remote_code=True,
    # attn_implementation="flash_attention_2"  # Uncomment if you have compatible GPU
)

model.to('cuda')  # or 'cpu' if no GPU is available
model.eval()


def extract_images_from_document(document_path: str) -> list[Image.Image]:
    """
    Extract images from a document using the same approach as in bge.py
    
    Args:
        document_path: Path to the PDF document
        
    Returns:
        List of PIL Image objects extracted from each page
    """
    images = []
    with pymupdf.open(document_path) as doc:
        for i, page in enumerate(doc):
            # Get the page as an image using the same method as in bge.py
            mat = pymupdf.Matrix(1, 1)  # Scale factor 1x1
            image = page.get_pixmap(matrix=mat).pil_image()
            images.append(image)
    
    return images


def images_to_base64(images):
    base64_images = []
    for img in images:
        buffer = BytesIO()
        img.save(buffer, format="JPEG")
        buffer.seek(0)

        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        base64_images.append(img_base64)

    return base64_images


def rank_with_jina(query: str, base64_images: list, model) -> list:
    """
    Rank images using Jina reranker
    
    Args:
        query: Text query
        base64_images: List of base64 encoded images
        model: Jina reranker model
        
    Returns:
        List of (index, score) tuples sorted by score in descending order
    """
    # Convert base64 to data URLs for Jina
    image_urls = [f"data:image/jpeg;base64,{img}" for img in base64_images]
    
    # Construct sentence pairs for Jina
    image_pairs = [[query, url] for url in image_urls]
    
    # Get scores from Jina model
    scores = model.compute_score(image_pairs, max_length=2048, doc_type="image")
    
    # Create list of (index, score) tuples and sort by score
    ranked_results = [(i, score) for i, score in enumerate(scores)]
    ranked_results.sort(key=lambda x: x[1], reverse=True)
    
    return ranked_results


# Example usage - replace with your document path
document_path = r"Statistics Exam - DONE.pdf"  # Update this path
extracted_images = extract_images_from_document(document_path)
base64_list = images_to_base64(extracted_images)

# Rank with Jina
query = "What is the probability of getting a 6 when rolling a die?"
results = rank_with_jina(query, base64_list, model)

def process_ranker_results(results, grouped_images, top_k=3, log=False):
    new_grouped_images = []
    for i, (doc_id, score) in enumerate(results[:top_k]):
        if log:
            print(f"Rank {i}:")
            print("Document ID:", doc_id)
            print("Document Score:", score)
            print("Document Base64:", base64_list[doc_id][:30] + "...")
        new_grouped_images.append(grouped_images[doc_id])
    return new_grouped_images


new_grouped_images = process_ranker_results(results, extracted_images, top_k=1, log=True)