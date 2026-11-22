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
  N.TIEU_CHI.forEach(([k]) => N.datDiem(b, k, 4));
  assert.equal(N.tongDiem(b), 16);
  assert.ok(N.canhBaoChuyen(b, N.TT.DUYET_PHAT_HANH).some(s => s.includes('16/20') && s.includes('cần chỉnh sửa')));
  N.datDiem(b, 'cauChuyen', 5); N.themNhac(b, 'l'); N.chonNhac(b, 1);
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

test('tự đồng bộ GitHub thêm bài mới và không nhân đôi khi tải lại', () => {
  const local = N.khoRong();
  const remote = N.khoRong();
  N.taoBai(remote, { ten: 'Có Những Ngày Chỉ Muốn Về Nhà', loi: '[Verse] Nhà' });
  assert.equal(N.dongBoTuGitHub(local, remote).them, 1);
  assert.equal(local.bai[0].ten, 'Có Những Ngày Chỉ Muốn Về Nhà');
  assert.equal(N.dongBoTuGitHub(local, remote).them, 0);
  assert.equal(local.bai.length, 1);
});

test('tự đồng bộ GitHub giữ bài cục bộ khi trùng ID khác tên', () => {
  const local = N.khoRong();
  N.taoBai(local, { ten: 'Bài trên máy', loi: '[Verse] Cũ' });
  const remote = N.khoRong();
  N.taoBai(remote, { ten: 'Bài trên GitHub', loi: '[Verse] Mới' });
  const r = N.dongBoTuGitHub(local, remote);
  assert.equal(r.them, 1);
  assert.equal(r.doiMa, 1);
  assert.equal(r.trungMa.length, 1);
  assert.equal(local.bai.length, 2);
  assert.equal(local.bai[0].ten, 'Bài trên máy');
  assert.equal(local.bai[1].remoteId, 'NPT-0001');
  assert.notEqual(local.bai[0].id, local.bai[1].id);
  assert.equal(N.dongBoTuGitHub(local, remote).them, 0);
});

/* ---- đồng bộ GitHub: các lỗi phát hiện ngày 18/11/2026 ---- */
const khoGitHub = (...bai) => ({ schema: 2, nextId: bai.length + 1, bai });
const baiGitHub = (o = {}) => Object.assign({
  id: 'NPT-0001', loai: 'bai', ten: 'Có Những Ngày Chỉ Muốn Về Nhà', series: 'tuoi-tho', tuan: 1,
  ngayTao: '2026-11-18T15:06:07.306Z', ngayCapNhat: '2026-11-18T15:06:07.306Z', trangThai: 2,
  lichSu: [{ tu: null, den: 1, luc: '2026-11-18T15:00:00.000Z', ghiChu: 'Tạo bài' }, { tu: 1, den: 2, luc: '2026-11-18T15:06:07.306Z', ghiChu: 'Duyệt' }],
  loiVersions: [{ v: 1, loi: '[Verse 1]\nV1', nguon: 'chatgpt', luc: '2026-11-18T15:06:07.306Z', ghiChu: '' }], loiChon: 1,
  promptSuno: 'ballad', nhacVersions: [], nhacChon: null, diem: {}, tieude: 'Tiêu đề', mota: 'Mô tả', tag: '#a'
}, o);
const json = o => JSON.parse(JSON.stringify(o));

test('đồng bộ: trình duyệt mới nạp từ repo rồi đổi tên bài, tải lại không nhân đôi', () => {
  const remote = khoGitHub(baiGitHub());
  const k = N.chuanHoaKho(json(remote)).kho;     // đường nạp ban đầu cũ: không có remoteId
  N.dongBoTuGitHub(k, json(remote));
  k.bai[0].ten = 'Tên mới đặt trong trình duyệt';
  const r = N.dongBoTuGitHub(k, json(remote));
  assert.equal(r.them, 0); assert.equal(k.bai.length, 1);
  assert.equal(k.bai[0].ten, 'Tên mới đặt trong trình duyệt');
});

test('đồng bộ: bài GitHub thiếu trường hoặc ghi lời dạng phẳng vẫn dùng được', () => {
  const k = N.khoRong();
  N.dongBoTuGitHub(k, khoGitHub({ id: 'NPT-0001', ten: 'Bài thiếu', loi: '[Verse] x', style: 'bolero' }));
  const b = k.bai[0];
  assert.equal(N.loiHienTai(b), '[Verse] x'); assert.equal(b.promptSuno, 'bolero');
  assert.equal(N.tongDiem(b), null); assert.ok(Array.isArray(b.lichSu) && Array.isArray(b.nhacVersions));
});

test('đồng bộ: tải lại nhiều lần không thay đổi gì', () => {
  const k = N.khoRong(); const remote = khoGitHub(baiGitHub());
  assert.equal(N.dongBoTuGitHub(k, json(remote)).them, 1);
  const r2 = N.dongBoTuGitHub(k, json(remote));
  assert.equal(r2.them + r2.capNhat, 0); assert.equal(r2.doi, false); assert.equal(k.bai.length, 1);
});

test('đồng bộ: ChatGPT cập nhật bài (lời V2, trạng thái) được nhận, phiên bản cũ còn nguyên', () => {
  const k = N.khoRong();
  N.dongBoTuGitHub(k, khoGitHub(baiGitHub()));
  const moi = baiGitHub({
    ngayCapNhat: '2026-11-19T10:00:00.000Z', trangThai: 3, loiChon: 2, tieude: 'Tiêu đề mới',
    loiVersions: [...baiGitHub().loiVersions, { v: 2, loi: '[Verse 1]\nV2', nguon: 'chatgpt', luc: '2026-11-19T09:00:00.000Z', ghiChu: 'sửa' }],
    lichSu: [...baiGitHub().lichSu, { tu: 2, den: 3, luc: '2026-11-19T10:00:00.000Z', ghiChu: 'Tạo nhạc' }]
  });
  const r = N.dongBoTuGitHub(k, khoGitHub(moi));
  const b = k.bai[0];
  assert.equal(r.capNhat, 1); assert.equal(r.xungDot.length, 0);
  assert.equal(b.loiVersions.length, 2); assert.equal(b.loiVersions[0].loi, '[Verse 1]\nV1');
  assert.equal(N.loiHienTai(b), '[Verse 1]\nV2'); assert.equal(b.trangThai, 3); assert.equal(b.tieude, 'Tiêu đề mới');
  assert.equal(b.lichSu.filter(h => h.den === 3).length, 1);
});

test('đồng bộ: cả hai cùng sửa một trường thì giữ bản trình duyệt, lưu bản GitHub và cảnh báo', () => {
  const k = N.khoRong();
  N.dongBoTuGitHub(k, khoGitHub(baiGitHub()));
  const b = k.bai[0];
  b.tieude = 'Tiêu đề sửa trong trình duyệt'; b.mota = 'Mô tả sửa trong trình duyệt';
  N.themLoi(b, '[Verse 1]\nSửa tay', 'tay');
  const r = N.dongBoTuGitHub(k, khoGitHub(baiGitHub({ ngayCapNhat: '2026-11-19T10:00:00.000Z', tieude: 'Tiêu đề GitHub', mota: 'Mô tả' })));
  assert.equal(b.tieude, 'Tiêu đề sửa trong trình duyệt');
  assert.equal(b.mota, 'Mô tả sửa trong trình duyệt');      // GitHub không đổi mô tả → giữ bản trình duyệt, không cảnh báo
  assert.equal(b.xungDotGitHub.tieude.github, 'Tiêu đề GitHub');
  assert.equal(r.xungDot.length, 1); assert.match(r.xungDot[0], /tiêu đề/);
  assert.equal(N.loiHienTai(b), '[Verse 1]\nSửa tay');
  assert.equal(N.dongBoTuGitHub(k, khoGitHub(baiGitHub({ ngayCapNhat: '2026-11-19T10:00:00.000Z', tieude: 'Tiêu đề GitHub', mota: 'Mô tả' }))).xungDot.length, 0);
});

test('đồng bộ: GitHub để trống một trường không xóa dữ liệu trình duyệt', () => {
  const k = N.khoRong();
  N.dongBoTuGitHub(k, khoGitHub(baiGitHub()));
  N.dongBoTuGitHub(k, khoGitHub(baiGitHub({ ngayCapNhat: '2026-11-19T10:00:00.000Z', tieude: '', mota: '' })));
  assert.equal(k.bai[0].tieude, 'Tiêu đề'); assert.equal(k.bai[0].mota, 'Mô tả');
});

test('đồng bộ: file GitHub hỏng hoặc sai schema báo lỗi rõ, trùng mã trong file thì bỏ qua', () => {
  assert.throws(() => N.dongBoTuGitHub(N.khoRong(), { schema: 1, bai: [] }), /schema 1/);
  assert.throws(() => N.dongBoTuGitHub(N.khoRong(), null), /không hợp lệ/);
  const k = N.khoRong();
  const r = N.dongBoTuGitHub(k, khoGitHub(baiGitHub(), baiGitHub({ ten: 'Trùng' }), { ten: 'không mã' }));
  assert.equal(r.them, 1); assert.equal(r.boQua.length, 2);
});

/* ---------- cấu hình đa sắc (19/11/2026): series lấy từ data/chu-de.json ---------- */
const fs = require('node:fs');
const path = require('node:path');
const docJson = f => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));

test('series mới trong chu-de.json được nhận khi nhập JSON và tạo bài, không bị đổi về tuoi-tho', () => {
  const macDinh = [...N.SERIES];
  try {
    N.datSeries(docJson('chu-de.json').series.map(s => s.id));
    const r = N.kiemTraNhap({ loai: 'bai', ten: 'Yêu Nhau Lại Từ Đầu', series: 'tinh-yeu', tuan: 2, loi: '[Verse 1]\nx\n[Chorus]\ny' }, { series: 'tinh-yeu', tuan: 2 });
    assert.equal(r.ok, true, r.loi.join('; '));
    const k = N.khoRong();
    assert.equal(N.taoBai(k, { ten: 'A', series: 'tinh-yeu', tuan: 2 }).series, 'tinh-yeu');
    const { kho } = N.chuanHoaKho({ schema: 2, bai: [{ id: 'NPT-0009', loai: 'bai', ten: 'B', series: 'do-thi', tuan: 5, loiVersions: [] }] });
    assert.equal(kho.bai[0].series, 'do-thi');
    assert.equal(N.kiemTraNhap({ ten: 'C', series: 'khong-co', loi: '[Verse 1]\nx' }, { tuan: 1 }).ok, false);
    N.datSeries([]);                                      // cấu hình rỗng không xóa danh sách
    assert.ok(N.SERIES.includes('tinh-yeu'));
  } finally { N.datSeries(macDinh); }
});

test('lịch 15 tuần và kho bài chỉ dùng series có trong chu-de.json', () => {
  const ids = new Set(docJson('chu-de.json').series.map(s => s.id));
  const lich = docJson('lich.json');
  assert.equal(lich.tuan.length, N.SO_TUAN);
  lich.tuan.forEach((w, i) => {
    assert.equal(w.so, i + 1);
    assert.ok(ids.has(w.series), `tuần ${w.so}: series "${w.series}" không có trong chu-de.json`);
    assert.ok(Array.isArray(w.baiDon) && Array.isArray(w.viec));
  });
  docJson('kho-bai.json').bai.forEach(b => assert.ok(ids.has(b.series), `${b.id}: series "${b.series}" không có trong chu-de.json`));
});

test('phiếu duyệt 20 điểm đọc từ chu-de.json: khóa, ngưỡng, xếp loại', () => {
  const cfg = docJson('chu-de.json');
  N.datTieuChi(cfg.tieuChiDuyet, cfg.nguongDuyet);
  assert.deepEqual(N.TIEU_CHI.map(([k]) => k), ['cauChuyen', 'diemCham', 'giaiDieu', 'banSac']);
  assert.equal(N.diemToiDa(), 20);
  assert.equal(N.xepLoai(17).muc, 'duyet'); assert.equal(N.xepLoai(16).muc, 'sua');
  assert.equal(N.xepLoai(14).muc, 'sua'); assert.equal(N.xepLoai(13).muc, 'viet-lai'); assert.equal(N.xepLoai(null).muc, null);
  const b = N.taoBai(N.khoRong(), { ten: 'A' });
  N.datDiem(b, 'banSac', 6); assert.equal(b.diem.banSac, null);          // vượt điểm tối đa
  N.datDiem(b, 'loi', 3); assert.equal(b.diem.loi, undefined);           // tiêu chí cũ không còn chấm được
  N.datTieuChi([], null); assert.equal(N.TIEU_CHI.length, 4);           // cấu hình rỗng không xóa phiếu
});

test('điểm thang 25 cũ được chuyển sang diemCu, không mất; điểm trống không tạo diemCu', () => {
  const { kho } = N.chuanHoaKho({ schema: 2, bai: [
    { id: 'NPT-0001', loai: 'bai', ten: 'A', series: 'tuoi-tho', tuan: 1, loiVersions: [], diem: { loi: 4, giaiDieu: 3, caoTrao: 5, camXuc: 4, thuHut: 2 } },
    { id: 'NPT-0002', loai: 'bai', ten: 'B', series: 'tuoi-tho', tuan: 1, loiVersions: [], diem: { loi: null, giaiDieu: null, caoTrao: null, camXuc: null, thuHut: null } }] });
  const [a, b] = kho.bai;
  assert.deepEqual(a.diem, { cauChuyen: null, diemCham: null, giaiDieu: 3, banSac: null });
  assert.deepEqual([a.diemCu.thang, a.diemCu.loi, a.diemCu.caoTrao, a.diemCu.camXuc, a.diemCu.thuHut], [25, 4, 5, 4, 2]);
  assert.equal(b.diemCu, undefined);
  assert.equal(N.tongDiem(a), null);
  const lan2 = N.chuanHoaKho(kho).kho.bai[0];                             // chuẩn hóa lại không mất diemCu
  assert.equal(lan2.diemCu.loi, 4);
});

test('đồng bộ: bài GitHub còn khóa điểm cũ (null) không gây xung đột hay ghi đè điểm mới', () => {
  const k = N.khoRong();
  const goc = { id: 'NPT-0001', loai: 'bai', ten: 'A', series: 'tuoi-tho', tuan: 1, ngayCapNhat: '2026-11-19T08:42:00.000Z', loiVersions: [],
    diem: { loi: null, giaiDieu: null, caoTrao: null, camXuc: null, thuHut: null } };
  N.dongBoTuGitHub(k, { schema: 2, bai: [goc] });
  N.datDiem(k.bai[0], 'cauChuyen', 5);
  N.dongBoTuGitHub(k, { schema: 2, bai: [Object.assign({}, goc, { ngayCapNhat: '2026-11-20T00:00:00.000Z', tieude: 'mới' })] });
  assert.equal(k.bai[0].diem.cauChuyen, 5);
  assert.ok(!k.bai[0].xungDotGitHub || !('diem' in k.bai[0].xungDotGitHub));
});

test('Style Suno có phiên bản riêng: không trùng, chọn lại được, promptSuno luôn là bản đang dùng', () => {
  const kho = N.khoRong(); const b = N.taoBai(kho, { ten: 'A', loi: 'x', style: 'pop soul' });
  assert.equal(b.styleVersions.length, 1); assert.equal(b.styleChon, 1); assert.equal(b.promptSuno, 'pop soul');
  assert.equal(N.themStyle(b, 'pop soul  '), null);
  assert.equal(N.themStyle(b, 'acoustic pop rock'), 2);
  assert.equal(b.promptSuno, 'acoustic pop rock');
  assert.equal(b.loiVersions.length, 1, 'sửa Style không tạo bản lời mới');
  N.themNhac(b, 'https://suno.com/song/1'); assert.equal(b.nhacVersions[0].styleV, 2);
  N.chonStyle(b, 1); assert.equal(b.promptSuno, 'pop soul'); assert.equal(b.styleChon, 1);
  assert.equal(N.themStyle(b, 'acoustic pop rock'), null); assert.equal(b.styleChon, 2, 'nhập lại nội dung cũ thì chọn lại bản đó');
});

test('Style: bài cũ chỉ có promptSuno được chuẩn hóa thành v1, chuẩn hóa lại không đổi', () => {
  const raw = { schema: 2, nextId: 2, bai: [{ id: 'NPT-0001', ten: 'A', series: 'tuoi-tho', trangThai: 2, promptSuno: 'ballad', ngayTao: '2026-11-19T00:00:00.000Z', ngayCapNhat: '2026-11-19T00:00:00.000Z', loiVersions: [], nhacVersions: [], lichSu: [] }] };
  const a = N.chuanHoaKho(raw).kho, b = N.chuanHoaKho(JSON.parse(JSON.stringify(a))).kho;
  assert.deepEqual(a.bai[0].styleVersions.map(x => [x.v, x.style]), [[1, 'ballad']]);
  assert.equal(a.bai[0].styleChon, 1);
  assert.deepEqual(b.bai[0].styleVersions, a.bai[0].styleVersions);
  assert.equal(b.bai[0].ngayCapNhat, '2026-11-19T00:00:00.000Z');
});

test('Style đồng bộ GitHub: nhận lịch sử Style đúng số bản; Tí sửa thẳng promptSuno thì thành bản mới', () => {
  const baiGH = (extra) => Object.assign({ id: 'NPT-0002', ten: 'Yêu', series: 'tuoi-tho', trangThai: 3, ngayTao: '2026-11-19T00:00:00.000Z', loiVersions: [{ v: 3, loi: 'lời', nguon: 'github', luc: '2026-11-21T00:00:00.000Z', ghiChu: '' }], loiChon: 3, nhacVersions: [], lichSu: [] }, extra);
  // trình duyệt cũ chỉ có promptSuno (chưa có styleVersions)
  const kho = N.chuanHoaKho({ schema: 2, nextId: 3, bai: [baiGH({ promptSuno: 'rock V4', ngayCapNhat: '2026-11-22T00:00:00.000Z' })] }).kho;
  kho.bai[0].remoteId = 'NPT-0002';
  const gh = { schema: 2, nextId: 3, bai: [baiGH({ promptSuno: 'rock V4', ngayCapNhat: '2026-11-22T01:00:00.000Z', styleChon: 4,
    styleVersions: [{ v: 1, style: 'soul V1', nguon: 'github', luc: 'a', ghiChu: '' }, { v: 4, style: 'rock V4', nguon: 'github', luc: 'b', ghiChu: 'duyệt' }] })] };
  N.dongBoTuGitHub(kho, gh);
  assert.deepEqual(kho.bai[0].styleVersions.map(x => x.v), [1, 4]); assert.equal(kho.bai[0].styleChon, 4);
  N.dongBoTuGitHub(kho, gh); assert.equal(kho.bai[0].styleVersions.length, 2, 'tải lại không nhân đôi');
  const gh2 = JSON.parse(JSON.stringify(gh)); gh2.bai[0].promptSuno = 'rock V5'; gh2.bai[0].ngayCapNhat = '2026-11-23T00:00:00.000Z';
  N.dongBoTuGitHub(kho, gh2);
  assert.equal(kho.bai[0].promptSuno, 'rock V5'); assert.equal(kho.bai[0].styleChon, 5);
  assert.deepEqual(kho.bai[0].styleVersions.map(x => x.style), ['soul V1', 'rock V4', 'rock V5']);
});
