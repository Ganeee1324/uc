import base64
import json
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic()

with open("data/test.pdf", "rb") as pdf_file:
    pdf_base64 = base64.standard_b64encode(pdf_file.read()).decode("utf-8")

response = client.messages.count_tokens(
    model="claude-3-7-sonnet-20250219",
    system="You are a part of a 2-step fact checker. You are given a document. You need to extract verifiable facts from the document in order to pass it to the model that verifies the facts. When you generate a verifiable fact, you need to include as much test as possible in a single fact, if these phrases are conceptually closely related.",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_base64}},
                # {
                #     "type": "text",
                #     "text": "Please summarize this document."
                # }
            ],
        }
    ],
)

input_tokens = json.loads(response.json())["input_tokens"]
# 3 euros per million tokens
cost = input_tokens * 3 / 1000000
print(f"Tokens: {input_tokens}, Cost: {cost} euros")

# now send the actual request
response = client.messages.create(
    model="claude-3-7-sonnet-20250219",
    max_tokens=1000,
    system="You are a part of a 2-step fact checker. You are given a document. You need to extract verifiable facts from the document in order to pass it to the model that verifies the facts. When you generate a verifiable fact, you need to include as much test as possible in a single fact, if these phrases are conceptually closely related.",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_base64}},
                {
                    "type": "text",
                    "text": 'You are a part of a 2-step fact checker. You are given a document. You need to extract verifiable facts from the document in order to pass it to the model that verifies the facts. When you generate a verifiable fact, you need to include as much test as possible in a single fact, if these phrases are conceptually closely related. Output in the format: fact1\n fact2\n fact3\n ... without saying anything else before or after. Remember, group facts that are closely related by combining them into a single fact, with a dot in between, so not fact1\nfact2\nfact3\n, but fact1.fact2.fact3\n.',
                }
            ],
        },
    ],
)

json_response = json.loads(response.json())

text = json_response["content"][0]["text"]

lista = text.split("\n")

print(lista)
