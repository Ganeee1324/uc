import base64
from io import BytesIO
import pymupdf
from PIL import Image

from rerankers import Reranker

ranker = Reranker("monovlm", device="cpu")


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


# Example usage - replace with your document path
document_path = r"Statistics Exam - DONE.pdf"  # Update this path
extracted_images = extract_images_from_document(document_path)
base64_list = images_to_base64(extracted_images)
results = ranker.rank("What is the probability of getting a 6 when rolling a die?", base64_list)

def process_ranker_results(results, grouped_images, top_k=3, log=False):
    new_grouped_images = []
    for i, doc in enumerate(results.top_k(top_k)):
        if log:
            print(f"Rank {i}:")
            print("Document ID:", doc.doc_id)
            print("Document Score:", doc.score)
            print("Document Base64:", doc.base64[:30] + "...")
            print("Document Path:", doc.image_path)
        new_grouped_images.append(grouped_images[doc.doc_id])
    return new_grouped_images


new_grouped_images = process_ranker_results(results, extracted_images, top_k=1, log=True)