import torch
from visual_bge.modeling import Visualized_BGE
import pymupdf
from PIL import Image

model = None


def get_document_embedding(document_path: str) -> list[torch.Tensor]:
    global model
    print(f"Loading model")
    if model is None:
        model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=r"C:\Users\fdimo\Downloads\Visualized_m3.pth")
        model.eval()
    print(f"Model loaded")
    images_text = []
    with pymupdf.open(document_path) as doc:
        for i, page in enumerate(doc):
            text = page.get_text()
            mat: pymupdf.Matrix = pymupdf.Matrix(1, 1)
            image: Image.Image = page.get_pixmap(matrix=mat).pil_image()
            images_text.append((image, text))
            print(f"Extracted text and image from page {i}")
    print(f"All images and text extracted")
    embeddings = []
    with torch.no_grad():
        for i, (image, text) in enumerate(images_text):
            embeddings.append(model.encode(image=image, text=text))
            print(f"Embedding {i} processed")
    print(f"All embeddings processed")
    return embeddings

embeddings = get_document_embedding(r"C:\Users\fdimo\Downloads\esercizi Ecolgia.pdf")
query = "Esercizi sulle piramidi ecologiche"
enc_query = model.encode(text=query)
sims = [enc_query @ emb.T for emb in embeddings]
for i, sim in enumerate(sims):
    print(f"Similarity with {i}: {sim.item()}")