from pptx import Presentation
from pptx.util import Pt

prs = Presentation()

def add_slide(title, content_list):
    slide_layout = prs.slide_layouts[1] # Title and Content
    slide = prs.slides.add_slide(slide_layout)
    
    title_shape = slide.shapes.title
    title_shape.text = title
    
    body_shape = slide.placeholders[1]
    tf = body_shape.text_frame
    tf.clear()
    
    for i, point in enumerate(content_list):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = point
        p.font.size = Pt(28)
        p.space_after = Pt(14)

# Slide 1: Title
slide_layout = prs.slide_layouts[0] # Title Slide
slide = prs.slides.add_slide(slide_layout)
title = slide.shapes.title
subtitle = slide.placeholders[1]
title.text = "PRANESH M S"
subtitle.text = "A Curious Learner | Future Machine Learning Engineer | Builder"

# Slide 2: Roots
add_slide("My Roots", [
    "📍 Raised in Salem",
    "🏫 SKV CBSE School, Namakkal",
    "🎓 B.Tech CSE (2nd Year), SRM IST"
])

# Slide 3
add_slide("Beyond the Screen", [
    "🏏 Right-Arm Medium Fast Bowler",
    "🏍️ Bike Enthusiast",
    "🎬 Movie & Web Series Buff"
])

# Slide 4
add_slide("The Learner's Mindset", [
    '"I don\'t consider myself an expert yet.',
    'I see myself as someone who adapts continuously."'
])

# Slide 5
add_slide("My Core Strengths", [
    "Problem Solving | Leadership | Hard Work",
    "Self-Learning | Curiosity | Adaptability | Perfection"
])

# Slide 6
add_slide("What Am I Building Now?", [
    "🤖 Learning Machine Learning fundamentals",
    "📱 Converting web platforms into Flutter apps",
    "⚙️ Mastering DevOps & deployments"
])

# Slide 7
add_slide("The Tech Philosophy", [
    "Broad Mindset. Deep Focus.",
    "Understanding how technologies work together while prioritizing ML."
])

# Slide 8
add_slide("Real-World Exposure", [
    "AI & ML Intern: Modern workflows, real-world product integration.",
    "Cybersecurity Intern: Secure architectures, vulnerability assessment."
])

# Slide 9
add_slide("Milestones & Validation", [
    "🏆 Winner – Hack for Bharat",
    "💼 Part-Time Software Developer (ML Startup)",
    "🚀 Built multiple impact-driven products"
])

# Slide 10
add_slide("Where Am I Going? (5-Year Vision)", [
    "Target: Machine Learning Engineer",
    "Goal: Building intelligent systems for meaningful problems."
])

# Slide 11
add_slide("The Entrepreneurial Spark (Year 1)", [
    "The Plan: Launch a Hybrid Startup (Products + Services)",
    "Status: Part-time foundation building."
])

# Slide 12
add_slide("The Industry Phase (Years 3 to 5)", [
    "Work in a leading tech company.",
    "Learn from industry veterans.",
    "Master scalable product management."
])

# Slide 13
add_slide("The Leap (Years 5 to 10)", [
    "Return to the startup full-time.",
    "Scale it globally with industry experience."
])

# Slide 14
add_slide('The "Why"', [
    '"Why am I doing this?"',
    '"Am I growing, or simply staying busy?"',
    "Everyone should have a cause behind what they do."
])

# Slide 15
add_slide("My Cause", [
    "Making my parents proud and honoring their sacrifices.",
    '"Success isn\'t about reaching a destination.',
    ' It\'s about continuously learning, growing, and staying true to your purpose."',
    "Thank You."
])

prs.save("About_Me_Pranesh.pptx")
print("Presentation generated successfully!")
