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

- **3 → 4 · Đang đánh giá.** Khi Ông chủ đã chọn bản Suno để đánh giá và MP3 đúng phiên bản đã có tại `nhac/nhac-chinh.mp3`, ghi bản được chọn vào kho rồi chuyển sang 4. Tí có thể chuẩn bị storyboard, ảnh và metadata trong giai đoạn này để Tèo dựng preview.
- **4 → 5 · Duyệt phát hành.** Tèo gửi preview và kết quả kiểm tra cho Ông chủ. Chấm 4 tiêu chí theo `data/chu-de.json`, tối đa 20 điểm. Từ 17 điểm trở lên là mức đề xuất duyệt. Điểm đánh giá hỗ trợ quyết định của Ông chủ. Chỉ chuyển sang 5 sau khi Ông chủ duyệt bản nhạc, video và metadata, gồm cả thumbnail. Nếu còn yêu cầu sửa, giữ ở 4.
- **5 → 6 · Đã đăng YouTube.** Tèo xác minh video đã công khai và phát được rồi ghi URL, ngày phát hành và cách xác minh. Video đang riêng tư hoặc chờ lịch công khai vẫn ở 5.
- Mỗi lần chuyển, cập nhật `ngayCapNhat` và thêm một dòng `lichSu` với `tu`, `den`, `luc`, `ghiChu` nêu người thực hiện và căn cứ. NPT-0002 từng đi từ 3 lên 6. Từ bài sau, ghi từng mốc 3 → 4 → 5 → 6 khi đủ điều kiện.

## 4. Quy trình một bài

### Bước 1. Chọn ý tưởng (Tí, ông chủ duyệt)
- Tí đề xuất theo lịch tuần trong `lich.json` và series trong `chu-de.json`, rồi kiểm tra không trùng bài đã có.
- Chưa tạo mã NPT khi ông chủ chưa chọn.
- Tí đối chiếu cả tên bài, tình huống, chủ đề và câu hook với kho bài để tránh trùng ý. Mỗi đề xuất nêu nhân vật, tình huống, chuyển biến cảm xúc và hướng hook để Ông chủ chọn. Chỉ tạo bản ghi khi Ông chủ yêu cầu sau khi chọn.

### Bước 2. Lời và prompt Suno (Tí, ông chủ duyệt)
- Lời có nhãn cấu trúc `[Verse 1]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Final Chorus]`, `[Outro]`.
  - **Chốt 22/11/2026:** chọn các nhãn phù hợp cấu trúc thực tế của bài, chỉ dùng các phần giúp câu chuyện tiến triển và tạo cao trào. Vẫn bắt buộc ghi nhãn cho từng đoạn. Độ dài lời vừa với bài 3–4 phút để Suno không tự rút gọn (NPT-0002 bị rút gọn Chorus 2).
- Prompt Suno (Style) bằng tiếng Anh, tả thể loại, tempo, giọng, nhạc cụ và cao trào từng đoạn.
  - Tí kiểm tra Style tối đa **1.000 ký tự**, tính cả khoảng trắng và dấu câu, trước khi gửi. Giữ trọng tâm vào nhịp, cách hát và các điểm chuyển năng lượng.
- **Chốt 22/11/2026 – Thông số Suno (Advanced).** Kèm prompt Style, Tí đề xuất đủ 8 thông số và ghi vào `caiDatSuno` của bài:
  | Trường | Trên Suno | Giá trị |
  |---|---|---|
  | `model` | Nút phiên bản (góc phải) | `"v6"`, `"v5"`… |
  | `giong` | Vocal Gender | `"nam"` / `"nu"` (khớp giọng ghi trong Style) |
  | `thoiLuong` | Duration | `"auto"` hoặc `"m:ss"` |
  | `maxMode` | Max Mode | `true` / `false` |
  | `weirdness` | Weirdness | 0–100 (%) |
  | `styleInfluence` | Style Influence | 0–100 (%) |
  | `variety` | Variety | chữ đúng như Suno hiện, vd `"Normal"` |
  | `personalize` | Personalize | `true` / `false` |
  - Gửi kèm một dòng dễ đọc cho Ông chủ chỉnh tay, ví dụ: `v6 · Nữ · Duration Auto · Max Off · Weirdness 58% · Style Influence 46% · Variety Normal · Personalize Off`.
  - Khi trả JSON để nhập ở tab Sáng tác: thêm trường `"caiDatSuno": {…}` như trên. Trang kiểm tra giá trị, sai thì cảnh báo và bỏ qua trường đó.
  - Khi Ông chủ báo bản Suno nào ưng, Tí so thông số thật với đề xuất; thông số nào cho kết quả tốt thì ghi lại để dùng cho bài sau cùng series.
- Mỗi lần sửa thì ghi một phiên bản mới trong `loiVersions`, giữ bản cũ. Bản đã duyệt ghi vào `loiChon`.
  - **Chốt 22/11/2026:** khi sửa Style, ghi một phiên bản Style mới trong `styleVersions` kèm ghi chú thay đổi; bản đang dùng ở `styleChon`, `promptSuno` luôn là nội dung bản đang dùng. Chỉ thêm `loiVersions` khi lời thực sự thay đổi. Mỗi bản nhạc ghi kèm phiên bản lời và Style đã dùng. Ví dụ NPT-0002: lời V3 + Style V4.
- Nếu đổi thể loại so với lịch (NPT-0002 đổi từ pop soul/R&B sang acoustic pop rock), ghi lại lý do vào kho bài và báo Tèo để cập nhật kế hoạch.
- **Tự kiểm tra lời trước khi gửi Ông chủ**
  1. Đếm âm tiết từng dòng, đọc thành tiếng và gõ nhịp theo tempo dự kiến. So các câu có mô-típ tương ứng, rà chỗ dồn chữ, thiếu nhịp lấy hơi hoặc ngắt giữa một cụm ý. Linh hoạt số âm tiết nếu câu vẫn hát tự nhiên.
  2. Đọc các tiếng cuối câu theo cặp để kiểm tra vần và sự tự nhiên của từ ngữ. Ưu tiên đúng ý và dễ hát. Nếu phải đảo từ hoặc chèn từ đệm để ép vần, viết lại câu.
  3. Rà câu và cụm từ lặp ở cả các đoạn cách xa nhau. Giữ lần lặp có chủ đích trong hook hoặc điệp khúc. Nếu cụm “Anh vẫn muốn” xuất hiện ba lần, thử giữ ở câu đắt nhất, viết các câu còn lại bằng ý hoặc hành động cụ thể rồi đọc lại cả đoạn.
  4. Hát hoặc đọc thử riêng hook. Kiểm tra người nghe có thể nhớ và nhắc lại sau một lượt, trọng âm rơi tự nhiên, câu hát gắn với tình huống trung tâm và có chỗ nâng giai điệu. Verse dựng tình huống, Bridge hoặc Final Chorus cần có chuyển biến để lần trở lại của hook có thêm ý nghĩa.

### Bước 3. Tạo nhạc (ông chủ)
- Ông chủ tạo trên Suno bằng **gói trả phí**, dùng nút Copy lời và Copy style trên web, rồi chỉnh mục Advanced theo dòng **Thông số Suno đề xuất** ở tab Nhạc & điểm (chỉ hiển thị, Tí ghi vào `caiDatSuno`).
- **Chốt 22/11/2026:** mỗi bản nhạc tự lưu kèm thông số đề xuất lúc thêm (`nhacVersions[].caiDat`). Nếu Ông chủ đổi thông số khi tạo, ghi vào ô Ghi chú của bản nhạc hoặc báo Tí sửa `caiDatSuno`.
- Chọn bản ưng ý rồi:
  1. dán link Suno vào thẻ bài trên web, bấm Lưu hoặc Thêm phiên bản (cả hai đều lưu được);
  2. đặt MP3 vào `NPT-xxxx/nhac/nhac-chinh.mp3`, hoặc gửi file cho Tèo đẩy lên.
- Nên đặt tên bài trên Suno trùng với tên trong kho. NPT-0002 trên Suno đang là "Yêu Lại Từ Đầu", lệch với tên kênh dùng.

### Bước 4. Storyboard và ảnh (Tí)

**Storyboard**
- Tí viết `storyboard/NPT-xxxx.md` (phác từ lời đã duyệt, cập nhật theo độ dài thật khi có MP3). Mỗi cảnh có số thứ tự, tên cảnh, đoạn lời, mô tả, prompt ảnh, prompt chuyển động.
  - **Chốt 22/11/2026:** Tí phác storyboard ngay khi lời đã duyệt, không chờ MP3. Cảnh gắn với câu hát, không gắn với giây; mốc ghi rõ là ước lượng. Được tạo ảnh trước. Khi có đúng bản MP3 đã chọn: đo thời lượng, cập nhật mốc sơ bộ, chốt lại số cảnh (mỗi cảnh tối đa 25 giây) và ghi các câu hát cần khớp hình để Tèo chốt mốc theo lời hát thật.
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
  - Sau khi tải, kiểm tra lại trên Drive đủ tên cảnh, đúng kích thước và mở được. So trực quan cả loạt với ảnh chuẩn, chú ý số cảnh ở góc ảnh, biển hiệu, nét mặt và trang phục.

**Thumbnail**
- 1280×720, có nhân vật chính, cảm xúc rõ.
- Chữ tên bài lớn, đúng dấu, dễ đọc khi xem nhỏ trên điện thoại.
- Lưu `NPT-xxxx/anh/thumbnail.png`.

**Tí không cần dựng video nháp.** Tèo dựng bản chính thức.

**Mẫu prompt ảnh cho một cảnh**

```text
Create one standalone cinematic still for [scene description, location and time].
Use [reference image 1] and [reference image 2] as strict identity references for
the same characters: [age, facial traits, hairstyle, wardrobe colors].
Show [action and emotion] in [framing and viewpoint]. Preserve recognizable
facial features and hair across scenes. Use [series palette], with natural
skin tones and [lighting appropriate to the story].
Output a sharp, full-frame 16:9 PNG at 1920×1080 or higher.
No text, digits, logos, watermarks, borders or storyboard panels.
```

- **Tông màu theo series.** Tra series và màu gợi ý trong `data/chu-de.json`, chọn một tông chủ đạo và một màu nhấn phù hợp câu chuyện. Dùng chúng qua ánh sáng, đạo cụ hoặc hậu cảnh, giữ da người tự nhiên. Ví dụ Tình yêu dùng kem, hổ phách và hồng trầm. Phòng trà đêm mưa dùng xanh xám và ánh đèn vàng. Cà phê sáng dùng kem, vàng nhạt và ánh sáng tự nhiên.
- **Cảnh hồi tưởng.** Dùng cùng ảnh chuẩn, giữ đường nét khuôn mặt và đặc điểm nhận diện. Có thể cho nhân vật trẻ hơn vừa phải. Dùng thêm dấu hiệu như đạo cụ kỷ niệm, ánh sáng mềm hoặc tông phim ấm hơn hiện tại. Nếu cảnh là hình dung về tuổi già, đổi tuổi và màu tóc nhưng vẫn giữ các nét nhận diện của cùng nhân vật.

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

- **Tiêu đề (chốt 22/11/2026, Ông chủ chọn phương án A):** `<Tên bài> | <Thể loại> – Nhạc Phòng Trà`. Ví dụ: `Yêu Nhau Lại Từ Đầu | Acoustic Pop Rock – Nhạc Phòng Trà`.
  - Mẫu chính thức, áp dụng từ bài tiếp theo (sau NPT-0002). Tí đặt tiêu đề theo mẫu này trong kho bài; Tèo kiểm tra lại khi đăng.
  - Giữ nguyên tiêu đề các video đã phát hành, kể cả NPT-0002 ("Yêu Nhau Lại Từ Đầu | Acoustic Pop Rock Việt | Nhạc Phòng Trà").
  - Lý do chọn: gọn, dùng được cho mọi thể loại, ít bị cắt trên điện thoại. Phương án B (`<Tên bài> | <Thể loại> Việt | Nhạc Phòng Trà`) không dùng.
- **Mô tả:** đoạn giới thiệu câu chuyện, khẩu hiệu kênh, câu khai báo AI, 3–5 hashtag.
- **Thẻ:** 10–15 thẻ gồm tên bài, thể loại, chủ đề, "nhạc phòng trà", "nhạc phòng trà cà phê chill".
  - Tí chuẩn bị thẻ phân cách bằng dấu phẩy, tổng dưới 500 ký tự. Hashtag nằm riêng trong mô tả.
- **Danh sách phát YouTube theo series:** "Tuổi Thơ – Quê Nhà | Nhạc Phòng Trà Hoài Niệm", "Tình Yêu – Nhạc Phòng Trà". Series mới thì tạo danh sách mới. Danh sách cá nhân của ông chủ để Riêng tư.
- **Shorts từ hook.** Tí chọn câu hook và 1–3 câu liền kề đủ ý, ghi vào `shorts` trong kho bài. Đề xuất trích đoạn dọc khoảng 30–60 giây, gồm đoạn vào câu và điểm kết tự nhiên. Gửi kèm câu mở, câu kết và gợi ý cảnh để Tèo xác nhận mốc trên bản nhạc đã chọn và dựng clip. Nếu dùng phụ đề, chép đúng lời thực tế trên bản Suno.
- **Mẫu tiêu đề Shorts.** `<Câu hook ngắn> | <Tên bài> #Shorts`. Nếu hook trùng tên bài, dùng `<Tên bài> | <Cụm tạo bối cảnh> #Shorts`. Ví dụ: `Yêu Nhau Lại Từ Đầu | Hẹn hò như ngày xưa #Shorts`.

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
- ~~Thống nhất mẫu tiêu đề video.~~ Đã chốt 22/11/2026: phương án A (mục 5), áp dụng từ bài tiếp theo.
- Ý tưởng: cắt clip dọc 30–60 giây từ đoạn hook để đăng Shorts và TikTok.
