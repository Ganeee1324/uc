import torch
from visual_bge.modeling import Visualized_BGE
import pymupdf
from PIL import Image

model = None


def get_document_embedding(document_path):
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

get_document_embedding(r"C:\Users\fdimo\Downloads\esercizi Ecolgia.pdf")

# model = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=r"C:\Users\fdimo\Downloads\Visualized_m3.pth")
# model.eval()
# with torch.no_grad():
#     query_emb = model.encode(image=r"data\schema.png")
#     candidates = [
#         "A schema of a database",
#         "Image of a relational schema in postgres",
#         "Text of a relational schema in postgres",
#         "Lo schema di un database",
#         "Lo schema relazionale in postgres",
#         "A database",
#         "A postgres relational schema",
#         "Appunti sulla fisica",
#         "Rendiconto di un corso universitario",
#         "Iscrizione ad un corso universitario",
#         "Biglietti per un concerto",
#         "Appunti sulle derivate",
#         "Immagine contenente rettangoli con testo collegati da linee nere con sfondo bianco",
#     ]
#     candi_emb = [model.encode(text=candi) for candi in candidates]

# sims = [query_emb @ candi_emb.T for candi_emb in candi_emb]

# for candi, sim in sorted(zip(candidates, sims), key=lambda x: x[1], reverse=True):
#     print(candi, round(sim.item(), 2))
