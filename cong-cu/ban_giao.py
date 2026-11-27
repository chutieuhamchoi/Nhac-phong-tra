#!/usr/bin/env python3
"""Bàn giao tự động Tí → Tèo: đọc issue của bài, kiểm tra đầu vào, dựng bản xem trước,
lưu lên Google Drive và phản hồi vào issue.

GitHub Actions gọi (xem .github/workflows/ban-giao-dung.yml):
  python3 cong-cu/ban_giao.py --issue 12 --cho 120

Chạy thử cục bộ, không cần GitHub/Drive thật:
  python3 cong-cu/ban_giao.py --issue 1 --cho 0 \
      --gia-github /tmp/gh.json --drive-cuc-bo /duong/dan/Nhac_Phong_Tra

Khối bàn giao trong nội dung issue (Tí ghi, mỗi lần đổi đầu vào thì tăng phienBan):
  ```ban-giao
  ma: NPT-0005
  phienBan: 1
  storyboard: anh/NPT-0005/storyboard.json
  anh: NPT-0005/anh
  mp3: NPT-0005/nhac/nhac-chinh.mp3
  mp3Md5: (tuỳ chọn)
  ghiChu: (tuỳ chọn)
  ```
Đường dẫn anh/mp3 tính từ thư mục gốc Nhac_Phong_Tra trên Drive.

Nhãn: "Sẵn sàng dựng" (Tí gắn) → "Đang dựng" → "Chờ duyệt" hoặc "Cần xử lý".
Mỗi kết quả để lại dấu trong bình luận: <!-- npt-ket-qua ma=… phienBan=… trangThai=xong|loi -->.
Chỉ dấu "xong" mới chặn dựng lại cùng phiên bản; lỗi thì sửa xong gắn lại nhãn là chạy lại.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time
from datetime import datetime, timedelta, timezone

NHAN_SAN_SANG, NHAN_DANG, NHAN_CHO, NHAN_CAN = "Sẵn sàng dựng", "Đang dựng", "Chờ duyệt", "Cần xử lý"
MAU_NHAN = {NHAN_SAN_SANG: "1f883d", NHAN_DANG: "bf8700", NHAN_CHO: "0969da", NHAN_CAN: "cf222e"}
MAX_CANH = 25.0
DAU = re.compile(r"<!-- npt-ket-qua ma=(\S+) phienBan=(\d+) trangThai=(\w+) -->")
TRUONG_BAT_BUOC = ["ma", "phienBan", "storyboard", "anh", "mp3"]
GOC_DRIVE = "Nhac_Phong_Tra"
VN = timezone(timedelta(hours=7))
DUNG_VIDEO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dung_video.py")


def gio_vn():
    return datetime.now(VN).strftime("%H:%M %d/%m/%Y")


# ---------------------------------------------------------------- khối bàn giao
def doc_ban_giao(body):
    """Trả về (dict, [lỗi]). Lấy khối ```ban-giao cuối cùng trong nội dung issue."""
    khoi = re.findall(r"```ban-giao\s*\n(.*?)```", body or "", re.S)
    if not khoi:
        return {}, ["Không thấy khối ```ban-giao trong nội dung issue."]
    d = {}
    for dong in khoi[-1].splitlines():
        m = re.match(r"\s*([A-Za-z0-9_]+)\s*:\s*(.*?)\s*$", dong)
        if m and m.group(2) and not m.group(2).startswith("("):
            d[m.group(1)] = m.group(2)
    loi = [f"Thiếu trường `{k}`." for k in TRUONG_BAT_BUOC if not d.get(k)]
    if d.get("phienBan") and not d["phienBan"].isdigit():
        loi.append(f"`phienBan` phải là số nguyên, đang là `{d['phienBan']}`.")
    if d.get("ma") and not re.fullmatch(r"NPT-\d{4}", d["ma"]):
        loi.append(f"`ma` phải có dạng NPT-0000, đang là `{d['ma']}`.")
    return d, loi


def chuan_duong_dan(p):
    p = p.strip().strip("/").replace("\\", "/")
    return p[len(GOC_DRIVE) + 1:] if p.startswith(GOC_DRIVE + "/") else p


def giay(s):
    p = [float(x) for x in str(s).split(":")]
    return p[0] * 60 + p[1] if len(p) == 2 else p[0]


def kiem_storyboard(sb, ma):
    """Kiểm tra storyboard.json. Trả về (danh sách ảnh cần có, [lỗi], [ghi chú])."""
    loi, ghi = [], []
    if (sb.get("maBai") or sb.get("baiId")) not in (ma, None):
        loi.append(f"Storyboard ghi mã `{sb.get('maBai') or sb.get('baiId')}`, issue ghi `{ma}`.")
    canh = sb.get("canh") or []
    if not canh:
        return [], loi + ["Storyboard không có cảnh nào (`canh` rỗng)."], ghi
    try:
        canh = sorted(canh, key=lambda c: c["so"])
        moc = [(giay(c["batDau"]), giay(c["ketThuc"])) for c in canh]
    except (KeyError, ValueError) as e:
        return [], loi + [f"Cảnh thiếu `so`/`batDau`/`ketThuc` hoặc sai định dạng ({e})."], ghi
    for c, (a, b) in zip(canh, moc):
        ten = c.get("ma") or c["so"]
        if not c.get("anh"):
            loi.append(f"Cảnh {ten} chưa có tên ảnh (`anh`).")
        if b <= a:
            loi.append(f"Cảnh {ten}: ketThuc phải lớn hơn batDau.")
        elif b - a > MAX_CANH + 0.05:
            loi.append(f"Cảnh {ten} dài {b - a:.1f} s, vượt {MAX_CANH:.0f} s/ảnh. Cần tách thêm cảnh.")
    if moc[0][0] > 0.5:
        loi.append(f"Cảnh đầu bắt đầu ở {moc[0][0]:.1f} s, phải bắt đầu từ 0.")
    for (a1, b1), (a2, b2), c in zip(moc, moc[1:], canh[1:]):
        if abs(a2 - b1) > 0.5:
            loi.append(f"Cảnh {c.get('ma') or c['so']} không nối liền cảnh trước ({b1:.1f} s → {a2:.1f} s).")
    if sb.get("thoiLuongMp3") is None:
        ghi.append("Storyboard chưa ghi `thoiLuongMp3`, chỉ đối chiếu MP3 với mốc cảnh cuối.")
    return sorted({c["anh"] for c in canh if c.get("anh")}), loi, ghi


# ---------------------------------------------------------------- GitHub
class GitHub:
    def __init__(self, repo, token):
        import requests
        self.r, self.repo = requests.Session(), repo
        self.r.headers.update({"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"})
        self.api = f"https://api.github.com/repos/{repo}"

    def _ok(self, res):
        if res.status_code >= 300:
            raise RuntimeError(f"GitHub {res.request.method} {res.url} → {res.status_code}: {res.text[:300]}")
        return res.json() if res.text else None

    def issue(self, n):
        return self._ok(self.r.get(f"{self.api}/issues/{n}"))

    def binh_luan(self, n):
        out, p = [], 1
        while True:
            trang = self._ok(self.r.get(f"{self.api}/issues/{n}/comments", params={"per_page": 100, "page": p}))
            out += trang
            if len(trang) < 100:
                return out
            p += 1

    def viet(self, n, body):
        self._ok(self.r.post(f"{self.api}/issues/{n}/comments", json={"body": body}))

    def nhan(self, n, them=(), bo=()):
        for x in them:
            self._ok(self.r.post(f"{self.api}/issues/{n}/labels", json={"labels": [x]}))
        for x in bo:
            res = self.r.delete(f"{self.api}/issues/{n}/labels/{x}")
            if res.status_code not in (200, 404):
                self._ok(res)

    def tao_nhan(self):
        co = {x["name"] for x in self._ok(self.r.get(f"{self.api}/labels", params={"per_page": 100}))}
        for ten, mau in MAU_NHAN.items():
            if ten not in co:
                self._ok(self.r.post(f"{self.api}/labels", json={"name": ten, "color": mau}))

    def tep_repo(self, path):
        with open(path, encoding="utf-8") as f:   # Actions đã checkout main mới nhất
            return f.read()


class GiaGitHub(GitHub):
    """GitHub giả lưu trong một file JSON — để chạy thử cục bộ."""
    def __init__(self, path, repo_dir="."):
        self.path, self.repo_dir = path, repo_dir

    def _d(self):
        with open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def _ghi(self, d):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)

    def issue(self, n):
        i = self._d()["issues"][str(n)]
        return {"number": n, "title": i["title"], "body": i["body"], "labels": [{"name": x} for x in i["labels"]]}

    def binh_luan(self, n):
        return [{"body": b} for b in self._d()["issues"][str(n)].get("comments", [])]

    def viet(self, n, body):
        d = self._d(); d["issues"][str(n)].setdefault("comments", []).append(body); self._ghi(d)

    def nhan(self, n, them=(), bo=()):
        d = self._d(); L = d["issues"][str(n)]["labels"]
        for x in them:
            if x not in L: L.append(x)
        for x in bo:
            if x in L: L.remove(x)
        self._ghi(d)

    def tao_nhan(self):
        pass

    def tep_repo(self, path):
        with open(os.path.join(self.repo_dir, path), encoding="utf-8") as f:
            return f.read()


# ---------------------------------------------------------------- Drive
class Drive:
    """Google Drive qua OAuth refresh token của tài khoản Ông chủ (tài khoản dịch vụ không ghi được vào My Drive cá nhân)."""
    def __init__(self, client_id, client_secret, refresh_token, goc_id):
        import requests
        self.r, self.goc = requests.Session(), goc_id
        res = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id, "client_secret": client_secret,
            "refresh_token": refresh_token, "grant_type": "refresh_token"})
        if res.status_code != 200:
            raise RuntimeError(f"Không lấy được quyền Google Drive (refresh token hết hạn hoặc sai?): {res.text[:200]}")
        self.r.headers["Authorization"] = f"Bearer {res.json()['access_token']}"

    def _con(self, folder_id):
        out, tok = [], None
        while True:
            p = {"q": f"'{folder_id}' in parents and trashed=false", "pageSize": 1000,
                 "fields": "nextPageToken,files(id,name,mimeType,size,md5Checksum,webViewLink)",
                 "supportsAllDrives": "true", "includeItemsFromAllDrives": "true"}
            if tok: p["pageToken"] = tok
            res = self.r.get("https://www.googleapis.com/drive/v3/files", params=p)
            res.raise_for_status(); j = res.json(); out += j["files"]; tok = j.get("nextPageToken")
            if not tok: return out

    def tim(self, path, thu_muc=False):
        cur = {"id": self.goc, "mimeType": "application/vnd.google-apps.folder"}
        for phan in [x for x in chuan_duong_dan(path).split("/") if x]:
            con = [f for f in self._con(cur["id"]) if f["name"] == phan]
            if not con: return None
            cur = con[0]
        if thu_muc != (cur["mimeType"] == "application/vnd.google-apps.folder"):
            return None
        return cur

    def liet_ke(self, folder):
        return {f["name"]: f for f in self._con(folder["id"]) if f["mimeType"] != "application/vnd.google-apps.folder"}

    def tai(self, f, dich):
        with self.r.get(f"https://www.googleapis.com/drive/v3/files/{f['id']}", params={"alt": "media"}, stream=True) as res:
            res.raise_for_status()
            with open(dich, "wb") as o:
                for ch in res.iter_content(1 << 20): o.write(ch)

    def thu_muc(self, path):
        cur = self.goc
        for phan in [x for x in chuan_duong_dan(path).split("/") if x]:
            con = [f for f in self._con(cur) if f["name"] == phan and f["mimeType"].endswith("folder")]
            if con:
                cur = con[0]["id"]
            else:
                res = self.r.post("https://www.googleapis.com/drive/v3/files", json={
                    "name": phan, "mimeType": "application/vnd.google-apps.folder", "parents": [cur]})
                res.raise_for_status(); cur = res.json()["id"]
        return cur

    def gui(self, src, folder_path, ten):
        fid = self.thu_muc(folder_path)
        cu = [f for f in self._con(fid) if f["name"] == ten]
        if cu:   # dựng lại cùng phiên bản sau lỗi: ghi đè nội dung file cũ
            url = f"https://www.googleapis.com/upload/drive/v3/files/{cu[0]['id']}?uploadType=resumable"
            res = self.r.patch(url, json={}, params={"fields": "id,webViewLink"})
        else:
            url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"
            res = self.r.post(url, json={"name": ten, "parents": [fid]}, params={"fields": "id,webViewLink"})
        res.raise_for_status()
        with open(src, "rb") as fh:
            up = self.r.put(res.headers["Location"], data=fh, headers={"Content-Length": str(os.path.getsize(src))})
        up.raise_for_status()
        j = up.json()
        return j.get("webViewLink") or f"https://drive.google.com/file/d/{j['id']}/view"


class DriveCucBo(Drive):
    """Thư mục trên máy đóng vai Drive — để chạy thử."""
    def __init__(self, goc):
        self.goc = goc

    def tim(self, path, thu_muc=False):
        p = os.path.join(self.goc, chuan_duong_dan(path))
        if (os.path.isdir(p) if thu_muc else os.path.isfile(p)):
            md5 = None
            if not thu_muc:
                with open(p, "rb") as f:
                    md5 = hashlib.md5(f.read()).hexdigest()
            return {"id": p, "name": os.path.basename(p), "md5Checksum": md5}
        return None

    def liet_ke(self, folder):
        return {n: {"id": os.path.join(folder["id"], n), "name": n} for n in os.listdir(folder["id"])
                if os.path.isfile(os.path.join(folder["id"], n))}

    def tai(self, f, dich):
        shutil.copy(f["id"], dich)

    def gui(self, src, folder_path, ten):
        d = os.path.join(self.goc, chuan_duong_dan(folder_path)); os.makedirs(d, exist_ok=True)
        shutil.copy(src, os.path.join(d, ten))
        return "file://" + os.path.join(d, ten)


# ---------------------------------------------------------------- quy trình
def thoi_luong(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                       capture_output=True, text=True)
    return float(r.stdout.strip()) if r.returncode == 0 and r.stdout.strip() else None


def dau(ma, ver, tt):
    return f"<!-- npt-ket-qua ma={ma} phienBan={ver} trangThai={tt} -->"


def da_dung(binh_luan, ma, ver):
    for c in binh_luan:
        for m in DAU.finditer(c.get("body") or ""):
            if m.group(1) == ma and int(m.group(2)) == int(ver) and m.group(3) == "xong":
                return True
    return False


def bao_loi(gh, n, ma, ver, muc, ghi=()):
    body = (f"{dau(ma or '?', ver or 0, 'loi')}\n### ⚠️ Tèo chưa dựng được {ma or ''} · phiên bản {ver or '?'}\n\n"
            "Cần xử lý trước khi dựng:\n" + "\n".join(f"- [ ] {x}" for x in muc) +
            ("\n\nGhi chú:\n" + "\n".join(f"- {x}" for x in ghi) if ghi else "") +
            f"\n\nSửa xong thì gắn lại nhãn **{NHAN_SAN_SANG}** (nên tăng `phienBan` nếu đổi đầu vào). · {gio_vn()}")
    gh.viet(n, body)
    gh.nhan(n, them=[NHAN_CAN], bo=[NHAN_DANG, NHAN_SAN_SANG, NHAN_CHO])


def chay(gh, drive, n, cho, workdir=None):
    if cho:
        print(f"Chờ {cho} giây để gom các thay đổi…"); time.sleep(cho)
    iss = gh.issue(n)                                        # đọc lại bản mới nhất sau khi chờ
    nhan = {x["name"] for x in iss["labels"]}
    if NHAN_SAN_SANG not in nhan:
        print(f"Issue #{n} không còn nhãn '{NHAN_SAN_SANG}' → bỏ qua."); return "bo-qua"
    bg, loi = doc_ban_giao(iss["body"])
    ma, ver = bg.get("ma"), bg.get("phienBan")
    m_tieu_de = re.search(r"NPT-\d{4}", iss["title"] or "")
    if ma and m_tieu_de and m_tieu_de.group(0) != ma:
        loi.append(f"Tiêu đề issue là {m_tieu_de.group(0)} nhưng khối bàn giao ghi {ma}.")
    if loi:
        bao_loi(gh, n, ma, ver, loi); return "loi"
    ver = int(ver)
    if da_dung(gh.binh_luan(n), ma, ver):
        print(f"{ma} phiên bản {ver} đã dựng xong trước đó → không dựng trùng.")
        moi, _ = doc_ban_giao(gh.issue(n)["body"])
        if int(moi.get("phienBan") or 0) == ver:
            gh.nhan(n, them=[NHAN_CHO], bo=[NHAN_SAN_SANG, NHAN_DANG])
        return "trung"

    gh.nhan(n, them=[NHAN_DANG], bo=[NHAN_CHO, NHAN_CAN])
    tmp = workdir or tempfile.mkdtemp(prefix="npt_bg_")
    try:
        muc, ghi = [], []
        # 1. storyboard
        try:
            sb = json.loads(gh.tep_repo(bg["storyboard"]))
        except FileNotFoundError:
            bao_loi(gh, n, ma, ver, [f"Không thấy storyboard `{bg['storyboard']}` trên nhánh main."]); return "loi"
        except json.JSONDecodeError as e:
            bao_loi(gh, n, ma, ver, [f"Storyboard `{bg['storyboard']}` không phải JSON hợp lệ ({e})."]); return "loi"
        can_anh, l, g = kiem_storyboard(sb, ma); muc += l; ghi += g
        # 2. ảnh trên Drive
        thu_muc_anh = drive.tim(bg["anh"], thu_muc=True)
        anh_dir = os.path.join(tmp, "anh"); os.makedirs(anh_dir, exist_ok=True)
        if not thu_muc_anh:
            muc.append(f"Không thấy thư mục ảnh `{GOC_DRIVE}/{chuan_duong_dan(bg['anh'])}` trên Drive.")
        else:
            co = drive.liet_ke(thu_muc_anh)
            thieu = [a for a in can_anh if a not in co]
            if thieu:
                muc.append(f"Thiếu {len(thieu)} ảnh trong `{chuan_duong_dan(bg['anh'])}`: " + ", ".join(f"`{a}`" for a in thieu))
            from PIL import Image
            for a in can_anh:
                if a in co:
                    drive.tai(co[a], os.path.join(anh_dir, a))
                    try:
                        with Image.open(os.path.join(anh_dir, a)) as im:
                            w, h = im.size
                    except Exception:
                        muc.append(f"`{a}` không mở được như ảnh."); continue
                    if abs(w / h - 16 / 9) > 0.03:
                        muc.append(f"`{a}` có tỉ lệ {w}×{h}, không phải 16:9.")
                    elif w < 1280:
                        muc.append(f"`{a}` chỉ rộng {w} px, cần từ 1280 px (mục tiêu 1920).")
        # 3. MP3 đã duyệt
        f_mp3 = drive.tim(bg["mp3"])
        mp3 = os.path.join(tmp, "nhac.mp3"); D = None
        if not f_mp3:
            muc.append(f"Không thấy MP3 `{GOC_DRIVE}/{chuan_duong_dan(bg['mp3'])}` trên Drive.")
        else:
            if bg.get("mp3Md5") and f_mp3.get("md5Checksum") and f_mp3["md5Checksum"] != bg["mp3Md5"].lower():
                muc.append(f"MP3 trên Drive (md5 `{f_mp3['md5Checksum']}`) khác bản đã duyệt (`{bg['mp3Md5']}`).")
            drive.tai(f_mp3, mp3)
            D = thoi_luong(mp3)
            if D is None:
                muc.append("Không đọc được MP3 (file hỏng hoặc không phải âm thanh).")
            else:
                tl = sb.get("thoiLuongMp3")
                if tl is not None and abs(float(tl) - D) > 0.5:
                    muc.append(f"MP3 dài {D:.2f} s nhưng storyboard ghi `thoiLuongMp3` {float(tl):.2f} s — có thể sai bản MP3.")
                if sb.get("canh"):
                    cuoi = max(giay(c["ketThuc"]) for c in sb["canh"] if "ketThuc" in c)
                    if abs(cuoi - D) > 1.5:
                        muc.append(f"Cảnh cuối kết thúc ở {cuoi:.1f} s nhưng MP3 dài {D:.1f} s — mốc chưa khớp bản MP3 này.")
        if muc:
            bao_loi(gh, n, ma, ver, muc, ghi); return "loi"

        # 4. dựng
        sb_path = os.path.join(tmp, "storyboard.json")
        with open(sb_path, "w", encoding="utf-8") as f:
            json.dump(sb, f, ensure_ascii=False)
        out = os.path.join(tmp, f"preview-v{ver}.mp4")
        t0 = time.time()
        r = subprocess.run([sys.executable, DUNG_VIDEO, "--storyboard", sb_path, "--anh-dir", anh_dir,
                            "--mp3", mp3, "--out", out], capture_output=True, text=True)
        print(r.stdout[-3000:], r.stderr[-3000:])
        if r.returncode != 0 or not os.path.isfile(out):
            duoi = (r.stderr or r.stdout).strip().splitlines()[-6:]
            bao_loi(gh, n, ma, ver, ["Dựng video lỗi. Tèo xem log của lượt chạy; nếu là lỗi đầu vào sẽ ghi rõ ở đây."],
                    ["```\n" + "\n".join(duoi) + "\n```"]); return "loi"
        D_out = thoi_luong(out)
        # 5. lưu Drive
        link = drive.gui(out, f"{ma}/video", f"preview-v{ver}.mp4")
        # 6. phản hồi
        moi, _ = doc_ban_giao(gh.issue(n)["body"])
        ver_moi = int(moi.get("phienBan") or 0)
        body = (f"{dau(ma, ver, 'xong')}\n### ✅ Tèo đã dựng {ma} · phiên bản {ver}\n\n"
                f"- Bản xem trước: {link}\n"
                f"- File: `{GOC_DRIVE}/{ma}/video/preview-v{ver}.mp4` · 1920×1080, 16:9, {D_out:.1f} s, "
                f"{len(sb['canh'])} cảnh, mỗi ảnh ≤ {MAX_CANH:.0f} s, không chèn chữ/số cảnh/logo\n"
                f"- Đã kiểm tra: đủ {len(can_anh)} ảnh theo storyboard, MP3 `{chuan_duong_dan(bg['mp3'])}` ({D:.2f} s) khớp storyboard\n"
                f"- Thời gian dựng: {(time.time() - t0) / 60:.1f} phút · {gio_vn()}\n"
                + ("".join(f"- Ghi chú: {x}\n" for x in ghi)) +
                f"\n**Chờ Ông chủ duyệt** trước khi phát hành.")
        if ver_moi > ver and NHAN_SAN_SANG in {x["name"] for x in gh.issue(n)["labels"]}:
            body += f"\n\n↻ Trong lúc dựng đã có phiên bản {ver_moi}; Tèo sẽ dựng tiếp bản đó."
            gh.viet(n, body); gh.nhan(n, bo=[NHAN_DANG])
        else:
            gh.viet(n, body); gh.nhan(n, them=[NHAN_CHO], bo=[NHAN_DANG, NHAN_SAN_SANG, NHAN_CAN])
        return "xong"
    except Exception as e:
        bao_loi(gh, n, ma, ver, [f"Lỗi hệ thống khi dựng: {e}"]); raise
    finally:
        if not workdir:
            shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue", type=int)
    ap.add_argument("--cho", type=int, default=120, help="giây chờ gom thay đổi")
    ap.add_argument("--gia-github", help="file JSON giả lập GitHub (chạy thử)")
    ap.add_argument("--drive-cuc-bo", help="thư mục đóng vai Nhac_Phong_Tra (chạy thử)")
    ap.add_argument("--tao-nhan", action="store_true", help="chỉ tạo 4 nhãn trong repo")
    a = ap.parse_args()
    gh = GiaGitHub(a.gia_github) if a.gia_github else GitHub(os.environ["GITHUB_REPOSITORY"], os.environ["GITHUB_TOKEN"])
    if a.tao_nhan:
        gh.tao_nhan(); print("Đã tạo/kiểm tra nhãn."); return
    if a.drive_cuc_bo:
        drive = DriveCucBo(a.drive_cuc_bo)
    else:
        thieu = [k for k in ("GDRIVE_CLIENT_ID", "GDRIVE_CLIENT_SECRET", "GDRIVE_REFRESH_TOKEN") if not os.environ.get(k)]
        try:
            if thieu:
                raise RuntimeError("Repo chưa có secret " + ", ".join(thieu) + " (xem docs/BAN-GIAO-TU-DONG.md, mục Cài đặt).")
            drive = Drive(os.environ["GDRIVE_CLIENT_ID"], os.environ["GDRIVE_CLIENT_SECRET"],
                          os.environ["GDRIVE_REFRESH_TOKEN"], os.environ.get("GDRIVE_GOC_ID") or "1_I6nhC0Jck4y76na7oo5a4IfIK2IMWin")
        except Exception as e:
            if a.cho: time.sleep(a.cho)
            iss = gh.issue(a.issue)
            if NHAN_SAN_SANG in {x["name"] for x in iss["labels"]}:
                bg, _ = doc_ban_giao(iss["body"])
                bao_loi(gh, a.issue, bg.get("ma"), bg.get("phienBan"), [f"Tèo chưa vào được Google Drive: {e}"])
            sys.exit(1)
    kq = chay(gh, drive, a.issue, a.cho)
    print("Kết quả:", kq)


if __name__ == "__main__":
    main()
