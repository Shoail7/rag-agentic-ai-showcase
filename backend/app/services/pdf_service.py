import hashlib
import io
import pymupdf  # PyMuPDF
from typing import Dict, Any, List, Tuple
from pathlib import Path

class PDFProcessingError(Exception):
    pass

class PDFService:
    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB

    @staticmethod
    def calculate_hash(file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    @staticmethod
    def validate_pdf(file_bytes: bytes, filename: str) -> None:
        if not filename.lower().endswith('.pdf'):
            raise PDFProcessingError("Invalid file type: File must have a .pdf extension.")
        
        if len(file_bytes) > PDFService.MAX_FILE_SIZE_BYTES:
            raise PDFProcessingError(f"File size exceeds limit of {PDFService.MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.")

        if not file_bytes.startswith(b"%PDF"):
            raise PDFProcessingError("Invalid PDF format: File header is missing standard PDF marker.")

    @staticmethod
    def extract_document(file_bytes: bytes) -> Dict[str, Any]:
        """
        Extracts pages, text, and structure from PDF bytes.
        """
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise PDFProcessingError(f"Failed to open PDF: {str(e)}")

        if doc.is_encrypted:
            raise PDFProcessingError("Password-protected PDFs are not supported. Please remove the password and try again.")

        page_count = len(doc)
        if page_count == 0:
            raise PDFProcessingError("The PDF document is empty (0 pages).")

        pages_data: List[Dict[str, Any]] = []
        total_chars = 0
        total_words = 0

        for page_idx in range(page_count):
            page = doc[page_idx]
            page_text = page.get_text("text") or ""
            # Clean up trailing spaces and form feeds
            clean_text = page_text.strip()
            char_count = len(clean_text)
            words = len(clean_text.split())

            total_chars += char_count
            total_words += words

            pages_data.append({
                "page_number": page_idx + 1,
                "text": clean_text,
                "char_count": char_count,
                "word_count": words
            })

        # Check if the PDF has virtually no extractable text (e.g. scanned images without OCR)
        if total_chars < 20 and page_count > 0:
            doc.close()
            raise PDFProcessingError(
                "No extractable text was found in this document. It appears to be a scanned image or empty PDF. "
                "Optical Character Recognition (OCR) is required to process scanned images."
            )

        metadata = doc.metadata or {}
        preview_text = pages_data[0]["text"][:1000] if pages_data else ""

        doc.close()

        return {
            "page_count": page_count,
            "char_count": total_chars,
            "word_count": total_words,
            "pages": pages_data,
            "preview_text": preview_text,
            "pdf_metadata": metadata
        }

    @staticmethod
    def render_page_image(file_bytes: bytes, page_number: int, zoom: float = 1.5) -> bytes:
        """
        Renders a specific page of a PDF as a PNG byte string for UI preview.
        page_number is 1-indexed.
        """
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            if page_number < 1 or page_number > len(doc):
                raise ValueError(f"Page number {page_number} is out of bounds (1-{len(doc)}).")

            page = doc[page_number - 1]
            mat = pymupdf.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")
            doc.close()
            return img_bytes
        except Exception as e:
            raise PDFProcessingError(f"Could not render page preview: {str(e)}")

pdf_service = PDFService()

