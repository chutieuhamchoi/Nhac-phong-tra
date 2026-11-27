#!/usr/bin/env python3
"""Lấy Google Drive refresh token cho GitHub Actions (Ông chủ chạy MỘT LẦN trên máy mình).

Cần: Python 3, một OAuth client loại "Desktop app" tạo trong Google Cloud Console
(xem docs/BAN-GIAO-TU-DONG.md, mục Cài đặt). Script chỉ dùng thư viện chuẩn.

  python lay_refresh_token.py --client-id XXX.apps.googleusercontent.com --client-secret YYY

Trình duyệt mở trang đăng nhập Google → chọn tài khoản chứa thư mục Nhac_Phong_Tra → Cho phép.
Script in ra refresh token. Dán ba giá trị (client id, client secret, refresh token) vào
GitHub → Settings → Secrets and variables → Actions. Không gửi token qua chat.
"""
import argparse, http.server, json, urllib.parse, urllib.request, webbrowser

SCOPE = "https://www.googleapis.com/auth/drive"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--client-id", required=True)
    ap.add_argument("--client-secret", required=True)
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    redirect = f"http://127.0.0.1:{a.port}/"
    nhan = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            nhan.update({k: v[0] for k, v in q.items()})
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            self.wfile.write("Đã nhận. Quay lại cửa sổ dòng lệnh.".encode())

        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", a.port), H)
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": a.client_id, "redirect_uri": redirect, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent"})
    print("Mở trình duyệt để đăng nhập Google…\nNếu không tự mở, dán link này vào trình duyệt:\n" + url)
    webbrowser.open(url)
    while "code" not in nhan and "error" not in nhan:
        srv.handle_request()
    if "error" in nhan:
        raise SystemExit("Google báo lỗi: " + nhan["error"])
    data = urllib.parse.urlencode({"code": nhan["code"], "client_id": a.client_id, "client_secret": a.client_secret,
                                   "redirect_uri": redirect, "grant_type": "authorization_code"}).encode()
    tok = json.load(urllib.request.urlopen("https://oauth2.googleapis.com/token", data=data))
    if "refresh_token" not in tok:
        raise SystemExit("Không nhận được refresh token: " + json.dumps(tok))
    print("\nGDRIVE_REFRESH_TOKEN =\n" + tok["refresh_token"])
    print("\nDán vào GitHub secrets cùng GDRIVE_CLIENT_ID và GDRIVE_CLIENT_SECRET. Đừng gửi qua chat.")


if __name__ == "__main__":
    main()
