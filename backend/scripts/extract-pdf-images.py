import pypdf
import os

pdf_paths = [
    r'D:\shuroq\ERP Overall\offer letters and payslip\Aarif part time OFFER LETTER - Google Docs.pdf',
    r'D:\shuroq\ERP Overall\offer letters and payslip\Pala lova kishore intenship offer letter - Google Docs.pdf',
    r'D:\shuroq\ERP Overall\offer letters and payslip\Shoab  May payslip - Google Sheets.pdf'
]

out_dir = r'D:\shuroq\ERP Overall\ERP\backend\assets\brand'
os.makedirs(out_dir, exist_ok=True)

for p in pdf_paths:
    print('Reading:', p)
    reader = pypdf.PdfReader(p)
    for i, page in enumerate(reader.pages):
        for img_idx, img_obj in enumerate(page.images):
            ext = 'png'
            if hasattr(img_obj, 'name') and '.' in img_obj.name:
                ext = img_obj.name.split('.')[-1]
            base = os.path.splitext(os.path.basename(p))[0].replace(' ', '_')
            filename = f"extracted_{base}_p{i}_{img_idx}.{ext}"
            out_file = os.path.join(out_dir, filename)
            with open(out_file, 'wb') as fp:
                fp.write(img_obj.data)
            print(f"Extracted image: {filename} ({len(img_obj.data)} bytes)")
