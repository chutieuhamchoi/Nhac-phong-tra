# Nâng cấp giai đoạn 1: Nhạc Phòng Trà Studio

Bàn giao ngày 18/11/2026. Trang chạy tĩnh trên GitHub Pages, không cần máy chủ, không dùng API key, chưa kết nối Suno hay YouTube.

## 1. Danh sách file thay đổi

| File | Thay đổi |
|---|---|
| `assets/data.js` | **Mới.** Lớp dữ liệu: cấu trúc v2, chuyển đổi kho cũ, phiên bản lời và nhạc, trạng thái và lịch sử, chấm điểm, kiểm tra JSON từ ChatGPT, so sánh phiên bản, sao lưu/khôi phục/gộp. Không phụ thuộc giao diện. |
| `assets/app.js` | Viết lại phần giao diện: tab Sáng tác (yêu cầu dạng JSON, kiểm tra, xem trước, xác nhận), Kho bài (mã NPT, 7 trạng thái, điểm), hộp chi tiết bài 5 mục, tab Sao lưu, bản tự lưu. Lịch 15 tuần và Kế hoạch giữ nguyên. |
| `index.html` | Thêm tab Sao lưu, hộp chi tiết bài mới, nạp `assets/data.js`. Đổi tên tab Tạo lời thành Sáng tác. |
| `assets/style.css` | Thêm kiểu cho các thành phần mới; sửa hiển thị trên điện thoại. |
| `data/kho-bai.json` | Chuyển sang cấu trúc v2 (kho rỗng). Trang vẫn đọc được file kiểu cũ. |
| `tests/data.test.js` | **Mới.** 11 bài kiểm thử lớp dữ liệu (Node). |
| `tests/kiem_thu_trinh_duyet.py` | **Mới.** 43 bước kiểm thử giao diện trên Chromium (Playwright). |
| `docs/NANG-CAP-GD1.md` | **Mới.** Tài liệu này. |
| `README.md` | Cập nhật mô tả tab và cấu trúc thư mục. |

Không đổi: `data/ke-hoach.md`, `data/lich.json`, `data/chu-de.json`.

## 2. Cấu trúc dữ liệu JSON mới (schema 2)

### 2.1. File kho (`kho-bai.json`)

```json
{
  "schema": 2,
  "capNhat": "2026-11-18T09:00:00.000Z",
  "nextId": 4,
  "bai": [ /* các bài, xem 2.2 */ ]
}
```

### 2.2. Một bài hát

```json
{
  "id": "NPT-0001",
  "loai": "bai",
  "ten": "Mái Trường Làng Ngày Ấy",
  "series": "tuoi-tho",
  "tuan": 1,
  "ngayTao": "2026-11-17T00:00:00",
  "ngayCapNhat": "2026-11-18T09:00:00.000Z",
  "trangThai": 5,
  "lichSu": [
    { "tu": null, "den": 1, "luc": "…", "ghiChu": "Tạo bài" },
    { "tu": 4, "den": 5, "luc": "…", "ghiChu": "nghe ổn, điệp khúc hay" }
  ],
  "loiVersions": [
    { "v": 1, "loi": "[Verse 1]\n…", "nguon": "chatgpt", "luc": "…", "ghiChu": "" },
    { "v": 2, "loi": "[Verse 1]\n…", "nguon": "tay", "luc": "…", "ghiChu": "sửa điệp khúc" }
  ],
  "loiChon": 2,
  "promptSuno": "Vietnamese nostalgic ballad, 70 BPM, piano, warm female vocal",
  "caiDatSuno": { "model": "v6", "giong": "nu", "thoiLuong": "auto", "maxMode": false, "weirdness": 58, "styleInfluence": 46, "variety": "Normal", "personalize": false },
  "nhacVersions": [
    { "v": 1, "link": "https://suno.com/song/…", "ghiChu": "giọng nữ", "luc": "…", "loiV": 2, "styleV": 1,
      "caiDat": { "model": "v6", "giong": "nu", "thoiLuong": "auto", "maxMode": false, "weirdness": 58, "styleInfluence": 46, "variety": "Normal", "personalize": false } }
  ],
  "nhacChon": 1,
  "diem": { "cauChuyen": 4, "diemCham": 4, "giaiDieu": 5, "banSac": 4 },
  "thumbnail": "https://…",
  "tieude": "Mái Trường Làng Ngày Ấy | Nhạc Phòng Trà Hoài Niệm – Sáng tác mới",
  "mota": "…",
  "shorts": "…",
  "tag": "#nhacphongtra #nhachoainiem",
  "linkYoutube": "https://youtu.be/…",
  "ngayPhatHanh": "2026-11-20",
  "ghiChu": "",
  "promptChatGPT": "yêu cầu đã gửi ChatGPT",
  "legacyId": "mi3abc…",
  "_v1": { /* bản gốc từ kho cũ, chỉ có ở bài được chuyển đổi */ }
}
```

| Trường | Ý nghĩa |
|---|---|
| `id` | Mã duy nhất `NPT-0001`, `NPT-0002`… Cấp tự động, không dùng lại. |
| `trangThai` | 0 Ý tưởng · 1 Đang viết lời · 2 Đã duyệt lời · 3 Đang tạo nhạc · 4 Đang đánh giá · 5 Đã duyệt phát hành · 6 Đã đăng YouTube |
| `lichSu` | Mọi lần đổi trạng thái: từ, đến, lúc, ghi chú. Chỉ thêm, không sửa. |
| `loiVersions` / `loiChon` | Các phiên bản lời (không bao giờ ghi đè) và số phiên bản đang dùng. Lời hiện tại = phiên bản `loiChon`. |
| `nhacVersions` / `nhacChon` | Các bản Suno (link, ghi chú, theo lời phiên bản nào) và bản được chọn phát hành (`null` = chưa chọn). Từ 22/11/2026 mỗi bản có thêm `caiDat`: ảnh chụp thông số Suno lúc thêm bản đó (`null` nếu không ghi). |
| `caiDatSuno` | (22/11/2026) Thông số Suno Advanced đang dùng/đề xuất cho bài: `model` (chữ, vd `"v6"`), `giong` (`"nam"`/`"nu"`/`""` = Vocal Gender), `thoiLuong` (`"auto"` hoặc `"m:ss"` = Duration), `maxMode` (true/false/null), `weirdness` (0–100/null), `styleInfluence` (0–100/null), `variety` (chữ đúng như Suno hiện, vd `"Normal"`), `personalize` (true/false/null). Không biết thì để null/`""`, không đoán. |
| `diem` | Phiếu duyệt theo `tieuChiDuyet` trong `data/chu-de.json` (từ 19/11/2026: `cauChuyen`, `diemCham`, `giaiDieu`, `banSac`, mỗi mục 1–5 hoặc `null`, tổng 20). Dưới `nguongDuyet.deXuatDuyet` (17) thì trang cảnh báo khi duyệt phát hành. Khóa sinh từ tên tiêu chí bỏ dấu, viết kiểu camelCase. |
| `diemCu` | Chỉ có ở bài từng chấm theo phiếu cũ 5 tiêu chí/25 điểm (`loi`, `giaiDieu`, `caoTrao`, `camXuc`, `thuHut`): trang chuyển điểm cũ sang đây một lần, không xóa. |
| `series` | `tuoi-tho`, `dem-mua`, `ca-phe-sang`, `mua` |
| `legacyId`, `_v1` | Mã cũ và bản gốc của bài chuyển từ kho cũ. Giữ để không mất dữ liệu. |

Mọi trường lạ không có trong bảng trên đều được giữ nguyên khi đọc và ghi lại.

### 2.3. Khuôn JSON ChatGPT trả về

Trang tự đưa khuôn này vào yêu cầu gửi ChatGPT, với `series` và `tuan` điền sẵn:

```json
{
  "loai": "bai",
  "ten": "Bà ngoại và giàn trầu",
  "series": "tuoi-tho",
  "tuan": 1,
  "loi": "[Intro]\n…\n[Verse 1]\n…\n[Chorus]\n…",
  "style": "dưới 200 ký tự, tiếng Anh",
  "tieude": "tối đa 100 ký tự",
  "mota": "…",
  "shorts": "4 câu điệp khúc",
  "tag": "#a #b #c",
  "ghiChu": "ý đồ sáng tác"
}
```

Quy tắc kiểm tra trước khi lưu:

| Lỗi (chặn, không cho lưu) | Cảnh báo (vẫn cho lưu) |
|---|---|
| JSON hỏng | Trường lạ (bị bỏ qua) |
| Thiếu `ten`, hoặc dài quá 150 ký tự | Thiếu `tuan` (dùng tuần đang chọn) |
| Bài đơn thiếu `loi` | Lời không có nhãn [Verse]/[Chorus] |
| `series` ngoài 4 giá trị cho phép | `style` dài hơn 200 ký tự |
| `tuan` ngoài 1–15 | `loai` không hợp lệ (coi là bài đơn) |
| `tieude` quá 100 ký tự, `mota` quá 5000, `style` quá 1000 | |
| Một trường là mảng/đối tượng thay vì chữ (trừ `tag`) | |
| Nội dung có dạng API key | |

Trang cũng nhận nhiều bài một lúc (mảng `[…]` hoặc `{"bai":[…]}`) và chấp nhận câu trả lời có lời dẫn trước khối ```json.

### 2.4. File sao lưu đầy đủ

```json
{ "loai": "npt-sao-luu", "schema": 2, "luc": "…", "kho": { /* như 2.1 */ }, "tienDoLich": { "1:b0": true } }
```

## 3. Nâng cấp từ dữ liệu cũ

Không phải làm gì bằng tay. Lần đầu mở trang mới:

1. Trang tìm kho cũ trong trình duyệt (khóa `npt-kho-v1`).
2. Tự lưu một bản tự lưu "Trước khi nâng cấp cấu trúc dữ liệu (kho cũ)", xem ở tab Sao lưu.
3. Chuyển từng bài sang cấu trúc mới:
   - cấp mã `NPT-xxxx`, mã cũ giữ ở `legacyId`;
   - lời cũ thành phiên bản lời 1 (nguồn "kho cũ");
   - `style` thành `promptSuno`, `link` thành `linkYoutube`;
   - trạng thái: Nháp lời → Đang viết lời · Đã duyệt lời → Đã duyệt lời · Đã tạo Suno → Đang đánh giá · Đã đăng → Đã đăng YouTube;
   - toàn bộ bản gốc lưu trong `_v1`.
4. Kho mới lưu ở khóa `npt-kho-v2`. **Khóa cũ `npt-kho-v1` không bị xóa hay sửa.** Việc gộp chỉ chạy một lần, đánh dấu ở khóa `npt-kho-v1-da-chuyen`.

Tiến độ lịch (`npt-lich-v1`) dùng tiếp như cũ.

File `kho-bai.json` kiểu cũ (từ nút "Xuất kho-bai.json" bản trước) vẫn dùng được ở tab Sao lưu, theo hai cách:
- **Gộp từ kho-bai.json**: chỉ thêm bài chưa có. Bài trùng mã hoặc trùng mã cũ được bỏ qua, không ghi đè.
- **Khôi phục**: thay toàn bộ, có tự lưu bản hiện tại trước.

## 4. Các bước kiểm thử

### 4.1. Tự động

```bash
# Lớp dữ liệu (11 bài)
node --test tests/data.test.js

# Giao diện trên Chromium (43 bước)
pip install playwright && python3 -m playwright install chromium
python3 -m http.server 8765 &
python3 tests/kiem_thu_trinh_duyet.py
```

Kết quả lúc bàn giao: 11/11 và 43/43 đạt, không có lỗi JavaScript.

Bài kiểm thử trình duyệt phủ các tình huống sau: nâng cấp kho cũ; mở lại trang không gộp hai lần; JSON hỏng; JSON sai trường; nhập bài mới; viết lại bài có sẵn mà không ghi đè; sửa lời thành phiên bản mới; không tạo bản trùng; so sánh phiên bản; thêm 2 bản nhạc và từ chối link sai; chọn bản phát hành; chấm điểm và cảnh báo dưới 18; chuyển trạng thái kèm lịch sử; hỏi khi đóng hộp còn thay đổi chưa lưu; sao lưu; xóa có tự lưu; khôi phục; gộp file kho cũ; xuất kho; trình duyệt trắng.

### 4.2. Thử tay sau khi đưa lên (khoảng 5 phút)

1. Mở trang trên máy đã dùng bản cũ. Tab **Kho bài** phải thấy các bài cũ với mã NPT. Tab **Sao lưu** phải có bản tự lưu "Trước khi nâng cấp…".
2. Tab **Sao lưu** → **Tải bản sao lưu**, cất file.
3. Tab **Lịch** → **Sáng tác** cạnh một bài → **Sao chép & mở ChatGPT** → dán câu trả lời → **Kiểm tra & xem trước** → **Xác nhận lưu**.
4. Mở bài vừa lưu: sửa một câu lời → **Lưu thành phiên bản mới**; so sánh v1 với v2.
5. Thêm một link Suno, chấm điểm, chuyển trạng thái, xem tab **Lịch sử**.
6. Mở trang trên điện thoại, kiểm tra các tab hiển thị được.

## 5. Triển khai GitHub Pages

Repo: `chutieuhamchoi/Nhac-phong-tra`, nhánh `main`, thư mục gốc.

1. Đẩy code lên nhánh `main` (Claude đã làm).
2. GitHub tự build trong 1–2 phút. Xem tiến trình ở tab **Actions** → "pages build and deployment".
3. Trang: **https://chutieuhamchoi.github.io/Nhac-phong-tra/** (chữ N viết hoa, giống tên repo).
4. Nếu trình duyệt vẫn hiện bản cũ: tải lại cứng (Ctrl+F5, trên điện thoại là đóng hẳn tab rồi mở lại).

Nếu cần quay lại bản trước: trong repo vào **Commits**, chọn commit "Trang kế hoạch kênh…" → **Revert**, hoặc nhờ Claude. Dữ liệu trong trình duyệt không bị ảnh hưởng: khóa `npt-kho-v1` của bản cũ vẫn nguyên.

## 6. An toàn dữ liệu

- Dữ liệu nằm trong trình duyệt (localStorage). Trang **không tự ghi** lên GitHub. Muốn lưu kho vào repo thì xuất `kho-bai.json` rồi tự commit (hoặc gửi Claude).
- Bản tự lưu: trước khi nâng cấp, khôi phục, gộp, xóa bài, và mỗi ngày một lần. Giữ 8 bản gần nhất. Khi bộ nhớ đầy, bản cũ nhất bị bỏ trước.
- Không có API key hay mật khẩu nào trong mã nguồn. Trang chặn lưu nội dung có dạng API key.
- Bộ nhớ trình duyệt có hạn (khoảng 5 MB) và mất nếu xóa dữ liệu duyệt web, nên **tải bản sao lưu mỗi tuần**.

## 7. Ngoài phạm vi giai đoạn 1

Chưa làm: kết nối API Suno, YouTube Analytics, đồng bộ nhiều máy tự động, đăng nhập.
