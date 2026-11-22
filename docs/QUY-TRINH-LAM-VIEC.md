# Quy trình làm việc – Kênh Nhạc Phòng Trà

Bản nháp do **Tèo** (Claude) tổng hợp ngày 22/11/2026, rút từ hai bài đã phát hành NPT-0001 và NPT-0002. **Tí** (ChatGPT) đọc kỹ, bổ sung các mục ghi *[Tí bổ sung]* và sửa phần thuộc việc của mình. Ông chủ duyệt xong thì file này thay thế `docs/PHOI-HOP-CHATGPT-CLAUDE.md`.

## 0. Cách gọi tên

| Tên gọi | Là ai | Vai trò |
|---|---|---|
| **Ông chủ** | Chủ kênh | Quyết định, duyệt, làm nhạc trên Suno |
| **Tí** | ChatGPT | Sáng tác: ý tưởng, lời, prompt Suno, storyboard, ảnh, metadata |
| **Tèo** | Claude | Kỹ thuật và phát hành: kiểm tra, dựng video, đăng YouTube, website, công cụ |

Trong commit, lịch sử kho bài (`lichSu`) và tin nhắn bàn giao, ghi rõ ai làm: "Tí …", "Tèo …", "Ông chủ …".

## 1. Định vị và nguyên tắc chung

- Kênh: **Nhạc Phòng Trà – Cà Phê Chill** (@nhac-phongtra). Khẩu hiệu: "Nhạc Phòng Trà – Mỗi bài hát, một câu chuyện đáng nghe."
- Định hướng **Phòng trà đa sắc** (chốt 19/11/2026): không giới hạn thể loại, mỗi bài một câu chuyện, chất lượng hơn số lượng, khoảng 1 bài một tuần.
- **Lời do kênh tự viết.** Không đưa lời của nhạc sĩ khác hay tên ca sĩ thật vào Suno.
- **Chỉ dùng nhạc tạo bằng gói Suno trả phí.** Ông chủ đã xác nhận cả NPT-0001 và NPT-0002 đều dùng gói trả phí.
- **Mọi video phải khai báo có dùng AI** trong YouTube Studio. Mô tả video có câu: "Lời do kênh sáng tác. Nhạc và hình ảnh được tạo với sự hỗ trợ của AI."
- Việc gì tự động được thì Tí và Tèo tự làm. Chỉ nhờ ông chủ những bước bắt buộc phải có người: duyệt, làm nhạc trên Suno, chọn file trong hộp chọn file của trình duyệt.

## 2. Nơi lưu trữ

### GitHub: `chutieuhamchoi/Nhac-phong-tra`, nhánh `main`

Repo chỉ lưu chữ và dữ liệu, không lưu ảnh, nhạc hay video.

| File | Nội dung | Ai sửa |
|---|---|---|
| `data/kho-bai.json` | Kho bài: lời, prompt Suno, bản nhạc, trạng thái, metadata YouTube, lịch sử | Tí và Tèo, theo `docs/DONG-BO-GITHUB.md` |
| `data/lich.json` | Lịch 15 tuần | Tí, sau khi ông chủ duyệt |
| `data/chu-de.json` | Series, tiêu chí sáng tác và duyệt | Tí, sau khi ông chủ duyệt |
| `data/ke-hoach.md` | Kế hoạch (tab Kế hoạch trên web) | Tí và Tèo |
| `storyboard/NPT-xxxx.md` | Storyboard dạng đọc: mốc thời gian, đoạn lời, prompt từng cảnh | Tí soạn, Tèo chốt mốc |
| `anh/NPT-xxxx/storyboard.json` | Storyboard dạng dữ liệu cho công cụ dựng | Tèo tạo từ bản `.md` |
| `assets/`, `index.html`, `tests/` | Website "Nhạc Phòng Trà Studio" | Tèo |

Website: https://chutieuhamchoi.github.io/Nhac-phong-tra/ (tab Kế hoạch, Lịch 15 tuần, Kho bài).

### Google Drive: thư mục `Nhac_Phong_Tra`

Thư mục gốc có ID `1_I6nhC0Jck4y76na7oo5a4IfIK2IMWin`. Trên máy ông chủ, Drive desktop đồng bộ nó về `G:\My Drive\Nhac_Phong_Tra`.

```
Nhac_Phong_Tra/
├── cong-cu/dung_video.py           công cụ dựng video
└── NPT-xxxx/
    ├── nhac/nhac-chinh.mp3         bản Suno đã chọn (đúng tên này)
    ├── anh/canh-01.png … canh-NN.png, thumbnail.png, mo-ta.md
    └── video/final.mp4             chỉ giữ bản cuối, xoá bản nháp sau khi đăng
```

- Kiểm tra thư mục đã có trước khi tạo, không tạo trùng tên.
- File nháp hoặc file thử thì xoá sau khi bài đã đăng.

## 3. Trạng thái bài trong kho

| Mã | Trạng thái | Chuyển sang khi |
|---|---|---|
| 0 | Ý tưởng | Ông chủ chọn ý tưởng |
| 1 | Đang viết lời | Tí bắt đầu viết |
| 2 | Đã duyệt lời | Ông chủ duyệt lời và prompt Suno |
| 3 | Đang tạo nhạc | Có link bản Suno đầu tiên |
| 4 | Đang đánh giá | Có MP3 đã chọn, đang làm hình và video |
| 5 | Duyệt phát hành | Ông chủ duyệt video và metadata |
| 6 | Đã đăng YouTube | Tèo đã xác minh video công khai trên YouTube |

*[Tí bổ sung: thống nhất khi nào chuyển 3 → 4 → 5; lần NPT-0002 đi thẳng từ 3 lên 6.]*

## 4. Quy trình một bài

### Bước 1. Chọn ý tưởng (Tí, ông chủ duyệt)
- Tí đề xuất theo lịch tuần trong `lich.json` và series trong `chu-de.json`, rồi kiểm tra không trùng bài đã có.
- Chưa tạo mã NPT khi ông chủ chưa chọn.

### Bước 2. Lời và prompt Suno (Tí, ông chủ duyệt)
- Lời có nhãn cấu trúc `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Final Chorus]`, `[Outro]`.
- Prompt Suno (Style) bằng tiếng Anh, tả thể loại, tempo, giọng, nhạc cụ và cao trào từng đoạn.
- Mỗi lần sửa thì ghi một phiên bản mới trong `loiVersions`, giữ bản cũ. Bản đã duyệt ghi vào `loiChon`.
- Nếu đổi thể loại so với lịch (NPT-0002 đổi từ pop soul/R&B sang acoustic pop rock), ghi lại lý do vào kho bài và báo Tèo để cập nhật kế hoạch.
- *[Tí bổ sung: tiêu chí tự kiểm tra lời trước khi gửi ông chủ: số âm tiết, vần, câu lặp, hook.]*

### Bước 3. Tạo nhạc (ông chủ)
- Ông chủ tạo trên Suno bằng **gói trả phí**, dùng nút Copy lời và Copy style trên web.
- Chọn bản ưng ý rồi:
  1. dán link Suno vào thẻ bài trên web, bấm Lưu hoặc Thêm phiên bản (cả hai đều lưu được);
  2. đặt MP3 vào `NPT-xxxx/nhac/nhac-chinh.mp3`, hoặc gửi file cho Tèo đẩy lên.
- Nên đặt tên bài trên Suno trùng với tên trong kho. NPT-0002 trên Suno đang là "Yêu Lại Từ Đầu", lệch với tên kênh dùng.

### Bước 4. Storyboard và ảnh (Tí)

**Storyboard**
- Tí đọc độ dài thật của MP3 rồi viết `storyboard/NPT-xxxx.md`. Mỗi cảnh có số thứ tự, tên cảnh, đoạn lời, mô tả, prompt ảnh, prompt chuyển động.
- Ghi rõ cảnh nào phải rơi vào câu hát nào. Ví dụ ở NPT-0002: cảnh 10 vào câu "Tối nay anh đón em tan làm".
- Mốc thời gian của Tí chỉ là bản sơ bộ. **Tèo chốt mốc theo lời hát thật** ở bước 5, vì Suno hay đổi cấu trúc: kéo dài nhạc dạo, chèn đoạn không lời, rút gọn điệp khúc.
- Mỗi cảnh tối đa 25 giây. Bài khoảng 3,5 phút thì cần ít nhất 9 cảnh; NPT-0002 dùng 16 cảnh.

**Ảnh**
- Mỗi cảnh một ảnh tạo riêng. **Không cắt ảnh từ một tấm storyboard tổng.**
- 16:9, đúng 1920×1080 trở lên, rõ nét.
- **Không chữ, không số, không logo, không watermark.** Lần đầu làm NPT-0002, ảnh 06–16 bị dính số cảnh ở góc.
- Nhân vật nhất quán ở mọi cảnh: cùng khuôn mặt, kiểu tóc, trang phục. Lấy một hai ảnh làm chuẩn để đối chiếu.
- Không lặp bố cục giữa các cảnh. Cảnh hồi tưởng phải có dấu hiệu nhận ra là hồi tưởng, ví dụ trẻ hơn hoặc tông màu cũ.
- Tải ảnh vào `NPT-xxxx/anh/` với tên `canh-01.png`, `canh-02.png`…, ghi đè đúng tên khi làm lại.

**Thumbnail**
- 1280×720, có nhân vật chính, cảm xúc rõ.
- Chữ tên bài lớn, đúng dấu, dễ đọc khi xem nhỏ trên điện thoại.
- Lưu `NPT-xxxx/anh/thumbnail.png`.

**Tí không cần dựng video nháp.** Tèo dựng bản chính thức.

*[Tí bổ sung: mẫu prompt ảnh giữ nhân vật nhất quán, cách đặt tông màu theo từng series.]*

### Bước 5. Kiểm tra ảnh, chốt timeline, dựng preview (Tèo)
1. **Kiểm tra ảnh:** đủ số cảnh, kích thước, độ nét, không chữ hoặc số, nhân vật nhất quán, khớp storyboard. Nếu chưa đạt, Tèo gửi ông chủ một đoạn yêu cầu sửa trong một khung để chuyển cho Tí.
2. **Chốt timeline theo lời hát thật:**
   - Tèo dò mốc từng câu trên MP3 bằng nhận dạng giọng hát, sai số khoảng ±0,5 giây.
   - Mốc đầu cảnh đặt sớm hơn câu hát 1,5–2 giây, vì chuyển cảnh (cross dissolve) dài 2 giây bắt đầu tại mốc đầu cảnh.
   - Ghi mốc đầu, mốc cuối và đoạn lời vào `storyboard/NPT-xxxx.md`, rồi tạo `anh/NPT-xxxx/storyboard.json`.
3. **Dựng video:** `dung_video.py` xuất MP4 H.264 1920×1080, 30 khung hình/giây, AAC 256 kbps, giữ nguyên âm lượng bản gốc.
   - Hiệu ứng từng cảnh: slow zoom in, slow zoom out, slow pan left, slow pan right.
   - Lớp phủ film grain; cảnh cuối mờ dần về đen trong 4 giây.
4. **Kiểm tra file xuất:** thời lượng, độ phân giải, âm thanh, khung hình tại các mốc quan trọng.
5. Đặt `video/preview.mp4` lên Drive, báo ông chủ duyệt kèm danh sách điểm còn lưu ý.

### Bước 6. Duyệt (ông chủ)
- Ông chủ duyệt video, tiêu đề, mô tả, thẻ, thumbnail.
- Duyệt xong thì Tèo đổi tên thành `video/final.mp4` và xoá `preview.mp4` cùng các bản nháp.

### Bước 7. Đăng YouTube (Tèo, ông chủ chọn file)
1. Tèo mở YouTube Studio trong trình duyệt của app Claude desktop (đã đăng nhập tài khoản kênh) và bấm Tải lên.
2. **Ông chủ bấm "Chọn tệp" và chọn `final.mp4`.** Tèo chưa tự gửi được file lớn qua trình duyệt.
3. Tèo điền:
   - tiêu đề, mô tả và hashtag lấy từ kho bài;
   - 10–15 thẻ, tổng dưới 500 ký tự;
   - "không dành cho trẻ em", "Có, đã dùng AI", danh mục Nhạc, bật bình luận;
   - danh sách phát của series.
4. Thumbnail: ông chủ bấm "Tải tệp lên" và chọn `thumbnail.png`.
5. Đăng theo chế độ ông chủ chọn (công khai, riêng tư hoặc hẹn giờ). Tèo mở trang xem để xác minh video phát được.

### Bước 8. Đồng bộ (Tèo)
- `kho-bai.json`: `trangThai` 6, `linkYoutube`, `ngayPhatHanh`, một dòng `lichSu` ghi cách xác minh.
- `ke-hoach.md` và `lich.json`: cập nhật mốc phát hành và việc tuần tương ứng.
- Mở website kiểm tra: tab Kế hoạch tự tính bài đã đăng là xong.

## 5. Metadata YouTube

- **Tiêu đề:** chưa thống nhất mẫu. Kế hoạch ghi `<Tên bài> | <Thể loại> – Nhạc Phòng Trà`; NPT-0002 dùng "Yêu Nhau Lại Từ Đầu | Acoustic Pop Rock Việt | Nhạc Phòng Trà". *[Ông chủ chọn một mẫu, Tí áp dụng từ bài sau.]*
- **Mô tả:** đoạn giới thiệu câu chuyện, khẩu hiệu kênh, câu khai báo AI, 3–5 hashtag.
- **Thẻ:** 10–15 thẻ gồm tên bài, thể loại, chủ đề, "nhạc phòng trà", "nhạc phòng trà cà phê chill".
- **Danh sách phát YouTube theo series:** "Tuổi Thơ – Quê Nhà | Nhạc Phòng Trà Hoài Niệm", "Tình Yêu – Nhạc Phòng Trà". Series mới thì tạo danh sách mới. Danh sách cá nhân của ông chủ để Riêng tư.
- *[Tí bổ sung: nội dung Shorts từ đoạn hook, mẫu tiêu đề Shorts.]*

## 6. Quy tắc phối hợp trên GitHub

- Trước khi ghi một file, đọc lại bản mới nhất trên `main`. Nếu bên kia vừa đẩy thay đổi thì gộp lên trên, không ghi đè.
- Tí và Tèo không sửa cùng một file cùng lúc. Mỗi commit ghi mã bài và người làm.
- Bài đã phát hành giữ nguyên lời, trạng thái, ngày phát hành, URL.
- Sau khi sửa dữ liệu chạy `node --test tests/data.test.js`.

## 7. Bàn giao giữa Tí và Tèo

Ông chủ là người chuyển lời giữa Tí và Tèo. Mỗi lần bàn giao ghi đủ:

- mã bài và tên bài;
- những gì đã xong, kèm đường dẫn file trên Drive hoặc GitHub và mã commit;
- những gì còn thiếu hoặc cần bên kia làm tiếp;
- việc cần ông chủ quyết.

Tin nhắn cần chuyển cho bên kia thì đặt **trong một khung duy nhất** để ông chủ copy một lần.

## 8. Việc còn tồn (22/11/2026)

- NPT-0001: bổ sung link bản Suno đã chọn vào kho.
- "Cánh Diều Tuổi Thơ": kiểm tra nhãn AI và gói Suno, thêm thẻ, cho vào danh sách phát Tuổi Thơ.
- Thống nhất mẫu tiêu đề video.
- Ý tưởng: cắt clip dọc 30–60 giây từ đoạn hook để đăng Shorts và TikTok.
