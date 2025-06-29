import pymupdf
from PIL import ImageFilter
from io import BytesIO


def blur_pages(doc_path: str, pages: list[int], blur_strength: int = 2):
    doc = pymupdf.open(doc_path)
    for page_number in pages:
        index = page_number - 1
        if index < 0 or index >= doc.page_count:
            continue

        page: pymupdf.Page = doc.load_page(index)
        mat: pymupdf.Matrix = pymupdf.Matrix(0.5, 0.5)
        image = page.get_pixmap(matrix=mat).pil_image().filter(ImageFilter.GaussianBlur(blur_strength))
        bio = BytesIO()
        image.save(bio, format="PNG")
        bio.seek(0)
        page.clean_contents()
        page.insert_image(page.rect, stream=bio)
    doc.save(doc_path.replace(".pdf", "_redacted.pdf"))
