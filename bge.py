import os

from bge_model import Visualized_BGE

# os.environ['HF_HUB_OFFLINE'] = '1'
# os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

from PIL import Image
import numpy as np
import logging
import torch
import threading


model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"
model = None
model_lock = threading.Lock()


def load_model():
    global model

    with model_lock:
        if model is None:
            logging.debug(f"Loading BGE model...")
            model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path)
            model.eval()
    return model


def get_sentence_embedding(sentence: str) -> np.ndarray:
    load_model()
    with torch.no_grad():
        return model.encode(text=sentence)[0].detach().cpu().numpy()


def get_chunk_embeddings(description: str, image: Image.Image, context: str) -> np.ndarray:
    load_model()
    with torch.no_grad():
        return model.encode(image=image, text=f"{description} {context}")[0].detach().cpu().numpy()


def unload_model():
    global model

    with model_lock:
        if model is not None:
            del model
            model = None
            logging.info(f"BGE model unloaded")

        torch.cuda.empty_cache()


if __name__ == "__main__":
    print(get_sentence_embedding("Hello, world!"))
