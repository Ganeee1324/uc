from transformers import AutoModel

# comment out the flash_attention_2 line if you don't have a compatible GPU
model = AutoModel.from_pretrained(
    'jinaai/jina-reranker-m0',
    torch_dtype="auto",
    trust_remote_code=True,
    # attn_implementation="flash_attention_2"
)

model.to('cpu')  # or 'cpu' if no GPU is available
model.eval()

# Example query and documents
query = "slm markdown"
documents = [
    "https://raw.githubusercontent.com/jina-ai/multimodal-reranker-test/main/handelsblatt-preview.png",
    "https://raw.githubusercontent.com/jina-ai/multimodal-reranker-test/main/paper-11.png",
    "https://raw.githubusercontent.com/jina-ai/multimodal-reranker-test/main/wired-preview.png",
    "https://jina.ai/blog-banner/using-deepseek-r1-reasoning-model-in-deepsearch.webp"
]

# construct sentence pairs
image_pairs = [[query, doc] for doc in documents]

scores = model.compute_score(image_pairs, max_length=2048, doc_type="image")
print(scores)
# [0.49375027418136597, 0.7889736890792847, 0.47813892364501953, 0.5210812091827393]