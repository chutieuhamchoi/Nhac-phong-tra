// Kiểm thử lớp dữ liệu: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
require('../assets/data.js');
const N = globalThis.NPT;

const KHO_CU = {
  capNhat: '2026-11-17',
  bai: [
    { id: 'mi3abc', loai: 'bai', tuan: 1, series: 'tuoi-tho', tt: 2, ten: 'Mái Trường Làng', loi: '[Verse 1]\nCon đường đất đỏ', style: 'ballad', tieude: 'Mái Trường', mota: 'mô tả', shorts: 'x', tag: '#a #b', link: '', prompt: 'p', ngay: '2026-11-17', laTruongLa: 42 },
    { id: 'mi3abd', loai: 'playlist', tuan: 3, series: 'xxx', tt: 3, ten: 'PL', loi: '', ngay: '2026-11-18' }
  ]
};

test('chuyển kho cũ: giữ dữ liệu, cấp ID NPT, map trạng thái, giữ bản gốc', () => {
  const { kho, baoCao } = N.chuanHoaKho(KHO_CU);
  assert.equal(baoCao.tuCu, 2);
  const [a, b] = kho.bai;
  assert.equal(a.id, 'NPT-0001'); assert.equal(b.id, 'NPT-0002');
  assert.equal(a.legacyId, 'mi3abc');
  assert.equal(a.trangThai, N.TT.DANH_GIA);          // "Đã tạo Suno" → Đang đánh giá
  assert.equal(b.trangThai, N.TT.DA_DANG);
  assert.equal(N.loiHienTai(a), '[Verse 1]\nCon đường đất đỏ');
  assert.equal(a.promptSuno, 'ballad');
  assert.equal(a._v1.laTruongLa, 42);                // trường lạ còn nguyên trong bản gốc
  assert.equal(b.series, 'tuoi-tho');                // series sai → mặc định
  assert.equal(kho.nextId, 3);
});

test('chuẩn hóa hai lần không đổi ID và không mất phiên bản', () => {
  const { kho } = N.chuanHoaKho(KHO_CU);
  const again = N.chuanHoaKho(JSON.parse(JSON.stringify(kho))).kho;
  assert.deepEqual(again.bai.map(b => b.id), kho.bai.map(b => b.id));
  assert.equal(again.bai[0].loiVersions.length, 1);
  assert.equal(again.baoCao, undefined);
});

test('nhận mảng bài cũ trần', () => {
  const { kho } = N.chuanHoaKho(KHO_CU.bai);
  assert.equal(kho.bai.length, 2);
});

test('phiên bản lời không ghi đè, không tạo bản trùng', () => {
  const kho = N.khoRong();
  const b = N.taoBai(kho, { ten: 'A', loi: 'v1' });
  assert.equal(N.themLoi(b, 'v1'), null);
  assert.equal(N.themLoi(b, 'v2'), 2);
  assert.equal(b.loiVersions.length, 2);
  assert.equal(b.loiVersions[0].loi, 'v1');
  N.chonLoi(b, 1); assert.equal(N.loiHienTai(b), 'v1');
});

test('phiên bản nhạc và chọn phát hành', () => {
  const kho = N.khoRong(); const b = N.taoBai(kho, { ten: 'A', loi: 'x' });
  N.themNhac(b, 'https://suno.com/song/1', 'giọng nữ'); N.themNhac(b, 'https://suno.com/song/2');
  N.chonNhac(b, 2); assert.equal(b.nhacChon, 2);
  N.chonNhac(b, 9); assert.equal(b.nhacChon, 2);
});

test('trạng thái có lịch sử và cảnh báo điểm', () => {
  const kho = N.khoRong(); const b = N.taoBai(kho, { ten: 'A', loi: 'x' });
  assert.ok(N.canhBaoChuyen(b, N.TT.DUYET_PHAT_HANH).some(s => s.includes('chưa được chấm')));
  N.TIEU_CHI.forEach(([k]) => N.datDiem(b, k, 3));
  assert.equal(N.tongDiem(b), 15);
  assert.ok(N.canhBaoChuyen(b, N.TT.DUYET_PHAT_HANH).some(s => s.includes('15/25')));
  N.TIEU_CHI.forEach(([k]) => N.datDiem(b, k, 4)); N.themNhac(b, 'l'); N.chonNhac(b, 1);
  assert.deepEqual(N.canhBaoChuyen(b, N.TT.DUYET_PHAT_HANH), []);
  assert.ok(N.doiTrangThai(b, N.TT.DA_DANG, 'đăng'));
  assert.equal(b.lichSu.at(-1).tu, N.TT.VIET_LOI);
  assert.ok(b.ngayPhatHanh);
  assert.equal(N.doiTrangThai(b, N.TT.DA_DANG), false);
});

test('kiểm tra JSON từ ChatGPT', () => {
  const md = { series: 'dem-mua', tuan: 2 };
  const ok = N.phanTichNhap('Đây:\n```json\n{"ten":"Phố cũ","loi":"[Verse 1]\\nMưa","style":"bolero","tag":["#a","#b"]}\n```', md)[0];
  assert.ok(ok.ok, ok.loi.join());
  assert.equal(ok.data.series, 'dem-mua'); assert.equal(ok.data.tuan, 2); assert.equal(ok.data.tag, '#a #b');
  assert.ok(ok.canhBao.some(s => s.includes('tuần 2')));
  const bad = N.phanTichNhap('{"ten":"","series":"abc","tuan":40,"tieude":"' + 'x'.repeat(120) + '"}', md)[0];
  assert.equal(bad.ok, false);
  assert.equal(bad.loi.length, 5);   // ten, series, tuan, thiếu lời, tieude
  assert.throws(() => N.phanTichNhap('{ten: x}', md), /JSON không hợp lệ/);
  const nhieu = N.phanTichNhap('[{"ten":"A","loi":"[Chorus] a","series":"mua","tuan":1},{"ten":"B","loi":"[Chorus] b","series":"mua","tuan":1}]', md);
  assert.equal(nhieu.length, 2);
  const key = N.kiemTraNhap({ ten: 'A', loi: '[Chorus] x', ghiChu: 'sk-abcdefghijklmnop' }, md);
  assert.equal(key.ok, false);
});

test('nhập vào bài có sẵn: lời thành bản mới, không ghi đè trường khác trừ khi chọn', () => {
  const kho = N.khoRong();
  const b = N.taoBai(kho, { ten: 'Phố Cũ', loi: 'cũ', tieude: 'Tiêu đề cũ' });
  const data = N.kiemTraNhap({ ten: 'phố cũ', loi: '[Verse] mới', tieude: 'Tiêu đề mới', mota: 'mô tả mới' }, { series: 'mua', tuan: 1 }).data;
  assert.equal(N.timBaiTrung(kho, data.ten), b);
  assert.deepEqual(N.xungDot(b, data), ['tieude']);
  N.apNhap(kho, data, b, []);
  assert.equal(b.loiVersions.length, 2); assert.equal(b.tieude, 'Tiêu đề cũ'); assert.equal(b.mota, 'mô tả mới');
  N.apNhap(kho, { ...data, loi: '[Verse] mới 2' }, b, ['tieude']);
  assert.equal(b.tieude, 'Tiêu đề mới'); assert.equal(b.loiVersions.length, 3);
});

test('gộp kho: trùng ID thì bỏ qua', () => {
  const kho = N.chuanHoaKho(KHO_CU).kho;
  const kq = N.gopKho(kho, N.xuatKho(kho));
  assert.equal(kq.them, 0); assert.equal(kq.boQua.length, 2);
  const kq2 = N.gopKho(kho, [{ ten: 'Mới', loi: 'x', tt: 0 }]);
  assert.equal(kq2.them, 1); assert.equal(kho.bai.at(-1).id, 'NPT-0003');
});

test('sao lưu và khôi phục giữ tiến độ lịch', () => {
  const kho = N.chuanHoaKho(KHO_CU).kho;
  const pkg = JSON.parse(JSON.stringify(N.goiSaoLuu(kho, { '1:b0': true })));
  const r = N.docSaoLuu(pkg);
  assert.equal(r.kho.bai.length, 2); assert.deepEqual(r.tienDoLich, { '1:b0': true });
  assert.equal(r.kho.bai[0]._v1.id, 'mi3abc');
});

test('so sánh hai phiên bản lời', () => {
  const d = N.soSanh('a\nb\nc', 'a\nx\nc\nd');
  assert.deepEqual(d.map(x => x.t + x.s), ['=a', '-b', '+x', '=c', '+d']);
});
