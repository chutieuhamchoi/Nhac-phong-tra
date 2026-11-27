---
name: Bàn giao dựng video (Tí → Tèo)
about: Mỗi bài một issue. Tí cập nhật khối bàn giao, gắn nhãn "Sẵn sàng dựng" khi đủ đầu vào.
title: "NPT-0000 · Tên bài"
labels: []
---

<!-- Tí sửa khối dưới đây. Mỗi lần đổi storyboard, ảnh hay MP3 thì tăng phienBan.
     Đường dẫn anh/mp3 tính từ thư mục Nhac_Phong_Tra trên Google Drive.
     storyboard là file JSON trên nhánh main (định dạng của cong-cu/dung_video.py). -->

```ban-giao
ma: NPT-0000
phienBan: 1
storyboard: anh/NPT-0000/storyboard.json
anh: NPT-0000/anh
mp3: NPT-0000/nhac/nhac-chinh.mp3
mp3Md5: (tuỳ chọn — md5 của MP3 đã duyệt)
ghiChu: (tuỳ chọn)
```

**Trước khi gắn nhãn "Sẵn sàng dựng"**, Tí tự kiểm:
- [ ] MP3 trên Drive đúng bản Ông chủ đã chọn; `thoiLuongMp3` trong storyboard bằng thời lượng MP3.
- [ ] Đủ ảnh theo storyboard, 16:9, rộng từ 1280 px (mục tiêu 1920), không chữ/số/logo.
- [ ] Mỗi cảnh ≤ 25 giây, các cảnh nối liền từ 0 đến hết bài.

Lịch sử bàn giao (Tí ghi một dòng mỗi phiên bản):
- v1 · …
