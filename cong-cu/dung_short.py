#!/usr/bin/env python3
"""Dựng YouTube Shorts dọc 1080×1920 cho Nhạc Phòng Trà từ ảnh cảnh + MP3 + file short.json.

Cách dùng:
  python3 dung_short.py --spec anh/NPT-0008/short-01.json --anh-dir anh/ --mp3 nhac-chinh.mp3 --out short-01.mp4

short.json:
{
  "ma": "NPT-0008-S1", "ten": "Em Thuộc Về Biển",
  "batDau": 43.0, "ketThuc": 75.5,            # giây trên MP3 gốc
  "canh": [                                   # tu = giây trên MP3 gốc (cảnh đầu = batDau)
    {"anh": "canh-03.png", "tu": 43.0, "x": [0.30, 0.45]},   # x = vị trí tâm khung dọc (0–1) lúc đầu → lúc cuối
    {"anh": "canh-04.png", "tu": 64.3, "x": 0.4, "zoom": 1.08}
  ],
  "loi": [ {"tu": 50.5, "den": 55.8, "cau": "Em thuộc về biển"} ]   # phụ đề, giây trên MP3 gốc
}
Khung dọc cắt từ ảnh 16:9 theo chiều cao, trượt ngang nhẹ từ x[0] tới x[1].
Chuyển cảnh cross dissolve 0,8 giây. Âm thanh giữ nguyên bản gốc, mờ vào 0,3 giây, mờ ra 1,5 giây.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
XF = 0.8
FONT_DIRS = ["/usr/share/fonts/truetype/google-fonts"]


def tim_font(ten):
    for d in FONT_DIRS:
        for goc, _, files in os.walk(d):
            for f in files:
                if f.startswith(ten):
                    return os.path.join(goc, f)
    sys.exit(f"LỖI: không thấy font {ten}")


def font(ten, size, bien=None):
    f = ImageFont.truetype(tim_font(ten), size)
    if bien:
        try:
            f.set_variation_by_name(bien)
        except Exception:
            pass
    return f


def ve_chu(path, dong, f, mau, y_tam, bong=8):
    """Ảnh RGBA 1080×1920 trong suốt, các dòng chữ căn giữa quanh y_tam."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cao = [d.textbbox((0, 0), s, font=f)[3] for s in dong]
    gian = int(f.size * 0.35)
    tong = sum(cao) + gian * (len(dong) - 1)
    y = y_tam - tong // 2
    vt = []
    for s, h in zip(dong, cao):
        w = d.textlength(s, font=f)
        vt.append(((W - w) / 2, y, s)); y += h + gian
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh)
    for x, y, s in vt:
        sd.text((x + 3, y + 4), s, font=f, fill=(0, 0, 0, 230))
    sh = sh.filter(ImageFilter.GaussianBlur(bong))
    im.alpha_composite(sh); im.alpha_composite(sh)
    for x, y, s in vt:
        d.text((x, y), s, font=f, fill=mau)
    im.save(path)


def ngat_dong(s, f, rong=1000):
    d = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    tu, dong, cur = s.split(), [], ""
    for t in tu:
        th = (cur + " " + t).strip()
        if d.textlength(th, font=f) <= rong:
            cur = th
        else:
            dong.append(cur); cur = t
    dong.append(cur)
    return dong


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--anh-dir", required=True)
    ap.add_argument("--mp3", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    sp = json.load(open(a.spec, encoding="utf-8"))
    t0, t1 = float(sp["batDau"]), float(sp["ketThuc"])
    D = t1 - t0
    canh = sp["canh"]
    if abs(canh[0]["tu"] - t0) > 0.01:
        sys.exit("LỖI: cảnh đầu phải bắt đầu ở batDau")
    moc = [c["tu"] - t0 for c in canh] + [D]
    tmp = tempfile.mkdtemp(prefix="npts_")
    try:
        segs = []
        for i, c in enumerate(canh):
            dai = moc[i + 1] - moc[i] + (XF if i < len(canh) - 1 else 0)
            x = c.get("x", 0.5); x0, x1 = (x, x) if not isinstance(x, list) else x
            z = float(c.get("zoom", 1.0))
            # ảnh 16:9 → cao 3840 (2x), khung 2160×3840 trượt ngang, rồi thu về 1080×1920
            img = Image.open(os.path.join(a.anh_dir, c["anh"])).convert("RGB")
            sw = round(img.width * 3840 * z / img.height); sh = round(3840 * z)
            big = os.path.join(tmp, f"big{i:02d}.png")
            img.resize((sw, sh), Image.LANCZOS).save(big, compress_level=0)   # phóng một lần, ffmpeg chỉ cắt + thu nhỏ
            cx = lambda v: max(0, min(sw - 2160, v * sw - 1080))
            xa, xb = cx(x0), cx(x1); ya = (sh - 3840) / 2
            nf = int(round(dai * FPS))
            # giải mã ảnh lớn một lần rồi lặp khung (nhanh hơn -loop 1 nhiều lần)
            vf = (f"loop=loop={nf}:size=1:start=0,setpts=N/{FPS}/TB,"
                  f"crop=2160:3840:x='{xa}+({xb}-{xa})*t/{dai:.3f}':y={ya},"
                  f"scale={W}:{H}:flags=bicubic,setsar=1,format=yuv420p")
            out = os.path.join(tmp, f"c{i:02d}.mp4")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", big, "-vf", vf, "-frames:v", str(nf), "-r", str(FPS),
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", out], check=True)
            segs.append(out)
            print(f"  cảnh {i+1}: {c['anh']} {moc[i]:.2f}→{moc[i+1]:.2f}s x {x0}→{x1}", flush=True)

        # chữ
        ft = font("Montserrat[", 46, "Bold"); fs = font("Montserrat[", 30, "SemiBold"); fl = font("Lora-Variable", 62, "Bold")
        lop = []
        # nền tối nhẹ trên/dưới để chữ dễ đọc
        nen = Image.new("RGBA", (W, H), (0, 0, 0, 0)); nd = ImageDraw.Draw(nen)
        for y in range(0, 480): nd.line([(0, y), (W, y)], fill=(0, 0, 0, int(120 * (1 - y / 480) ** 1.5)))
        for y in range(1100, 1600):
            k_ = 1 - abs(y - 1340) / 260
            if k_ > 0: nd.line([(0, y), (W, y)], fill=(0, 0, 0, int(110 * k_ ** 1.2)))
        p = os.path.join(tmp, "nen.png"); nen.save(p); lop.append((p, 0, D))
        p = os.path.join(tmp, "tieude.png")
        p2 = os.path.join(tmp, "kenh.png")
        ve_chu(p, ngat_dong(sp["ten"].upper(), ft, 980), ft, (250, 236, 205, 255), 235, 6)
        ve_chu(p2, ["NHẠC PHÒNG TRÀ"], fs, (236, 196, 130, 255), 320, 5)
        t1_ = Image.open(p).convert("RGBA"); t1_.alpha_composite(Image.open(p2).convert("RGBA")); t1_.save(p)
        lop.append((p, 0, D))
        for k, l in enumerate(sp.get("loi", [])):
            p = os.path.join(tmp, f"loi{k:02d}.png")
            ve_chu(p, ngat_dong(l["cau"], fl), fl, (255, 250, 240, 255), 1330)
            lop.append((p, max(0, l["tu"] - t0), min(D, l["den"] - t0)))

        inp, fc, prev, off = [], [], "[0:v]", 0.0
        for s in segs:
            inp += ["-i", s]
        n = len(segs)
        for i in range(1, n):
            off = moc[i]
            fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[x{i}]"); prev = f"[x{i}]"
        fc.append(f"{prev}fade=t=in:st=0:d=0.3[b0]"); prev = "[b0]"
        for j, (p, a_, b_) in enumerate(lop):
            inp += ["-loop", "1", "-framerate", str(FPS), "-t", f"{D:.3f}", "-i", p]
            k = n + j; fd = 0.25 if j else 0.4
            fc.append(f"[{k}:v]format=rgba,fade=t=in:st={a_:.3f}:d={fd}:alpha=1,"
                      f"fade=t=out:st={max(a_, b_ - fd):.3f}:d={fd}:alpha=1[t{j}]")
            fc.append(f"{prev}[t{j}]overlay=0:0:enable='between(t,{a_:.3f},{b_:.3f})'[o{j}]"); prev = f"[o{j}]"
        fc.append(f"{prev}format=yuv420p[v]")
        k = n + len(lop)
        inp += ["-ss", f"{t0:.3f}", "-t", f"{D:.3f}", "-i", a.mp3]
        fc.append(f"[{k}:a]afade=t=in:st=0:d=0.3,afade=t=out:st={D-1.5:.3f}:d=1.5[a]")
        subprocess.run(["ffmpeg", "-v", "error", "-y", *inp, "-filter_complex", ";".join(fc),
                        "-map", "[v]", "-map", "[a]", "-t", f"{D:.3f}", "-r", str(FPS),
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "192k",
                        "-movflags", "+faststart", a.out], check=True)
        print(f"Đã xuất {a.out}: {D:.2f}s, {os.path.getsize(a.out)/1e6:.1f} MB")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
