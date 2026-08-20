import fitz # PyMuPDF
import os
import json

ORIG_DIR = r'D:\shuroq\ERP Overall\offer letters and payslip'
OUT_DIR = r'D:\shuroq\ERP Overall\ERP\backend\scripts\pdf_analysis'
os.makedirs(OUT_DIR, exist_ok=True)

files = [
    'Aarif part time OFFER LETTER - Google Docs.pdf',
    'Pala lova kishore intenship offer letter - Google Docs.pdf',
    'Shoab  May payslip - Google Sheets.pdf'
]

summary = {}

for f in files:
    path = os.path.join(ORIG_DIR, f)
    doc = fitz.open(path)
    print(f"=== {f} ===")
    print(f"Pages: {len(doc)}")
    
    file_info = []
    for p_idx, page in enumerate(doc):
        rect = page.rect
        pix = page.get_pixmap(dpi=150)
        img_name = f"orig_{os.path.splitext(f)[0][:15]}_p{p_idx}.png".replace(' ', '_')
        pix.save(os.path.join(OUT_DIR, img_name))
        
        blocks = page.get_text("blocks")
        text_dict = page.get_text("dict")
        
        page_data = {
            "page": p_idx,
            "width": rect.width,
            "height": rect.height,
            "image": img_name,
            "block_count": len(blocks),
            "fonts": list(set([span["font"] for b in text_dict["blocks"] if "lines" in b for l in b["lines"] for span in l["spans"]])),
            "font_sizes": list(set([round(span["size"], 1) for b in text_dict["blocks"] if "lines" in b for l in b["lines"] for span in l["spans"]])),
            "sample_blocks": [
                {"bbox": [round(x, 1) for x in b[:4]], "text": b[4][:120].strip()}
                for b in blocks[:15]
            ]
        }
        file_info.append(page_data)
        print(f"  Page {p_idx}: {rect.width}x{rect.height}, Fonts: {page_data['fonts']}, Sizes: {page_data['font_sizes']}")
        for b in page_data['sample_blocks']:
            print(f"    BBox {b['bbox']}: {repr(b['text'][:60])}")
            
    summary[f] = file_info

with open(os.path.join(OUT_DIR, 'summary.json'), 'w') as fp:
    json.dump(summary, fp, indent=2)

print("\nAnalysis complete! Rendered images saved to:", OUT_DIR)
