import subprocess
from pathlib import Path
from typing import Union

libreoffice_path = r"C:\Program Files\LibreOffice\program\soffice.exe"

def libreoffice_convert(input_path: Union[str, Path], output_dir: Union[str, Path], batch: bool = False) -> None:
    """
    Convert DOCX files to PDF using LibreOffice.

    Args:
        input_path: Path to a single DOCX file or a directory containing DOCX files.
        output_dir: Directory where the converted PDFs will be saved.
        batch: If True, convert all DOCX files in the input directory.

    Raises:
        RuntimeError: If the conversion process fails.
    """
    input_path = Path(input_path)
    output_dir = Path(output_dir)

    if batch:
        inputs = list(input_path.glob("*.doc*"))
        if not inputs:
            raise FileNotFoundError(f"No .doc or .docx files found in {input_path}")
    else:
        inputs = [input_path]

    cmd = [
        libreoffice_path,
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        str(output_dir),
        *map(str, inputs)
    ]

    process = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    if process.returncode != 0:
        raise RuntimeError(f"LibreOffice conversion failed: {process.stderr.strip()}")

if __name__ == "__main__":
    input_path = r"C:\Users\fdimo\Desktop\figure.docx"
    output_dir = r"C:\Users\fdimo\Desktop"
    libreoffice_convert(input_path, output_dir, batch=False)