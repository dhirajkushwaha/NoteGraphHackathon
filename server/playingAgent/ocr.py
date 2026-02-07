import os

# Disable oneDNN / MKLDNN (CRITICAL on Windows)
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_ENABLE_MKLDNN"] = "0"
os.environ["OMP_NUM_THREADS"] = "1"

from paddleocr import PaddleOCR

print("🚀 Starting PaddleOCR test...")

# Initialize OCR (CPU default)
ocr = PaddleOCR(
    lang="en",
    use_textline_orientation=True
)

print("✅ OCR model loaded")

# CHANGE THIS PATH TO YOUR IMAGE
IMAGE_PATH = "test.png"

if not os.path.exists(IMAGE_PATH):
    print(f"❌ Image not found: {IMAGE_PATH}")
    exit()

print(f"📄 Running OCR on: {IMAGE_PATH}")

try:
    result = ocr.predict(IMAGE_PATH)
except Exception as e:
    print("❌ OCR failed:")
    print(e)
    exit()

print("\n===== OCR RESULT =====\n")

for block in result:
    for line in block:
        print(line["text"])

print("\n✅ OCR completed successfully")