import pymupdf
from PIL import Image, ImageFilter
from io import BytesIO
import logging


def blur_pages(doc_path: str, excluded_pages: list[int], blur_strength: int = 0.2):
    doc = pymupdf.open(doc_path)
    indexes = []
    for page_number in excluded_pages:
        if page_number > 0 and page_number <= doc.page_count:
            indexes.append(page_number - 1)
        else:
            raise ValueError(f"Page number {page_number} is out of range")

    for page_index in range(doc.page_count):
        if page_index in indexes:
            continue
        page: pymupdf.Page = doc.load_page(page_index)
        mat: pymupdf.Matrix = pymupdf.Matrix(0.1, 0.1)
        image: Image.Image = page.get_pixmap(matrix=mat).pil_image()  # .filter(ImageFilter.GaussianBlur(blur_strength))
        bio = BytesIO()
        image.save(bio, format="PNG")
        bio.seek(0)
        page.clean_contents()
        page.insert_image(page.rect, stream=bio)
    doc.save(doc_path.replace(".pdf", "_redacted.pdf"))
    logging.debug(f"Redacted {doc.page_count} pages with pages excluded: {indexes}")


if __name__ == "__main__":
    blur_pages("test.pdf", [1])
