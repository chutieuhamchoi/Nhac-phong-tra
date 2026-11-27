# Bàn giao tự động Tí → Tèo (chốt 28/11/2026)

GitHub lưu **thông tin bàn giao** (issue của bài). Google Drive lưu **media** (ảnh, MP3, video).
Khi Tí đánh dấu bài sẵn sàng, GitHub Actions tự chạy phần việc dựng của Tèo và phản hồi vào issue.
Ông chủ duyệt video trước khi phát hành.

## 1. Mỗi bài một issue

- Tiêu đề: `NPT-xxxx · Tên bài` (mẫu issue **"Bàn giao dựng video (Tí → Tèo)"**).
- Nội dung có một khối bàn giao, Tí cập nhật:

```ban-giao
ma: NPT-0005
phienBan: 1
storyboard: anh/NPT-0005/storyboard.json
anh: NPT-0005/anh
mp3: NPT-0005/nhac/nhac-chinh.mp3
mp3Md5: (tuỳ chọn)
ghiChu: (tuỳ chọn)
```

| Trường | Ý nghĩa |
|---|---|
| `ma` | Mã bài, trùng mã trên tiêu đề issue |
| `phienBan` | Số nguyên, **tăng mỗi lần đổi đầu vào** (storyboard, ảnh, MP3). Mỗi phiên bản dựng đúng một lần |
| `storyboard` | File JSON trên nhánh `main`, định dạng của `cong-cu/dung_video.py`: `maBai`, `thoiLuongMp3`, `canh[]` với `so`, `batDau`, `ketThuc`, `anh`, `hieuUng`, `lopPhu`, `chuyenCanh` (tuỳ chọn `ma`, `khung`) |
| `anh` | Thư mục ảnh đã duyệt, tính từ `Nhac_Phong_Tra/` trên Drive |
| `mp3` | MP3 đã duyệt, tính từ `Nhac_Phong_Tra/` |
| `mp3Md5` | Tuỳ chọn: md5 của MP3 đã duyệt, để chặn nhầm file cùng tên |

Bình luận trong issue chỉ để trao đổi và báo kết quả, **không kích hoạt dựng**.

## 2. Nhãn trạng thái

| Nhãn | Ai gắn | Ý nghĩa |
|---|---|---|
| **Sẵn sàng dựng** | Tí | Đầu vào đã đủ và đúng. Gắn nhãn này là kích hoạt dựng |
| **Đang dựng** | Tèo (tự động) | Đang kiểm tra / dựng |
| **Chờ duyệt** | Tèo (tự động) | Đã có bản xem trước, chờ Ông chủ duyệt |
| **Cần xử lý** | Tèo (tự động) | Thiếu/sai đầu vào hoặc dựng lỗi. Bình luận ghi rõ từng mục |

## 3. Khi nào tự chạy

Workflow `.github/workflows/ban-giao-dung.yml` chạy khi:
1. Tí gắn nhãn **Sẵn sàng dựng**, hoặc
2. Tí sửa nội dung issue (ví dụ tăng `phienBan`) **trong lúc** issue đang có nhãn **Sẵn sàng dựng**.

Mỗi lượt:
1. **Chờ 2 phút** để gom các thay đổi liền nhau, rồi đọc lại issue (bản mới nhất).
2. Còn nhãn **Sẵn sàng dựng** mới làm tiếp; nếu `ma` + `phienBan` đã có kết quả **xong** thì bỏ qua (không dựng trùng).
3. **Một bài chỉ một lượt dựng tại một thời điểm.** Bản mới đến khi đang dựng sẽ xếp hàng; lượt đang chạy kết thúc xong mới xử lý bản mới nhất.
4. Kiểm tra trước khi chạy FFmpeg:
   - storyboard đọc được, đúng mã bài, cảnh nối liền từ 0, **mỗi ảnh ≤ 25 giây**;
   - **đủ ảnh** theo storyboard trong thư mục `anh`, mỗi ảnh 16:9, rộng ≥ 1280 px;
   - **đúng MP3**: có file, thời lượng khớp `thoiLuongMp3` của storyboard (±0,5 s) và khớp mốc cảnh cuối (±1,5 s), md5 khớp nếu có `mp3Md5`.
5. Dựng bản xem trước **16:9, 1920×1080**, không chèn chữ, số cảnh hay logo.
6. Lưu file riêng theo phiên bản: `Nhac_Phong_Tra/<mã>/video/preview-v<phienBan>.mp4` (không ghi đè bản cũ).
7. Bình luận vào issue: phiên bản đã dựng + link video → nhãn **Chờ duyệt**.
   Lỗi → bình luận danh sách mục cần xử lý → nhãn **Cần xử lý**. Tí sửa xong gắn lại **Sẵn sàng dựng** (đổi đầu vào thì tăng `phienBan`).
   Nếu trong lúc dựng Tí đã lên phiên bản mới, nhãn **Sẵn sàng dựng** được giữ lại để lượt sau dựng tiếp.

Chạy lại bằng tay: tab **Actions** → *Bàn giao · dựng bản xem trước* → **Run workflow**, nhập số issue (lượt tay không chờ 2 phút; vẫn cần nhãn Sẵn sàng dựng).

## 4. Việc của từng người

- **Tí:** tạo issue theo mẫu, ghi khối bàn giao, tự kiểm 3 mục trong mẫu, rồi gắn **Sẵn sàng dựng**. Có thay đổi đầu vào thì tăng `phienBan`. Mốc cảnh trong storyboard của Tí là mốc sơ bộ đã căn theo MP3 đã chọn; Tèo tinh chỉnh khi duyệt nếu cần.
- **Tèo (tự động):** kiểm tra, dựng, lưu Drive, phản hồi, đổi nhãn. Tèo (trong phiên trò chuyện) theo dõi các issue **Cần xử lý** và lỗi hệ thống.
- **Ông chủ:** xem bản xem trước trong issue, duyệt hoặc góp ý bằng bình luận. Chưa duyệt thì không phát hành.

## 5. Cài đặt (Ông chủ làm một lần)

GitHub Actions chạy trên máy chủ của GitHub nên cần quyền vào Google Drive của Ông chủ.
Tài khoản dịch vụ Google không ghi được file vào "Drive của tôi" cá nhân, nên dùng **refresh token của chính tài khoản Ông chủ**.

1. Vào https://console.cloud.google.com → tạo project (ví dụ `nhac-phong-tra`) → **APIs & Services → Library** → bật **Google Drive API**.
2. **OAuth consent screen**: loại *External*, điền tên app và email; thêm chính email của Ông chủ vào *Test users*; sau đó bấm **Publish app** (đưa sang *In production*) — nếu để *Testing*, refresh token hết hạn sau 7 ngày.
3. **Credentials → Create credentials → OAuth client ID** → loại **Desktop app** → lưu *Client ID* và *Client secret*.
4. Trên máy Ông chủ (có Python): `python cong-cu/lay_refresh_token.py --client-id <ID> --client-secret <SECRET>` → đăng nhập đúng tài khoản chứa `Nhac_Phong_Tra` → bấm Cho phép (có cảnh báo "app chưa xác minh" vì là app riêng của mình: chọn *Nâng cao → Tiếp tục*) → script in ra refresh token.
5. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, tạo 3 secret:
   `GDRIVE_CLIENT_ID`, `GDRIVE_CLIENT_SECRET`, `GDRIVE_REFRESH_TOKEN`.
   (Tuỳ chọn, tab *Variables*: `GDRIVE_GOC_ID` = ID thư mục Nhac_Phong_Tra; mặc định `1_I6nhC0Jck4y76na7oo5a4IfIK2IMWin`.)
6. Tab **Actions** → *Bàn giao · dựng bản xem trước* → **Run workflow** → tick **Chỉ tạo 4 nhãn bàn giao** → Run.

Không dán token vào chat hay issue. Lộ token thì vào Google Account → Bảo mật → gỡ quyền app, rồi tạo lại.

## 6. Kiểm thử

```bash
python3 -m unittest tests/ban_giao_test.py   # GitHub giả + Drive cục bộ: lần đầu, trùng, bản mới, bản mới khi đang dựng, thiếu ảnh/sai tỉ lệ/sai MP3, lỗi không chặn dựng lại, sai mã
```

Chạy thử một issue giả trên máy: `python3 cong-cu/ban_giao.py --issue 1 --cho 0 --gia-github gh.json --drive-cuc-bo /duong/dan/Nhac_Phong_Tra`.

## 7. Thử nghiệm đầu tiên

NPT-0005 · Tháng Mười Hai Có Hẹn — khi đã có MP3 đã chọn và storyboard.json có mốc theo MP3:
1. **Bàn giao lần đầu:** Tí tạo issue, `phienBan: 1`, gắn **Sẵn sàng dựng** → chờ bình luận kết quả + `preview-v1.mp4`.
2. **Cập nhật phiên bản:** Tí đổi một cảnh/ảnh, tăng `phienBan: 2`, gắn lại **Sẵn sàng dựng** → `preview-v2.mp4`, bản v1 vẫn giữ.
