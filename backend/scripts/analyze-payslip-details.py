import fitz
import json

path = r'D:\shuroq\ERP Overall\offer letters and payslip\Shoab  May payslip - Google Sheets.pdf'
doc = fitz.open(path)
page = doc[0]

text_instances = []
for b in page.get_text("dict")["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                text_instances.append({
                    "text": s["text"],
                    "bbox": [round(x, 1) for x in s["bbox"]],
                    "font": s["font"],
                    "size": round(s["size"], 1),
                    "color": s["color"],
                    "flags": s["flags"]
                })

# Also extract drawings / rectangles / lines
drawings = page.get_drawings()
rects = []
for d in drawings:
    rects.append({
        "rect": [round(x, 1) for x in d["rect"]],
        "fill": d.get("fill"),
        "color": d.get("color"),
        "width": d.get("width")
    })

print("=== ALL TEXT INSTANCES ===")
for t in text_instances:
    print(f"[{t['bbox'][0]:5.1f}, {t['bbox'][1]:5.1f}, {t['bbox'][2]:5.1f}, {t['bbox'][3]:5.1f}] Size {t['size']:4.1f} Font {t['font']:18s} Color {t['color']} : {repr(t['text'])}")

print("\n=== RECTANGLES / LINES ===")
for r in rects[:25]:
    print(r)
