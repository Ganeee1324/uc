import torch
from PIL import Image
from transformers import AutoProcessor, Qwen2VLForConditionalGeneration

# Load processor and model
processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-2B-Instruct")
model = Qwen2VLForConditionalGeneration.from_pretrained(
    "lightonai/MonoQwen2-VL-v0.1",
    device_map="auto",
    # attn_implementation="flash_attention_2",
    # torch_dtype=torch.bfloat16,
)

# Define query and load image
query = "What is ColPali?"
image_path = r"C:\Users\fdimo\Desktop\Trump.png"
image = Image.open(image_path)

# Construct the prompt and prepare input
prompt = (
    "Assert the relevance of the previous image document to the following query, "
    "answer True or False. The query is: {query}"
).format(query=query)

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
text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = processor(text=text, images=image, return_tensors="pt").to("cuda")

# Run inference to obtain logits
with torch.no_grad():
    outputs = model(**inputs)
    logits_for_last_token = outputs.logits[:, -1, :]

# Convert tokens and calculate relevance score
true_token_id = processor.tokenizer.convert_tokens_to_ids("True")
false_token_id = processor.tokenizer.convert_tokens_to_ids("False")
relevance_score = torch.softmax(logits_for_last_token[:, [true_token_id, false_token_id]], dim=-1)

# Extract and display probabilities
true_prob = relevance_score[0, 0].item()
false_prob = relevance_score[0, 1].item()

print(f"True probability: {true_prob:.4f}, False probability: {false_prob:.4f}")