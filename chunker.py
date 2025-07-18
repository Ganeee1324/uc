import lmstudio as lms
import pymupdf
from PIL import Image
from io import BytesIO
import logging
import os
import tempfile
import json
import bge
from PIL import Image


def extract_page_images(doc_path: str):
    """Extract images from PDF pages and return temporary file paths"""
    doc = pymupdf.open(doc_path)
    images = []

    for i in range(doc.page_count):
        page = doc.load_page(i)
        mat = pymupdf.Matrix(1.0, 1.0)  # Higher resolution for better OCR
        image = page.get_pixmap(matrix=mat).pil_image()
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        image.save(temp_file.name, format="PNG")
        temp_file.close()
        images.append((temp_file.name, image))

    doc.close()
    return images


def get_current_context_length(chat: lms.Chat, model: lms.LLM) -> int:
    formatted = model.apply_prompt_template(chat)
    return len(model.tokenize(formatted))


def process_pdf_chunks(doc_path: str, file_name: str, collection_name: str) -> list[dict[str, str | int]]:
    """Process PDF one page at a time. Returns list of chunks."""

    # Specify the host IP and port
    SERVER_API_HOST = "lancionaco.love:1234"

    try:
        # This must be the *first* convenience API interaction
        lms.configure_default_client(SERVER_API_HOST)
    except Exception as e:
        pass

    model = lms.llm("google/gemma-3-12b", config={"contextLength": 10000, "gpu": {"ratio": 0.625}})
    chat = lms.Chat()

    schema = {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "description": {"type": "string"},
                "context":     {"type": "string"},
            },
            "required": ["description", "context"],
            "additionalProperties": False
        }
    }


    chat.add_system_prompt(
        """
        I'm giving you images of pages of a pdf file, you are a bot that does visual pdf semantic chunking and produces texts destined to be transformed to embedding vectors, for a rag system.

        HOW TO CHUNK: try to make the chunks based on titles, and try to make them corresponds to paragraphs. for example, a single chunk should contain a cluster of information related to the same concept. The goal is to do RAG on the chunks, so it is imperative to cluster any information that is relevant to the general concept of the chunk, in the same chunk, so don't split too much when you can make a bigger chunk that still makes sense. End a chunk only when the next part of the page begins to represent a different concept. Most of the time, a page contains multiple chunks, but you can still sometimes output 1 if the page is really all about one concept or example or formula.

        HOW TO OUTPUT: output in json format, example: [{"description": "text1", "context": "context1"}, {"description": "Explanation for the variance formula", "context": "Statistics, Mathematics"}, ...]. When I give you other pages, you must remember the last chunk you outputted and continue from there. A chunk can begin in one page and end in another, but don't output chunks that we already outputted, even if in previous responses. Description field: Don't return the exact text, don't return data too specific, and don't return one-time details (data of an exercise), but a description of what the chunk is about or what it explainsl, don't explain the stuff in the chunk, the description should just tell what information is inside. don't say "this chunk explains", or "this section", or "this part explains", just tell the content. When the chunk is an explanation, say "Explanation of", if its an exercise "Exercise on", if its an example "example of", etc... context field: include context from the document to enhance the performance of the rag system. Make this context as small as possible. This context is meant to expand on the chunk content, and include stuff that you know because you have the full picture, for example the course, file name or field. don't be afraid to repeat context across chunks. Don't say "This content is part of" or stuff like that, just say the context. For example, if you have a chunk explaining derivatives, the context would be: "(General context around the chunk), Derivatives, Calculus 1, Mathematics". Generate chunks until all the pages are covered.
        """
    )

    all_chunks = []
    images = extract_page_images(doc_path)

    try:
        # Process one page at a time
        for current_page, (temp_image, _) in enumerate(images):

            file_handlers = [lms.prepare_image(src=temp_image.name)]
            chat.add_user_message(
                content=f"{file_name}, {collection_name}, Page: {current_page}", 
                images=file_handlers
            )

            response = model.respond_stream(chat, response_format=schema, config={"contextOverflowPolicy": "rollingWindow"})
            print(f"Processing page {current_page}:")
            for chunk in response:
                print(chunk.content, end="", flush=True)
            print("\n" + "=" * 50 + "\n")

            chat.add_assistant_response(response.result())
            temp_chunks = json.loads(response.result().content)
            
            # Update page_number for chunks from this page
            for chunk in temp_chunks:
                chunk['page_number'] = current_page
            
            all_chunks.extend(temp_chunks)
            print(f"Current context length: {get_current_context_length(chat, model)}/{model.get_context_length()}")

        model.unload()

        # process embeddings for pages
        for chunk in all_chunks:
            image = images[chunk['page_number']][1]
            chunk['embedding'] = bge.get_chunk_embeddings(chunk['description'], image, chunk['context'])
            
    finally:
        if os.name == "nt":
            bge.unload_model()

    return all_chunks


if __name__ == "__main__":
    # Example usage
    process_pdf_chunks("Statistics Exam - DONE.pdf", "Systems of linear equations", "Statistics")
