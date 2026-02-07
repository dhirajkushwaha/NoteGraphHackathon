import os
import time
import easyocr

############################################
# CONFIG
############################################

# Change this to your image
IMAGE_PATH = "test.jpg"

############################################
# MAIN
############################################

print("🚀 Starting EasyOCR test...")

start = time.time()

print("📦 Loading EasyOCR model (first run downloads weights)...")
reader = easyocr.Reader(['en'], gpu=False)

print(f"✅ OCR model loaded in {round(time.time() - start, 2)}s")

if not os.path.exists(IMAGE_PATH):
    print(f"❌ Image not found: {IMAGE_PATH}")
    exit()

print(f"📄 Running OCR on: {IMAGE_PATH}")

start = time.time()

results = reader.readtext(IMAGE_PATH)

elapsed = round(time.time() - start, 2)

print(f"\n⏱ OCR completed in {elapsed}s")
print("\n===== OCR RESULT =====\n")

if not results:
    print("⚠️ No text detected.")
else:
    for box, text, confidence in results:
        print(f"[{round(confidence,2)}] {text}")

print("\n✅ EasyOCR test finished")
