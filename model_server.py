from visual_bge.modeling import Visualized_BGE
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration
import os
import torch
from PIL import Image
import pymupdf
import numpy as np
import logging
from flask import Flask, request, jsonify
import uuid
import base64
import json
from io import BytesIO

app = Flask(__name__)

model_path = r"C:\Users\fdimo\Downloads\Visualized_m3.pth" if os.name == "nt" else r"/home/ubuntu/Visualized_m3.pth"


reranker = None
reranker_processor = None
embedder = Visualized_BGE(model_name_bge="BAAI/bge-m3", model_weight=model_path, device="cpu")


def load_reranker():
    global reranker, reranker_processor
    reranker_processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")
    reranker = Qwen2VLForConditionalGeneration.from_pretrained(
        "lightonai/MonoQwen2-VL-v0.1",
        device_map="auto",
    )


def unload_reranker():
    global reranker, reranker_processor
    reranker = None
    reranker_processor = None


def compute_similarity_score(query: str, image: Image.Image) -> float:
    """Compute relevance score using commercial reranker"""
    # Construct the prompt
    prompt = ("Assert the relevance of the previous image document to the following query, " "answer True or False. The query is: {query}").format(
        query=query
    )

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
    text = reranker_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = reranker_processor(text=text, images=image, return_tensors="pt").to("cuda")

    # Run inference to obtain logits
    with torch.no_grad():
        outputs = reranker(**inputs)
        logits_for_last_token = outputs.logits[:, -1, :]

    # Convert tokens and calculate relevance score
    true_token_id = reranker_processor.tokenizer.convert_tokens_to_ids("True")
    false_token_id = reranker_processor.tokenizer.convert_tokens_to_ids("False")
    relevance_score = torch.softmax(logits_for_last_token[:, [true_token_id, false_token_id]], dim=-1)

    # Return True probability as the score
    return relevance_score[0, 0].item()


def get_sentence_embedding(sentence: str) -> np.ndarray:
    with torch.no_grad():
        return embedder.encode(text=sentence).detach().cpu().numpy()


def get_chunk_embeddings(description: str, image: Image.Image, context: str) -> np.ndarray:
    with torch.no_grad():
        return embedder.encode(image=image, text=f"{description} {context}").detach().cpu().numpy()


def convert_pil_to_base64(image: Image.Image) -> str:
    """Convert PIL Image to base64 string for JSON serialization"""
    buffered = BytesIO()
    image.save(buffered, format="PNG")
    img_b64_str = base64.b64encode(buffered.getvalue()).decode()
    return img_b64_str


def retrieve_snippet_images(
    document_path: str, snippets: list[dict[str, str | int | np.ndarray]], num_windows: int = 8, window_height_percentage: float = 0.35
) -> list[dict[str, str | Image.Image | int | np.ndarray]]:
    """
    Modifies the snippets list in place to add the image field.

    Args:
        document_path: Path to the PDF document
        snippets: List of snippets to retrieve images for
        num_windows: Number of windows to extract (default: 8)

    """

    page_images = []
    with pymupdf.open(document_path) as doc:
        for page in doc:
            page_images.append(page.get_pixmap(matrix=pymupdf.Matrix(2, 2)).pil_image())

    # Get page dimensions
    width, height = page_images[0].size

    # Calculate window height (35% of page height)
    window_height = int(height * window_height_percentage)

    # Calculate step size to get num_windows windows
    # We want to cover the full height with overlapping windows
    step_size = (height - window_height) / (num_windows - 1) if num_windows > 1 else 0

    for snippet in snippets:
        page_number = snippet["page_number"]
        description = snippet["description"]
        page_image = page_images[page_number - 1]

        windows = []

        for i in range(num_windows):
            # Calculate top position for this window
            top = int(i * step_size)

            # Ensure we don't go beyond the page boundaries
            if top + window_height > height:
                top = height - window_height

            # Crop the image to get the window
            window_image = page_image.crop((0, top, width, top + window_height))

            # Get score from commercial reranker
            score = compute_similarity_score(description, window_image)

            windows.append((window_image, float(score)))

            print(f"Window {i+1}: top={top}, score={score:.4f}")
        best_image = max(windows, key=lambda x: x[1])[0]
        snippet["image"] = convert_pil_to_base64(best_image)
        embedding = get_chunk_embeddings(description, page_image, snippet["context"])
        snippet["embedding"] = embedding.tolist()  # Convert numpy array to list

    return snippets


@app.route("/enrich_snippets", methods=["POST"])
def enrich_snippets():
    """
    Endpoint to compute snippets from a PDF document.

    Expects:
    - PDF file in the request
    - Optional parameters for snippet generation

    Returns:
    - JSON with snippets containing text, page numbers, and relevant images
    """
    # Check if PDF file is in the request
    if "pdf" not in request.files:
        return jsonify({"error": "No PDF file provided"}), 400

    pdf_file = request.files["pdf"]

    # Validate file type
    if not pdf_file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "File must be a PDF"}), 400

    snippets_json = request.form.get("snippets", "[]")
    try:
        snippets = json.loads(snippets_json)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid snippets JSON"}), 400

    if not snippets:
        return jsonify({"error": "No snippets provided"}), 400

    temp_uuid = str(uuid.uuid4())
    temp_pdf_path = f"temp_document_{temp_uuid}.pdf"
    pdf_file.save(temp_pdf_path)

    num_windows = request.form.get("num_windows", 8, type=int)
    window_height_percentage = request.form.get("window_height_percentage", 0.35, type=float)

    load_reranker()
    snippets = retrieve_snippet_images(temp_pdf_path, snippets, num_windows, window_height_percentage)
    unload_reranker()

    return jsonify({"success": True, "snippets": snippets})


if __name__ == "__main__":
    # run flask server
    app.run(host="0.0.0.0", port=8222)
