#!/usr/bin/env python3
"""Dựng video Nhạc Phòng Trà từ storyboard.json + ảnh cảnh + MP3 bằng FFmpeg.

Cách dùng:
  python3 dung_video.py --storyboard storyboard.json --anh-dir anh/ --mp3 nhac-chinh.mp3 \
      --out final.mp4 [--preview preview.mp4]

Trường tuỳ chọn của mỗi cảnh (thêm 23/11/2026):
  "ma":    nhãn hiển thị, ví dụ "07A" (mặc định = so)
  "khung": [x, y, w] — cắt một vùng của ảnh trước khi dựng, tính theo tỉ lệ
           chiều rộng/cao ảnh (0–1). Vùng cắt giữ tỉ lệ ảnh gốc, cao = w.
           Dùng khi hai cảnh dùng chung một ảnh ở góc rộng và góc cận.
Video không chèn chữ, số cảnh hay logo.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile

W, H, FPS = 1920, 1080, 30
MAX_CANH = 25.0      # giây tối đa mỗi ảnh
T_XFADE = 2.0        # cross dissolve
FADE_IN = 1.5
FADE_OUT = 4.0
ZOOM = 0.07          # mức zoom/pan rất nhẹ


def giay(s):
    p = [float(x) for x in str(s).split(":")]
    return p[0] * 60 + p[1] if len(p) == 2 else p[0]


def thoi_luong(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=nw=1:nk=1", path], capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def loi(msg):
    sys.exit(f"LỖI: {msg}")


def ma(c):
    return str(c.get("ma") or f"{c['so']:02d}")


def tinh_timeline(canh, D):
    goc = [giay(c["ketThuc"]) - giay(c["batDau"]) for c in canh]
    k = D / sum(goc)
    dur = [g * k for g in goc]
    vuot = [(ma(c), round(d, 2)) for c, d in zip(canh, dur) if d > MAX_CANH + 0.05]
    if vuot:
        loi(f"MP3 dài {D:.2f}s, sau khi căn lại các cảnh {vuot} vượt {MAX_CANH}s/ảnh. Cần thêm cảnh.")
    return dur


def bo_loc_canh(c, n_frames, length):
    hu = (c.get("hieuUng") or "").lower()
    N = max(n_frames - 1, 1)
    if "zoom in" in hu:
        z, x, y = f"1+{ZOOM}*on/{N}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    elif "zoom out" in hu:
        z, x, y = f"1+{ZOOM}-{ZOOM}*on/{N}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    elif "pan right" in hu:
        z, x, y = f"1+{ZOOM}", f"(iw-iw/zoom)*on/{N}", "ih/2-(ih/zoom/2)"
    elif "pan left" in hu:
        z, x, y = f"1+{ZOOM}", f"(iw-iw/zoom)*(1-on/{N})", "ih/2-(ih/zoom/2)"
    else:  # static: vẫn trôi cực nhẹ cho khỏi "đơ"
        z, x, y = f"1+0.02*on/{N}", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    f = []
    k = c.get("khung")
    if k:
        kx, ky, kw = (float(v) for v in k)
        f.append(f"crop=iw*{kw}:ih*{kw}:iw*{kx}:ih*{ky}")
    f += [f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase:flags=lanczos",
          f"crop={W*2}:{H*2}", "setsar=1",
          f"zoompan=z='{z}':x='{x}':y='{y}':d={n_frames}:s={W}x{H}:fps={FPS}"]
    lp = (c.get("lopPhu") or "").lower()
    if "flicker" in lp:
        f.append("eq=brightness='0.012*sin(2*PI*t*0.35)':eval=frame")
    f.append("format=yuv420p")
    return ",".join(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--storyboard", required=True)
    ap.add_argument("--anh-dir", required=True)
    ap.add_argument("--mp3", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--preview")
    ap.add_argument("--grain", type=int, default=3, help="0 = tắt film grain")
    a = ap.parse_args()

    sb = json.load(open(a.storyboard, encoding="utf-8"))
    canh = sorted(sb["canh"], key=lambda c: c["so"])
    thieu = sorted({c["anh"] for c in canh if not os.path.isfile(os.path.join(a.anh_dir, c["anh"]))})
    if thieu:
        loi(f"Thiếu {len(thieu)} ảnh: {', '.join(thieu)}")
    if not os.path.isfile(a.mp3):
        loi(f"Không thấy MP3: {a.mp3}")

    D = thoi_luong(a.mp3)
    dur = tinh_timeline(canh, D)
    n = len(canh)
    print(f"MP3 {D:.3f}s · {n} đoạn · dài nhất {max(dur):.2f}s")

    tmp = tempfile.mkdtemp(prefix="npt_")
    try:
        segs = []
        for i, (c, d) in enumerate(zip(canh, dur)):
            length = d + (T_XFADE if i < n - 1 else 0)
            nf = int(round(length * FPS))
            out = os.path.join(tmp, f"seg{i:02d}.mp4")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(a.anh_dir, c["anh"]),
                            "-vf", bo_loc_canh(c, nf, length), "-frames:v", str(nf),
                            "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", out], check=True)
            segs.append(out)
            print(f"  cảnh {ma(c):>3}: {d:6.2f}s  {c.get('hieuUng')}{'  khung ' + str(c['khung']) if c.get('khung') else ''}")

        # Ghép bằng cross dissolve; tổng thời lượng = đúng D
        inputs, fc, prev, off = [], [], "[0:v]", 0.0
        for s in segs:
            inputs += ["-i", s]
        for i in range(1, n):
            off += dur[i - 1]
            lab = f"[x{i}]"
            fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={T_XFADE}:offset={off:.3f}{lab}")
            prev = lab
        post = [f"fade=t=in:st=0:d={FADE_IN}"]
        if "fade" in (canh[-1].get("chuyenCanh") or "").lower():
            post.append(f"fade=t=out:st={D - FADE_OUT:.3f}:d={FADE_OUT}")
        if a.grain:
            post.append(f"noise=alls={a.grain}:allf=t")
        post.append("format=yuv420p")
        fc.append(f"{prev}{','.join(post)}[v]")
        fc_str = ";".join(fc)

        def xuat(path, scale=None, crf=18, ab="256k"):
            g = fc_str if not scale else fc_str.replace("[v]", "[v0]") + f";[v0]scale={scale}[v]"
            subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-i", a.mp3,
                            "-filter_complex", g, "-map", "[v]", "-map", f"{n}:a",
                            "-t", f"{D:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast",
                            "-crf", str(crf), "-c:a", "aac", "-b:a", ab, "-movflags", "+faststart", path],
                           check=True)
            print(f"Đã xuất {path}: {thoi_luong(path):.3f}s, {os.path.getsize(path)/1e6:.1f} MB")

        xuat(a.out)
        if a.preview:
            xuat(a.preview, scale="1280:720", crf=26, ab="128k")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
