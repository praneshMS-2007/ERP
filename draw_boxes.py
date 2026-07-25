import sys
from PIL import Image, ImageDraw, ImageFont

img_path = r'C:\Users\Pranesh\.gemini\antigravity-ide\brain\84d98194-0295-46ca-b280-b3297ebff627\media__1784819356243.png'
out_path = r'C:\Users\Pranesh\.gemini\antigravity-ide\brain\84d98194-0295-46ca-b280-b3297ebff627\annotated_dashboard.png'

try:
    img = Image.open(img_path).convert('RGBA')
    width, height = img.size
    
    def draw_section(box, text, color):
        overlay = Image.new('RGBA', img.size, (255, 255, 255, 0))
        d = ImageDraw.Draw(overlay)
        d.rectangle(box, fill=color + (40,), outline=color + (255,), width=3)
        
        # Text background
        x0, y0, x1, y1 = box
        cx = x0 + (x1 - x0) // 2
        cy = y0 + (y1 - y0) // 2
        
        d.rectangle([cx - 80, cy - 15, cx + 80, cy + 15], fill=color + (255,))
        d.text((cx - 70, cy - 5), text, fill=(255, 255, 255, 255))
        
        img.alpha_composite(overlay)

    # Calculate proportional boxes
    # Sidebar
    sb_w = int(width * 0.18)
    draw_section((10, 10, sb_w, height - 10), '1. SIDEBAR', (255, 0, 0))
    
    # Main area
    main_x = sb_w + 15
    main_w = width - 15
    
    # Topbar
    draw_section((main_x, 10, main_w, int(height * 0.15)), '2. TOPBAR', (0, 200, 0))
    
    # Welcome
    draw_section((main_x, int(height * 0.17), main_w, int(height * 0.40)), '3. WELCOME BANNER', (0, 100, 255))
    
    # KPI
    draw_section((main_x, int(height * 0.43), main_w, int(height * 0.65)), '4. KPI GRID', (255, 140, 0))
    
    # Charts (the rest)
    if int(height * 0.68) < height - 10:
        draw_section((main_x, int(height * 0.68), main_w, height - 10), '5. CHARTS SECTION', (128, 0, 128))

    img.save(out_path)
    print('Annotated image saved successfully.')
except Exception as e:
    print('Error:', e)
