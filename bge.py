import os
import time

from bge_model import Visualized_BGE

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


model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"
model = None


def load_model():
    global model

    if model is None:
        logging.debug(f"Loading BGE model...")
        model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path)
        model.eval()
    return model


def get_sentence_embedding(sentence: str) -> np.ndarray:
    with torch.no_grad():
        return model.encode(text=sentence)[0].detach().cpu().numpy()


def get_chunk_embeddings(description: str, image: Image.Image, context: str) -> np.ndarray:
    with torch.no_grad():
        return model.encode(image=image, text=f"{description} {context}")[0].detach().cpu().numpy()


def unload_model():
    global model

    if model is not None:
        del model
        model = None
        logging.info(f"BGE model unloaded")

    torch.cuda.empty_cache()


load_model()

if __name__ == "__main__":
    print(get_sentence_embedding("Hello, world!"))