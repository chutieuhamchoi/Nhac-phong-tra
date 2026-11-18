# Nhạc Phòng Trà Studio

Trang kế hoạch và quản lý sản xuất cho kênh YouTube [@nhac-phongtra](https://www.youtube.com/@nhac-phongtra), gồm: kế hoạch chiến dịch 15 tuần (17/11/2026 – 28/02/2027), lịch đăng, sáng tác lời với ChatGPT, kho bài có phiên bản, chấm điểm và quy trình duyệt.

Trang: **https://chutieuhamchoi.github.io/Nhac-phong-tra/**. Chạy trên GitHub Pages, không cần máy chủ hay API key.

## Các tab

| Tab | Dùng để |
|---|---|
| Kế hoạch | Đọc kế hoạch chiến dịch, xem tiến độ tổng |
| Lịch 15 tuần | Chủ đề từng tuần, bài đơn, playlist, Shorts, việc cần làm; tick khi xong |
| Sáng tác | Soạn yêu cầu gửi ChatGPT → nhận JSON → kiểm tra, xem trước → xác nhận lưu |
| Kho bài | Mỗi bài có mã NPT, 7 trạng thái, phiên bản lời, phiên bản nhạc Suno, điểm, nội dung YouTube, lịch sử |
| Sao lưu | Tải bản sao lưu, khôi phục, xuất/gộp `kho-bai.json`, bản tự lưu |

## Quy trình một bài

1. **Ý tưởng** → **Đang viết lời**: Lịch → bấm **Sáng tác** → gửi ChatGPT → dán JSON → **Xác nhận lưu**.
2. **Đã duyệt lời**: đọc lời trong Kho bài; sửa thì bấm **Lưu thành phiên bản mới** (bản cũ không mất).
3. **Đang tạo nhạc**: tạo trên Suno, dán từng link vào **Nhạc & điểm**.
4. **Đang đánh giá**: nghe, chấm 5 tiêu chí (1–5). Dưới 18/25 thì chưa nên đăng.
5. **Đã duyệt phát hành**: chọn bản nhạc phát hành.
6. **Đã đăng YouTube**: dán link YouTube.

## Cấu trúc

```
index.html               trang chính
assets/data.js           dữ liệu và quy tắc (cấu trúc, chuyển đổi, kiểm tra, sao lưu)
assets/app.js            giao diện
assets/style.css         giao diện
data/ke-hoach.md         kế hoạch chiến dịch (sửa file này để cập nhật tab Kế hoạch)
data/lich.json           lịch 15 tuần
data/chu-de.json         series, cảm xúc, nhịp, giọng, nhạc cụ
data/kho-bai.json        kho bài đã xuất (nạp khi trình duyệt chưa có dữ liệu)
docs/NANG-CAP-GD1.md     bàn giao giai đoạn 1: cấu trúc JSON, nâng cấp dữ liệu, kiểm thử, triển khai
tests/                   kiểm thử tự động
loi/                     lời bài hát dạng Markdown
```

## Dữ liệu

Kho bài lưu trong trình duyệt đang dùng; trang không tự ghi lên GitHub. **Tải bản sao lưu mỗi tuần** ở tab Sao lưu. Chi tiết cấu trúc dữ liệu xem `docs/NANG-CAP-GD1.md`.

## Lưu ý bản quyền

- Chỉ dùng bài Suno tạo khi đang có gói Pro trở lên.
- Yêu cầu gửi ChatGPT bắt buộc lời mới hoàn toàn và không nhắc tên ca sĩ, nhạc sĩ thật. Vẫn nên đọc lại lời trước khi đưa vào Suno.
- Gắn nhãn nội dung có dùng AI khi đăng video.
