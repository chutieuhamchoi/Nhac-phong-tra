# Tự đồng bộ GitHub → website

Cập nhật 18/11/2026.

## Cách hoạt động

1. ChatGPT (hoặc Claude) commit bài vào `data/kho-bai.json` trên nhánh `main`.
2. GitHub Pages tự triển khai, mất khoảng 1–2 phút.
3. Mỗi lần mở trang, website tải `data/kho-bai.json?t=<thời điểm>` (không dùng cache) và gộp vào kho trong trình duyệt.
4. Khi người dùng quay lại tab trình duyệt sau hơn 1 phút, trang tự kiểm tra lại. Ở tab **Kho bài** cũng có nút **Đồng bộ lại**.
5. Kết quả hiện ở đầu tab **Kho bài**: thời điểm đồng bộ, số bài trên GitHub, số bài mới và số bài cập nhật, cùng mọi lỗi hoặc xung đột.

## Quy tắc gộp

| Tình huống | Kết quả |
|---|---|
| Bài mới trên GitHub | Thêm vào kho trình duyệt |
| Mở lại trang, GitHub không đổi | Không làm gì, không tạo bài trùng |
| GitHub thêm phiên bản lời, bản nhạc, dòng lịch sử | Thêm vào bài. Phiên bản và lịch sử chỉ được thêm, không bao giờ bị xóa |
| GitHub sửa một mục mà trình duyệt chưa sửa | Nhận bản GitHub |
| Trình duyệt sửa một mục mà GitHub chưa sửa | Giữ bản trình duyệt |
| Cả hai cùng sửa một mục, khác nhau | Giữ bản trình duyệt, lưu bản GitHub vào `xungDotGitHub` và cảnh báo. Chọn bản muốn dùng trong hộp bài, mục **Lịch sử** |
| GitHub để trống một mục | Không xóa nội dung trong trình duyệt |
| Mã NPT trên GitHub trùng một bài khác trong trình duyệt | Giữ cả hai: bài GitHub nhận mã mới, mã gốc lưu ở `remoteId` |
| Mất mạng, lỗi 404, JSON hỏng, sai schema | Báo lỗi rõ, giữ nguyên kho trong trình duyệt |

Trước mỗi lần đồng bộ có thêm hoặc sửa bài, trang tự lưu một bản (xem ở tab **Sao lưu**).

Các trường trang tự thêm vào mỗi bài để theo dõi đồng bộ: `remoteId` (mã trên GitHub), `remoteNgayCapNhat`, `gocGitHub` (ảnh chụp bản GitHub ở lần đồng bộ trước, dùng để biết bên nào đã đổi), `xungDotGitHub` (nếu có xung đột).

## Quy tắc khi ChatGPT ghi `data/kho-bai.json`

1. Giữ `"schema": 2` và danh sách `"bai"`. Mỗi bài theo cấu trúc trong `docs/NANG-CAP-GD1.md`, mục 2.2.
2. **Mã NPT không trùng và không đổi.** Bài mới lấy mã tiếp theo theo `nextId`, rồi tăng `nextId`.
3. **Mỗi lần sửa một bài phải cập nhật `ngayCapNhat`** (ISO 8601, ví dụ `2026-11-19T10:00:00.000Z`). Website chỉ xét lại bài khi `ngayCapNhat` thay đổi.
4. Sửa lời: **thêm** phiên bản mới vào `loiVersions` (v tăng dần) và đặt `loiChon` sang bản đó. Không sửa, không xóa bản cũ.
   - Sửa Style Suno: **thêm** bản mới vào `styleVersions` (`{v, style, nguon, luc, ghiChu}`, v tăng dần), đặt `styleChon` sang bản đó và chép nội dung vào `promptSuno`. Chỉ sửa Style thì không thêm `loiVersions`. Nếu chỉ sửa `promptSuno`, website tự ghi thành một bản Style mới. Mỗi bản nhạc trong `nhacVersions` ghi `loiV` và `styleV` đã dùng.
5. Đổi trạng thái: đặt `trangThai` và **thêm** một dòng vào `lichSu` (`tu`, `den`, `luc`, `ghiChu`).
6. Không xóa bài khỏi file. Website cũng không xóa bài trong trình duyệt khi bài biến mất khỏi GitHub.
7. Commit một bài một lần, nội dung commit ghi rõ mã và tên bài.

Bài thiếu trường vẫn dùng được, trang tự bổ sung giá trị mặc định. Trang cũng nhận lời ghi dạng phẳng `"loi": "..."` và `"style": "..."`.

## Kiểm thử

```bash
node --test tests/data.test.js                  # 25 bài, gồm đồng bộ, cấu hình series và phiếu điểm 20
python3 -m http.server 8765 &
python3 tests/kiem_thu_trinh_duyet.py           # 48 bước
python3 tests/kiem_thu_dong_bo.py               # 34 bước, giả lập file GitHub
NPT_URL=https://chutieuhamchoi.github.io/Nhac-phong-tra/ python3 tests/kiem_thu_dong_bo.py   # chạy thẳng trên trang thật
```

## Giới hạn

- Chiều ngược lại (trình duyệt → GitHub) vẫn làm tay: tab **Sao lưu** → **Xuất kho-bai.json**. **Không** commit đè file này khi ChatGPT đang dùng nó: file xuất từ trình duyệt có mã đã đổi do trùng và các trường theo dõi đồng bộ. Muốn đưa thay đổi lên GitHub thì gửi file cho Claude gộp.
- `index.html` có thể bị trình duyệt giữ bản cũ tối đa khoảng 10 phút sau mỗi lần triển khai (GitHub Pages đặt cache 10 phút). Tải lại cứng (Ctrl+F5) để lấy ngay. Riêng file dữ liệu luôn được tải mới.
