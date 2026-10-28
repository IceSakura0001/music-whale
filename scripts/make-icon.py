"""Generate the Music Whale icon: navy tile with a DeepSeek-blue whale."""
from PIL import Image, ImageDraw, ImageFilter

SIZE = 1024
image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# rounded navy tile with a soft blue glow
draw.rounded_rectangle((0, 0, SIZE, SIZE), radius=int(SIZE * 0.22), fill=(10, 16, 32, 255))
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.ellipse((SIZE * 0.08, SIZE * 0.10, SIZE * 0.92, SIZE * 0.94), fill=(77, 107, 254, 70))
glow = glow.filter(ImageFilter.GaussianBlur(SIZE * 0.06))
image = Image.alpha_composite(image, glow)
draw = ImageDraw.Draw(image)

BLUE = (77, 107, 254, 255)
LIGHT = (124, 156, 255, 255)
DEEP = (10, 16, 32, 255)

# whale body (facing left)
draw.ellipse((SIZE * 0.16, SIZE * 0.40, SIZE * 0.72, SIZE * 0.72), fill=BLUE)
# belly highlight
draw.ellipse((SIZE * 0.22, SIZE * 0.53, SIZE * 0.64, SIZE * 0.72), fill=LIGHT)
# tail fluke
draw.polygon([(SIZE * 0.66, SIZE * 0.56), (SIZE * 0.90, SIZE * 0.38), (SIZE * 0.85, SIZE * 0.55),
              (SIZE * 0.90, SIZE * 0.72), (SIZE * 0.66, SIZE * 0.62)], fill=BLUE)
# pectoral fin
draw.polygon([(SIZE * 0.36, SIZE * 0.64), (SIZE * 0.48, SIZE * 0.78), (SIZE * 0.30, SIZE * 0.70)], fill=LIGHT)
# eye
draw.ellipse((SIZE * 0.27, SIZE * 0.47, SIZE * 0.32, SIZE * 0.52), fill=(240, 246, 255, 255))
draw.ellipse((SIZE * 0.285, SIZE * 0.485, SIZE * 0.305, SIZE * 0.505), fill=DEEP)
# spout
for dx, height in ((-0.02, 0.10), (0.03, 0.14), (0.08, 0.09)):
    draw.line([(SIZE * (0.30 + dx), SIZE * 0.40), (SIZE * (0.30 + dx - 0.01), SIZE * (0.40 - height))],
              fill=(124, 156, 255, 200), width=int(SIZE * 0.012))

image.resize((256, 256), Image.LANCZOS).save("build/icon.png")
image.save("build/icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("whale icon written")
