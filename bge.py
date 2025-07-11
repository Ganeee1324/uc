import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'

import torch
from visual_bge.modeling import Visualized_BGE
import pymupdf
from PIL import Image
import numpy as np
import logging

logging.basicConfig(level=logging.DEBUG, format="[%(levelname)s] %(message)s")

model = None
model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"

def load_model():
    global model
    if model is None:
        logging.debug(f"Loading BGE model...")
        model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path)
        model.eval()

def get_document_embedding(document_path: str) -> list[np.ndarray]:
    load_model()
    images_text = []
    with pymupdf.open(document_path) as doc:
        for i, page in enumerate(doc):
            text = page.get_text()
            mat: pymupdf.Matrix = pymupdf.Matrix(1, 1)
            image: Image.Image = page.get_pixmap(matrix=mat).pil_image()
            images_text.append((image, text))
    embeddings = []
    with torch.no_grad():
        for (image, text) in images_text:
            embeddings.append(model.encode(image=image, text=text))
    logging.debug(f"Embeddings for {len(images_text)} pages processed")
    return [emb.detach().cpu().numpy() for emb in embeddings]

def get_sentence_embedding(sentence: str) -> np.ndarray:
    load_model()
    with torch.no_grad():
        return model.encode(text=sentence).detach().cpu().numpy()

if __name__ == "__main__":
    path = r"C:\Users\fdimo\Desktop\Statistics Exam - DONE.pdf" if os.name == "nt" else r"/home/ubuntu/esercizi Ecolgia.pdf"
    embeddings = get_document_embedding(path)
    query = "bernoulli"
    enc_query = get_sentence_embedding(query)
    sims = [enc_query @ emb.T for emb in embeddings]
    for i, sim in enumerate(sims):
        print(f"Similarity with {i + 1}: {round(sim.item(), 2)}")

# load_model()