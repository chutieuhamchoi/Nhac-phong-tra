"""Kiểm thử quy trình bàn giao tự động (cong-cu/ban_giao.py) với GitHub giả và Drive cục bộ.

Chạy: python3 -m unittest tests/ban_giao_test.py   (cần ffmpeg, Pillow)
"""
import json, os, shutil, subprocess, sys, tempfile, unittest
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "cong-cu"))
import ban_giao as B  # noqa: E402


def khoi(ver, sb="anh/NPT-9999/storyboard.json", them=""):
    return (f"Bàn giao thử\n\n```ban-giao\nma: NPT-9999\nphienBan: {ver}\nstoryboard: {sb}\n"
            f"anh: NPT-9999/anh\nmp3: NPT-9999/nhac/nhac-chinh.mp3\n{them}```\n")


class BanGiao(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="bg_test_")
        cls.drive = os.path.join(cls.tmp, "Nhac_Phong_Tra")
        anh = os.path.join(cls.drive, "NPT-9999", "anh"); os.makedirs(anh)
        nhac = os.path.join(cls.drive, "NPT-9999", "nhac"); os.makedirs(nhac)
        for i, mau in enumerate(["#884422", "#224488", "#448822"], 1):
            Image.new("RGB", (1920, 1080), mau).save(os.path.join(anh, f"canh-{i:02d}.png"))
        Image.new("RGB", (1500, 1500), "#888888").save(os.path.join(anh, "vuong.png"))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=12",
                        "-c:a", "libmp3lame", "-b:a", "128k", os.path.join(nhac, "nhac-chinh.mp3")], check=True)
        cls.D = B.thoi_luong(os.path.join(nhac, "nhac-chinh.mp3"))
        cls.repo = os.path.join(cls.tmp, "repo"); os.makedirs(os.path.join(cls.repo, "anh", "NPT-9999"))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def sb(self, ten="storyboard.json", canh=None, tl=None):
        D = self.D
        canh = canh or [{"so": 1, "batDau": 0, "ketThuc": 6, "anh": "canh-01.png", "hieuUng": "slow zoom in"},
                        {"so": 2, "batDau": 6, "ketThuc": D, "anh": "canh-02.png", "hieuUng": "slow pan right",
                         "chuyenCanh": "fade to black"}]
        p = os.path.join(self.repo, "anh", "NPT-9999", ten)
        json.dump({"maBai": "NPT-9999", "thoiLuongMp3": D if tl is None else tl, "canh": canh}, open(p, "w"))
        return f"anh/NPT-9999/{ten}"

    def gh(self, body, labels=("Sẵn sàng dựng",), comments=()):
        p = os.path.join(self.tmp, "gh.json")
        json.dump({"issues": {"1": {"title": "NPT-9999 · Bài thử", "body": body, "labels": list(labels),
                                    "comments": list(comments)}}}, open(p, "w"))
        return B.GiaGitHub(p, self.repo)

    def drv(self):
        return B.DriveCucBo(self.drive)

    def nhan(self, gh):
        return {x["name"] for x in gh.issue(1)["labels"]}

    # ---------------------------------------------------------------
    def test_doc_khoi_ban_giao(self):
        d, loi = B.doc_ban_giao(khoi(3, them="mp3Md5: (tuỳ chọn)\n"))
        self.assertEqual(loi, []); self.assertEqual(d["phienBan"], "3"); self.assertNotIn("mp3Md5", d)
        _, loi = B.doc_ban_giao("không có khối")
        self.assertTrue(loi)
        _, loi = B.doc_ban_giao("```ban-giao\nma: NPT-1\nphienBan: x\n```")
        self.assertTrue(any("phienBan" in x for x in loi) and any("`ma`" in x for x in loi))

    def test_kiem_storyboard(self):
        _, loi, _ = B.kiem_storyboard({"maBai": "NPT-9999", "canh": [
            {"so": 1, "batDau": 0, "ketThuc": 30, "anh": "a.png"},
            {"so": 2, "batDau": 31, "ketThuc": 40, "anh": "b.png"}]}, "NPT-9999")
        self.assertTrue(any("vượt 25" in x for x in loi)); self.assertTrue(any("nối liền" in x for x in loi))
        anh, loi, _ = B.kiem_storyboard({"maBai": "NPT-9999", "canh": [
            {"so": 1, "batDau": "00:00.000", "ketThuc": "00:20.000", "anh": "a.png"}]}, "NPT-9999")
        self.assertEqual((anh, loi), (["a.png"], []))

    def test_khong_co_nhan_thi_bo_qua(self):
        gh = self.gh(khoi(1, self.sb()), labels=())
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "bo-qua")
        self.assertEqual(gh.binh_luan(1), [])

    def test_lan_dau_roi_trung_roi_ban_moi(self):
        sb = self.sb()
        gh = self.gh(khoi(1, sb))
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "xong")
        out = os.path.join(self.drive, "NPT-9999", "video", "preview-v1.mp4")
        self.assertTrue(os.path.isfile(out))
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=width,height", "-of", "csv=p=0", out], capture_output=True, text=True)
        self.assertEqual(r.stdout.strip(), "1920,1080")
        self.assertAlmostEqual(B.thoi_luong(out), self.D, delta=0.2)
        self.assertEqual(self.nhan(gh), {"Chờ duyệt"})
        self.assertIn("trangThai=xong", gh.binh_luan(1)[-1]["body"])
        self.assertIn("phiên bản 1", gh.binh_luan(1)[-1]["body"])
        # Tí gắn lại nhãn mà không đổi phiên bản → không dựng trùng
        gh.nhan(1, them=["Sẵn sàng dựng"], bo=["Chờ duyệt"])
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "trung")
        self.assertEqual(len(gh.binh_luan(1)), 1); self.assertEqual(self.nhan(gh), {"Chờ duyệt"})
        # Tí cập nhật phiên bản mới
        d = json.load(open(gh.path)); d["issues"]["1"]["body"] = khoi(2, sb); d["issues"]["1"]["labels"] = ["Sẵn sàng dựng"]
        json.dump(d, open(gh.path, "w"))
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "xong")
        self.assertTrue(os.path.isfile(os.path.join(self.drive, "NPT-9999", "video", "preview-v2.mp4")))
        self.assertTrue(os.path.isfile(out), "bản v1 vẫn giữ riêng")
        self.assertIn("phiên bản 2", gh.binh_luan(1)[-1]["body"])

    def test_ban_moi_trong_luc_dang_dung(self):
        sb = self.sb()
        gh = self.gh(khoi(5, sb))
        goc = gh.issue
        dem = {"n": 0}

        def issue_doi(n):          # lần đọc thứ 2 trở đi (sau khi dựng) thấy Tí đã lên v6
            dem["n"] += 1
            i = goc(n)
            if dem["n"] >= 2:
                i["body"] = khoi(6, sb)
            return i
        gh.issue = issue_doi
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "xong")
        self.assertIn("Sẵn sàng dựng", self.nhan(gh)); self.assertNotIn("Chờ duyệt", self.nhan(gh))
        self.assertIn("phiên bản 6", gh.binh_luan(1)[-1]["body"])
        gh.issue = goc            # lượt chờ chạy sau: dựng v6
        d = json.load(open(gh.path)); d["issues"]["1"]["body"] = khoi(6, sb); json.dump(d, open(gh.path, "w"))
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "xong")
        self.assertEqual(self.nhan(gh), {"Chờ duyệt"})

    def test_thieu_anh_sai_ti_le_sai_mp3(self):
        D = self.D
        sb = self.sb("sb-loi.json", canh=[
            {"so": 1, "batDau": 0, "ketThuc": 5, "anh": "canh-01.png"},
            {"so": 2, "batDau": 5, "ketThuc": 9, "anh": "vuong.png"},
            {"so": 3, "batDau": 9, "ketThuc": D, "anh": "canh-09.png"}], tl=D + 30)
        gh = self.gh(khoi(1, sb))
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "loi")
        bl = gh.binh_luan(1)[-1]["body"]
        self.assertIn("trangThai=loi", bl); self.assertIn("canh-09.png", bl)
        self.assertIn("16:9", bl); self.assertIn("thoiLuongMp3", bl)
        self.assertEqual(self.nhan(gh), {"Cần xử lý"})
        self.assertFalse(os.path.exists(os.path.join(self.drive, "NPT-9999", "video", "preview-v1-loi.mp4")))

    def test_loi_khong_chan_dung_lai_cung_phien_ban(self):
        bl = [B.dau("NPT-9999", 7, "loi")]
        gh = self.gh(khoi(7, self.sb()), comments=bl)
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "xong")

    def test_ma_tieu_de_khac_khoi(self):
        gh = self.gh(khoi(1, self.sb()).replace("ma: NPT-9999", "ma: NPT-0004"))
        self.assertEqual(B.chay(gh, self.drv(), 1, 0), "loi")
        self.assertIn("Tiêu đề issue", gh.binh_luan(1)[-1]["body"])


if __name__ == "__main__":
    unittest.main()
