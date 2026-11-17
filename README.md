# Nhạc Phòng Trà – Cà Phê Chill

Trang kế hoạch cho kênh YouTube [@nhac-phongtra](https://www.youtube.com/@nhac-phongtra): kế hoạch chiến dịch 15 tuần (17/11/2026 – 28/02/2027), lịch đăng theo tuần, công cụ tạo lời bài hát bằng ChatGPT và kho lời.

Trang chạy trên GitHub Pages, không cần máy chủ hay API key.

## Các phần của trang

| Tab | Dùng để |
|---|---|
| Kế hoạch | Đọc kế hoạch chiến dịch, xem tiến độ tổng |
| Lịch 15 tuần | Chủ đề từng tuần, 2 bài đơn, playlist, Shorts, việc cần làm; tick khi xong |
| Tạo lời | Chọn tuần, series, cảm xúc, nhịp, giọng → câu lệnh chuẩn → mở ChatGPT → dán kết quả về |
| Kho bài | Lời, style Suno, tiêu đề, mô tả YouTube của từng bài; theo dõi trạng thái đến khi đăng |

## Quy trình tạo một bài

1. Tab **Lịch 15 tuần** → bấm **Tạo lời** cạnh tên bài.
2. Bổ sung hình ảnh, chi tiết muốn có → bấm **Sao chép & mở ChatGPT**. Nếu ô chat trống thì dán (Ctrl+V) rồi gửi.
3. Sao chép toàn bộ câu trả lời của ChatGPT → dán vào ô **Dán kết quả** → **Lưu vào Kho bài**. Trang tự tách tên bài, lời, style Suno, tiêu đề, mô tả, đoạn Shorts, hashtag.
4. Trong **Kho bài**, mở bài để sửa lời, đổi trạng thái (Nháp lời → Đã duyệt lời → Đã tạo Suno → Đã đăng), dán link YouTube.

## Lưu dữ liệu lên GitHub

Tiến độ và kho bài lưu trong trình duyệt đang dùng. Để lưu lâu dài hoặc dùng trên máy khác:

- Kho bài → **Xuất kho-bai.json** → thay file `data/kho-bai.json` trong repo. Máy mới mở trang lần đầu sẽ tự nạp kho từ file này; máy đã có kho thì dùng **Nhập JSON**.
- **Xuất lời (.md)** để lưu lời bài hát vào thư mục `loi/`.

## Cấu trúc

```
index.html          trang chính
assets/app.js       toàn bộ chức năng
assets/style.css    giao diện
data/ke-hoach.md    kế hoạch chiến dịch (sửa file này để cập nhật tab Kế hoạch)
data/lich.json      lịch 15 tuần: chủ đề, tên bài gợi ý, playlist, việc
data/chu-de.json    series, cảm xúc, nhịp, giọng, nhạc cụ cho công cụ tạo lời
data/kho-bai.json   kho lời đã xuất
loi/                lời bài hát dạng Markdown
```

## Lưu ý bản quyền

- Chỉ dùng bài Suno tạo khi đang có gói Pro trở lên.
- Câu lệnh đã yêu cầu ChatGPT viết lời mới hoàn toàn và không nhắc tên ca sĩ, nhạc sĩ thật. Vẫn nên đọc lại lời trước khi đưa vào Suno.
- Gắn nhãn nội dung có dùng AI khi đăng video.
