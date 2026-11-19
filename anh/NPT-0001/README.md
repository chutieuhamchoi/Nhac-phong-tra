# NPT-0001 — Có Những Ngày Chỉ Muốn Về Nhà

Thư mục tài nguyên hình ảnh/video cho bài hát NPT-0001 của kênh Nhạc Phòng Trà – Cà Phê Chill.

## Thông tin nguồn
- Chủ kênh đã gửi bản nhạc Suno `Có Những Ngày Chỉ Muốn Về Nhà.mp3` trong cuộc trò chuyện ChatGPT.
- Thời lượng bản MP3 được cung cấp: **04:32.640** (272,64 giây).
- **MP3 chưa được upload lên GitHub.** Claude cần nhận MP3 từ chủ kênh.
- Lời bài hát đã duyệt ở `data/kho-bai.json`; đọc phiên bản có `v = loiChon`.
- `nhacChon: null` trong storyboard là trạng thái hiện tại; không tự suy đoán mã phiên bản nhạc đã chọn.

## Storyboard và quy ước ảnh
- `storyboard.json`: **đã có**, gồm **11 cảnh**, 10 cảnh × 25 giây và cảnh cuối 22,64 giây, thời gian dự kiến; mỗi cảnh có prompt ảnh, hiệu ứng và chuyển cảnh.
- `mo-ta.md`: **đã có**, định hướng hình ảnh và bảng tóm tắt 11 cảnh.
- `canh-01.png` đến `canh-11.png`: **chưa upload lên GitHub**; cần tạo 11 ảnh độc lập theo đúng thứ tự storyboard.
- Ảnh ngang 16:9; phong cách điện ảnh hoài niệm, không chữ, logo, watermark; chủ thể tránh sát mép trên/dưới để có thể crop khi cần.
- `versions/`: lưu storyboard cũ trước khi thay đổi lớn, nếu được yêu cầu.

## Trạng thái thực tế
- Đã có: `README.md`, `storyboard.json`, `mo-ta.md`.
- Chưa có: 11 ảnh cảnh chính thức và MP3 trên GitHub.
- `kiem-tra-ket-noi.png` chỉ là PNG 1×1, 68 byte dùng kiểm thử GitHub; **không dùng để dựng video**.
- ChatGPT tạo ảnh và đóng gói ZIP nếu môi trường cho phép; chủ kênh chuyển ZIP cùng MP3 cho Claude; Claude kiểm tra, commit ảnh, dựng video.
- Không xem tên ảnh được tham chiếu trong storyboard là bằng chứng ảnh đã tồn tại. Kiểm tra file thực tế trước khi dựng.
