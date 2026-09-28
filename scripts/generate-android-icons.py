#!/usr/bin/env python3
"""Generate sharp Android launcher icons for Taxi ProMax."""
import os, struct, zlib, base64
from io import BytesIO

def write_solid_png(path, w, h, rgb=(0, 84, 163)):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    r, g, b = rgb
    raw = b"".join(b"\x00" + bytes([r, g, b]) * w for _ in range(h))
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(data)

def main():
    from PIL import Image, ImageFilter
    icon_dir = "res/icon/android"
    os.makedirs(icon_dir, exist_ok=True)
    sizes = {"ldpi": 36, "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    best, best_size = None, 0

    for candidate in [
        "scripts/logo-source.jpg.b64",
        "res/icon/android/logo-source.jpg.b64",
        "res/icon/android/mdpi.png.b64",
        "res/icon/android/ldpi.png.b64",
    ]:
        if os.path.isfile(candidate) and os.path.getsize(candidate) > 500:
            try:
                raw = base64.b64decode(open(candidate).read().strip())
                img = Image.open(BytesIO(raw)).convert("RGBA")
                if img.size[0] * img.size[1] >= best_size:
                    best, best_size = img, img.size[0] * img.size[1]
                print(f"Loaded {candidate}: {img.size}")
            except Exception as e:
                print(f"Skip {candidate}: {e}")

    for name in sizes:
        b64p = f"{icon_dir}/{name}.png.b64"
        if os.path.isfile(b64p) and os.path.getsize(b64p) > 500:
            try:
                raw = base64.b64decode(open(b64p).read().strip())
                img = Image.open(BytesIO(raw)).convert("RGBA")
                if img.size[0] * img.size[1] >= best_size:
                    best, best_size = img, img.size[0] * img.size[1]
                print(f"Loaded {b64p}: {img.size}")
            except Exception as e:
                print(f"Skip {b64p}: {e}")

    if best is None:
        print("No logo, solid placeholders")
        for name, size in sizes.items():
            write_solid_png(f"{icon_dir}/{name}.png", size, size)
    else:
        for name, size in sizes.items():
            pngp = f"{icon_dir}/{name}.png"
            img = best.resize((size, size), Image.Resampling.LANCZOS)
            if size > best.size[0]:
                img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=150, threshold=2))
            img.save(pngp, "PNG", optimize=True)
            print(f"Wrote {pngp} ({size}x{size}) from {best.size}")

    splashes = {
        "land-ldpi": (320, 200), "land-mdpi": (480, 320),
        "land-hdpi": (800, 480), "land-xhdpi": (1280, 720),
        "port-ldpi": (200, 320), "port-mdpi": (320, 480),
        "port-hdpi": (480, 800), "port-xhdpi": (720, 1280),
    }
    for name, (w, h) in splashes.items():
        write_solid_png(f"res/screen/android/splash-{name}.png", w, h)

    bg = f"{icon_dir}/ic_launcher_background.xml"
    fg = f"{icon_dir}/ic_launcher_foreground.xml"
    if not os.path.isfile(bg):
        open(bg, "w").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0A1628</color>\n</resources>\n')
    if not os.path.isfile(fg):
        open(fg, "w").write('<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp" android:height="108dp"\n    android:viewportWidth="108" android:viewportHeight="108">\n    <path android:fillColor="#FFD100"\n        android:pathData="M54,30c-13.2,0 -24,10.8 -24,24s10.8,24 24,24 24,-10.8 24,-24 -10.8,-24 -24,-24z"/>\n</vector>\n')
    print("Icon/splash ensure done")

if __name__ == "__main__":
    main()
