import lmstudio as lms
import pymupdf
from PIL import Image
from io import BytesIO
import logging
import os
import tempfile

# logging.basicConfig(level=logging.DEBUG, format="[%(levelname)s] %(message)s")


def extract_page_images(doc_path: str, start_page: int, num_pages: int):
    """Extract images from PDF pages and return temporary file paths"""
    doc = pymupdf.open(doc_path)
    image_paths = []

    for i in range(num_pages):
        page_num = start_page + i - 1  # Convert to 0-based index
        if page_num >= doc.page_count:
            break

        page = doc.load_page(page_num)
        mat = pymupdf.Matrix(2.0, 2.0)  # Higher resolution for better OCR
        image = page.get_pixmap(matrix=mat).pil_image()

        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        image.save(temp_file.name, format="PNG")
        image_paths.append(temp_file.name)

    doc.close()
    return image_paths


def process_pdf_chunks(doc_path: str, file_name: str, collection_name: str):
    """Process PDF in batches: first 3 pages, then 2 at a time"""
    doc = pymupdf.open(doc_path)
    total_pages = doc.page_count
    doc.close()

    model = lms.llm("google/gemma-3-27b")
    chat = lms.Chat()

    chat.add_system_prompt(
        """
I'm giving you images of pages of a pdf file, you are a bot that does visual pdf semantic chunking and produces texts destined to be transformed to embedding vectors, for a rag system.

HOW TO CHUNK: try to make the chunks based on titles, and try to make them corresponds to paragraphs. for example, a single chunk should contain a cluster of information related to the same concept. The goal is to do RAG on the chunks, so it is imperative to cluster any information that is relevant to the general concept of the chunk, in the same chunk. End a chunk only when the next part of the page begins to represent a different concept.

HOW TO OUTPUT: output in json format, example: {1: {"description": "text1", "context": "context1", "page_number": n}, 2: {"description": "text2", "context": "context2", "page_number": n}}. don't output anything else, just the json. The chunk ids need to be increasing and consistent across prompts, if in the previous prompt you finished with 4, if not specified otherwise, the next id is 5. A chunk can begin in one page and end in another, that's why i'm giving you multiple pages, if this happens and one chunk overflows into another page, overwrite the index with an updated description once you notice it (otherwise don't output chunks that we already outputted in previous responses). When I give you other pages, remember the last thing you outputted and continue from there as i described. Description field: Don't return the exact text, but a detailed description of what the chunk is about or what it explains. don't say "this chunk explains", or "this section", or "this part explains", just tell the content. When the chunk is an explanation, say "Explanation of", if its an exercise "Exercise on", if its an example "example of", etc... context field: include context from the document to enhance the performance of the rag system. Make this context as small as possible. This context is meant to expand on the chunk content, and include stuff that you know because you have the full picture. for example the course, file name or field. don't be afraid to repeat context across chunks. Don't say "This content is part of" or stuff like that, just say the context. For example, if you have a chunk explaining derivatives, the context would be: "(General context around the chunk), Derivatives, Calculus 1, Mathematics". Generate chunks until all the pages are covered.
"""
    )

    current_page = 1
    temp_files = []

    try:
        # Process first 3 pages
        if total_pages >= 3:
            image_paths = extract_page_images(doc_path, 1, 3)
            temp_files.extend(image_paths)

            file_handlers = [lms.prepare_image(src=path) for path in image_paths]
            chat.add_user_message(content=f"File name: {file_name}, Collection name: {collection_name}, Pages: 1-3", images=file_handlers)

            response = model.respond_stream(chat)
            print("Processing pages 1-3:")
            for chunk in response:
                print(chunk.content, end="")
            print("\n" + "=" * 50 + "\n")

            current_page = 4

            # add response to chat
            chat.add_assistant_response(response.result())

        # Process remaining pages 2 at a time
        while current_page <= total_pages:
            end_page = min(current_page + 1, total_pages)

            image_paths = extract_page_images(doc_path, current_page, 2)
            temp_files.extend(image_paths)

            file_handlers = [lms.prepare_image(src=path) for path in image_paths]
            chat.add_user_message(
                content=f"File name: {file_name}, Collection name: {collection_name}, Pages: {current_page}-{end_page}", images=file_handlers
            )

            response = model.respond_stream(chat)
            print(f"Processing pages {current_page}-{end_page}:")
            for chunk in response:
                print(chunk.content, end="")
            print("\n" + "=" * 50 + "\n")

            current_page += 2

            chat.add_assistant_response(response.result())

    finally:
        # Clean up temporary files
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass


if __name__ == "__main__":
    # Example usage
    process_pdf_chunks("Systems of Linear Equations.pdf", "Systems of linear equations", "Linear Algebra")
