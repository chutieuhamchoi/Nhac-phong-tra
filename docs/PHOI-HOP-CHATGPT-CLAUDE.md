# Quy trình phối hợp ChatGPT – Claude – Chủ kênh

Cập nhật 19/11/2026 (mục Shorts 27/11/2026), theo phương án **A – Phòng trà đa sắc**.

Định vị: **"Nhạc Phòng Trà – Mỗi bài hát, một câu chuyện đáng nghe."** Kênh không giới hạn chủ đề, thể loại hay tiết tấu.

## 1. Nguồn dữ liệu chính thức

| Nội dung | Nơi lưu | Ai được sửa |
|---|---|---|
| Lịch 15 tuần | `data/lich.json` | ChatGPT, khi chủ kênh đã duyệt |
| Series, cảm xúc, nhịp, giọng, nhạc cụ, định vị, nguyên tắc sáng tác, tiêu chí duyệt | `data/chu-de.json` | ChatGPT, khi chủ kênh đã duyệt |
| Kho bài (lời, trạng thái, metadata, link YouTube) | `data/kho-bai.json`, schema 2 | ChatGPT và Claude, theo `docs/DONG-BO-GITHUB.md` |
| Storyboard | `anh/<MA_BAI>/storyboard.json` | ChatGPT |
| Thông tin bàn giao dựng video | GitHub Issue của bài (khối `ban-giao`, nhãn) | ChatGPT ghi; Claude/Actions bình luận kết quả, đổi nhãn |
| Mã nguồn website, công cụ dựng video, kiểm thử | `assets/`, `index.html`, `tests/` | Claude |
| Ảnh, MP3, video preview và video hoàn chỉnh | Google Drive, mỗi bài một thư mục `NPT-xxxx/anh/`, `NPT-xxxx/nhac/`, `NPT-xxxx/video/` | ChatGPT (ảnh), chủ kênh (MP3), Claude (video) |

- Website đọc danh sách series từ `data/chu-de.json`. Thêm series mới chỉ cần sửa file này, không phải sửa mã.
- Không lưu video hay tệp đa phương tiện lớn vào GitHub.
- Trên Drive: kiểm tra thư mục đã có chưa rồi mới tạo, không tạo thư mục trùng tên.

## 2. Phân công

**ChatGPT – sáng tác.** Đề xuất ý tưởng theo lịch, viết và sửa lời, viết prompt Suno, nhận xét giai điệu và cao trào theo phản hồi của chủ kênh, làm storyboard và tạo ảnh, tải ảnh lên Drive, chuẩn bị metadata YouTube (tiêu đề, mô tả, hashtag, 10–15 tags, tổng tags dưới 500 ký tự), cập nhật kho bài khi có quyết định sáng tác, duyệt hoặc phát hành.

**Claude – kỹ thuật và phát hành.** Đọc storyboard và metadata trên GitHub, lấy ảnh và MP3 trên Drive, dựng video bằng Python/FFmpeg, kiểm tra độ phân giải, thời lượng, âm thanh và chuyển cảnh, xuất preview, hoàn thiện video sau khi được duyệt, hỗ trợ đăng YouTube, kiểm tra trong YouTube Studio (tags, nhãn nội dung AI, danh mục, chế độ hiển thị, chất lượng), lấy link, báo thông tin cần đồng bộ vào kho bài. Claude cũng phát triển website, công cụ và cơ chế đồng bộ.

**Chủ kênh.** Chọn ý tưởng, duyệt lời, chọn bản Suno và cung cấp MP3, duyệt video và metadata.

## 3. Quy trình một bài

1. **Chọn ý tưởng.** ChatGPT đề xuất theo lịch, chủ kênh chọn. Chưa tạo bản ghi NPT khi chủ kênh chưa yêu cầu.
2. **Sáng tác.** ChatGPT viết lời và prompt Suno, sửa đến khi chủ kênh duyệt.
3. **Tạo nhạc.** Chủ kênh chọn bản Suno, đặt MP3 vào `NPT-xxxx/nhac/`.
4. **Hình ảnh.** ChatGPT làm storyboard và ảnh, tải ảnh vào `NPT-xxxx/anh/`.
5. **Dựng video (tự động từ 28/11/2026).** ChatGPT tạo GitHub Issue của bài theo mẫu "Bàn giao dựng video", ghi khối `ban-giao` (mã, phiên bản, storyboard, thư mục ảnh, MP3 đã duyệt) rồi gắn nhãn **Sẵn sàng dựng**. GitHub Actions kiểm tra đầu vào, dựng `NPT-xxxx/video/preview-v<phiên bản>.mp4`, bình luận link và gắn **Chờ duyệt** (hoặc **Cần xử lý** kèm danh sách mục cần sửa). Chi tiết: `docs/BAN-GIAO-TU-DONG.md`.
6. **Duyệt phát hành.** Chủ kênh duyệt video và metadata.
7. **Đăng YouTube.** Claude làm các bước kỹ thuật được phép, kiểm tra trong Studio và lấy URL.
8. **Đồng bộ kho bài.** Ghi trạng thái, URL, ngày phát hành và lịch sử vào `data/kho-bai.json`.

**Chỉ đánh dấu "Đã đăng YouTube" khi đã xác minh video trên YouTube** (Studio hoặc trang xem), và ghi cách xác minh vào `lichSu`.

## 4. Tránh ghi đè lẫn nhau

- Trước khi ghi một file, đọc lại bản mới nhất trên `main` (SHA hiện tại). Nếu SHA đã đổi so với lúc đọc thì đọc lại rồi mới sửa.
- ChatGPT và Claude không sửa cùng một file cùng lúc. Mỗi commit chỉ sửa đúng phần mình phụ trách và ghi rõ mã bài trong nội dung commit.
- Không sửa `lich.json` hay `chu-de.json` nếu chủ kênh chưa duyệt. Không thay hai file này bằng phiên bản cũ.
- Bài đã phát hành (ví dụ NPT-0001) được giữ nguyên lời, trạng thái, ngày phát hành và URL.

## 5. Shorts (cập nhật 27/11/2026)

- **Claude toàn quyền Shorts:** chọn đoạn, dựng, đăng, ghi trường `shortVideos` trong kho bài. Nhịp đăng 1 clip/ngày lúc 19:30; mỗi MV mới làm 2 Short (S1, S2).
- **ChatGPT không sửa `shortVideos`**, nhưng khi ghi lại một bài trong `kho-bai.json` phải **giữ nguyên toàn bộ mảng `shortVideos`**, kể cả các trường mới `mota` (mô tả riêng của Short) và `lichDang` (lịch đăng, giờ VN). Không xoá, không rút gọn, không sắp xếp lại.
- **ChatGPT ghi trường `shorts` (đoạn gợi ý)** khi viết lời hoặc chuẩn bị metadata, cho **2 đoạn** mỗi bài:
  - `S1`: điệp khúc hoặc cao trào; `S2`: một hook khác (câu mở ấn tượng, bridge, điệp khúc cuối).
  - Mỗi đoạn ghi: câu hook dùng làm tiêu đề, câu mở và câu kết của đoạn (30–45 giây), gợi ý cảnh.
  - Tiêu đề theo mẫu `<Câu hook ngắn> | <Tên bài> #Shorts` (tối đa 100 ký tự).
- Website: tab YouTube của bài có hai tab con **Video dài (MV)** và **Video ngắn (Shorts)**. Ô `shorts` nằm trong tab Video ngắn.

## 6. Kiểm tra sau khi đổi cấu hình

```bash
node --test tests/data.test.js     # có kiểm tra lịch và kho bài chỉ dùng series có trong chu-de.json
```

Nếu ChatGPT thêm series vào `lich.json` mà quên khai báo trong `chu-de.json`, bài kiểm thử sẽ báo đúng tuần bị lỗi.
