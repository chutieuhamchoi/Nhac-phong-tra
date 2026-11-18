/* Nhạc Phòng Trà Studio · lớp dữ liệu (giai đoạn 1)
   Không phụ thuộc giao diện, chạy được trong trình duyệt và Node (để kiểm thử).
   Nguyên tắc: không ghi đè, không xóa dữ liệu cũ; mọi bản cũ được giữ lại trong trường _v1. */
(function (root) {
  'use strict';

  const SCHEMA = 2;
  const TRANG_THAI = ['Ý tưởng', 'Đang viết lời', 'Đã duyệt lời', 'Đang tạo nhạc', 'Đang đánh giá', 'Đã duyệt phát hành', 'Đã đăng YouTube'];
  const TT = { Y_TUONG: 0, VIET_LOI: 1, DUYET_LOI: 2, TAO_NHAC: 3, DANH_GIA: 4, DUYET_PHAT_HANH: 5, DA_DANG: 6 };
  const SERIES = ['tuoi-tho', 'dem-mua', 'ca-phe-sang', 'mua'];
  const TIEU_CHI = [['loi', 'Lời ca'], ['giaiDieu', 'Giai điệu'], ['caoTrao', 'Cao trào'], ['camXuc', 'Cảm xúc'], ['thuHut', 'Khả năng thu hút']];
  const DIEM_TOI_THIEU = 18;          // trên tổng 25
  const SO_TUAN = 15;
  // trạng thái kho cũ (v1): 0 Nháp lời, 1 Đã duyệt lời, 2 Đã tạo Suno, 3 Đã đăng
  const TT_CU = ['Nháp lời', 'Đã duyệt lời', 'Đã tạo Suno', 'Đã đăng'];
  const MAP_TT_CU = [TT.VIET_LOI, TT.DUYET_LOI, TT.DANH_GIA, TT.DA_DANG];

  const now = () => new Date().toISOString();
  const fmtId = n => 'NPT-' + String(n).padStart(4, '0');
  const isNptId = s => /^NPT-\d{4,}$/.test(String(s || ''));
  const idNum = s => isNptId(s) ? parseInt(String(s).slice(4), 10) : 0;
  const str = v => (v == null ? '' : String(v));
  const clone = o => JSON.parse(JSON.stringify(o));
  const boDau = s => str(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

  function khoRong() { return { schema: SCHEMA, capNhat: now(), nextId: 1, bai: [] }; }
  function diemRong() { const d = {}; TIEU_CHI.forEach(([k]) => d[k] = null); return d; }

  function capId(kho) {
    const max = kho.bai.reduce((m, b) => Math.max(m, idNum(b.id)), 0);
    const n = Math.max(kho.nextId || 1, max + 1);
    kho.nextId = n + 1;
    return fmtId(n);
  }

  /* ---------- bài mới ---------- */
  function taoBai(kho, d = {}) {
    const t = now();
    const b = {
      id: capId(kho), loai: d.loai === 'playlist' ? 'playlist' : 'bai',
      ten: str(d.ten).trim() || 'Bài chưa đặt tên',
      series: SERIES.includes(d.series) ? d.series : SERIES[0],
      tuan: chuanTuan(d.tuan) || 1,
      ngayTao: t, ngayCapNhat: t,
      trangThai: Number.isInteger(d.trangThai) ? d.trangThai : (str(d.loi).trim() ? TT.VIET_LOI : TT.Y_TUONG),
      lichSu: [],
      loiVersions: [], loiChon: null,
      promptSuno: str(d.promptSuno ?? d.style),
      nhacVersions: [], nhacChon: null,
      diem: diemRong(),
      thumbnail: str(d.thumbnail), tieude: str(d.tieude), mota: str(d.mota), shorts: str(d.shorts),
      tag: chuanTag(d.tag), linkYoutube: str(d.linkYoutube), ngayPhatHanh: str(d.ngayPhatHanh), ghiChu: str(d.ghiChu),
      promptChatGPT: str(d.promptChatGPT)
    };
    b.lichSu.push({ tu: null, den: b.trangThai, luc: t, ghiChu: 'Tạo bài' });
    if (str(d.loi).trim()) themLoi(b, d.loi, d.nguon || 'chatgpt', d.ghiChuLoi || '');
    kho.bai.unshift(b);
    return b;
  }
  const chuanTuan = v => { const n = parseInt(v, 10); return n >= 1 && n <= SO_TUAN ? n : null; };
  const chuanTag = v => Array.isArray(v) ? v.map(x => str(x).trim()).filter(Boolean).join(' ') : str(v).trim();

  /* ---------- phiên bản ---------- */
  function themLoi(b, loi, nguon = 'tay', ghiChu = '') {
    const text = str(loi).replace(/\r/g, '');
    const cur = loiHienTai(b);
    if (cur !== null && cur === text) return null;                  // không tạo bản trùng
    const v = (b.loiVersions.reduce((m, x) => Math.max(m, x.v), 0)) + 1;
    b.loiVersions.push({ v, loi: text, nguon, luc: now(), ghiChu: str(ghiChu) });
    b.loiChon = v; cham(b);
    return v;
  }
  function loiHienTai(b) {
    const x = b.loiVersions.find(x => x.v === b.loiChon) || b.loiVersions[b.loiVersions.length - 1];
    return x ? x.loi : null;
  }
  function chonLoi(b, v) { if (b.loiVersions.some(x => x.v === v)) { b.loiChon = v; cham(b); } }
  function themNhac(b, link, ghiChu = '') {
    const v = (b.nhacVersions.reduce((m, x) => Math.max(m, x.v), 0)) + 1;
    b.nhacVersions.push({ v, link: str(link).trim(), ghiChu: str(ghiChu), luc: now(), loiV: b.loiChon });
    cham(b); return v;
  }
  function chonNhac(b, v) { if (v === null || b.nhacVersions.some(x => x.v === v)) { b.nhacChon = v; cham(b); } }

  /* ---------- trạng thái ---------- */
  function doiTrangThai(b, den, ghiChu = '') {
    den = parseInt(den, 10);
    if (!(den >= 0 && den < TRANG_THAI.length) || den === b.trangThai) return false;
    b.lichSu.push({ tu: b.trangThai, den, luc: now(), ghiChu: str(ghiChu) });
    b.trangThai = den;
    if (den === TT.DA_DANG && !b.ngayPhatHanh) b.ngayPhatHanh = now().slice(0, 10);
    cham(b); return true;
  }
  /** Cảnh báo (không chặn) trước khi chuyển trạng thái. */
  function canhBaoChuyen(b, den) {
    const w = [];
    if (den >= TT.DUYET_PHAT_HANH && b.loai !== 'playlist') {
      const t = tongDiem(b);
      if (t === null) w.push('Bài chưa được chấm đủ 5 tiêu chí.');
      else if (t < DIEM_TOI_THIEU) w.push(`Tổng điểm ${t}/25, dưới mức tối thiểu ${DIEM_TOI_THIEU}/25.`);
      if (b.nhacVersions.length && b.nhacChon === null) w.push('Chưa chọn phiên bản nhạc để phát hành.');
      if (!b.nhacVersions.length) w.push('Chưa có phiên bản nhạc Suno nào.');
    }
    if (den === TT.DA_DANG && !b.linkYoutube) w.push('Chưa nhập link YouTube.');
    return w;
  }

  /* ---------- điểm ---------- */
  function datDiem(b, k, v) {
    if (!TIEU_CHI.some(([x]) => x === k)) return;
    const n = v === '' || v == null ? null : parseInt(v, 10);
    b.diem[k] = n >= 1 && n <= 5 ? n : null; cham(b);
  }
  function tongDiem(b) {
    const vals = TIEU_CHI.map(([k]) => b.diem?.[k]);
    return vals.every(x => Number.isInteger(x)) ? vals.reduce((a, c) => a + c, 0) : null;
  }
  function cham(b) { b.ngayCapNhat = now(); }

  /* ---------- chuyển đổi dữ liệu cũ ---------- */
  function laBaiCu(o) { return o && typeof o === 'object' && !Array.isArray(o.loiVersions); }
  function chuyenBaiCu(o, kho) {
    const t = now();
    const ngayTao = /^\d{4}-\d{2}-\d{2}/.test(str(o.ngay)) ? str(o.ngay).slice(0, 10) + 'T00:00:00' : t;
    const tt = Number.isInteger(o.tt) && MAP_TT_CU[o.tt] !== undefined ? MAP_TT_CU[o.tt] : TT.VIET_LOI;
    const b = {
      id: isNptId(o.id) && !kho.bai.some(x => x.id === o.id) ? o.id : capId(kho),
      loai: o.loai === 'playlist' ? 'playlist' : 'bai',
      ten: str(o.ten).trim() || 'Bài chưa đặt tên',
      series: SERIES.includes(o.series) ? o.series : SERIES[0],
      tuan: chuanTuan(o.tuan) || 1,
      ngayTao, ngayCapNhat: t,
      trangThai: tt,
      lichSu: [{ tu: null, den: tt, luc: t, ghiChu: `Chuyển từ kho cũ (trạng thái cũ: ${TT_CU[o.tt] ?? 'không rõ'})` }],
      loiVersions: str(o.loi).trim() ? [{ v: 1, loi: str(o.loi), nguon: 'kho-cu', luc: ngayTao, ghiChu: '' }] : [],
      loiChon: str(o.loi).trim() ? 1 : null,
      promptSuno: str(o.style),
      nhacVersions: [], nhacChon: null,
      diem: diemRong(),
      thumbnail: '', tieude: str(o.tieude), mota: str(o.mota), shorts: str(o.shorts), tag: chuanTag(o.tag),
      linkYoutube: str(o.link), ngayPhatHanh: tt === TT.DA_DANG ? ngayTao.slice(0, 10) : '', ghiChu: '',
      promptChatGPT: str(o.prompt),
      legacyId: str(o.id),
      _v1: clone(o)                                   // bản gốc, không bao giờ xóa
    };
    return b;
  }
  /** Bổ sung trường còn thiếu cho bài v2 (giữ nguyên mọi trường lạ). */
  function chuanBaiV2(o, kho) {
    const b = Object.assign({}, o);
    if (!isNptId(b.id) || kho.bai.some(x => x.id === b.id)) { if (b.id) b.legacyId = b.legacyId || str(b.id); b.id = capId(kho); }
    b.loai = b.loai === 'playlist' ? 'playlist' : 'bai';
    b.ten = str(b.ten).trim() || 'Bài chưa đặt tên';
    if (!SERIES.includes(b.series)) b.series = SERIES[0];
    b.tuan = chuanTuan(b.tuan) || 1;
    b.ngayTao = b.ngayTao || now(); b.ngayCapNhat = b.ngayCapNhat || b.ngayTao;
    if (!(b.trangThai >= 0 && b.trangThai < TRANG_THAI.length)) b.trangThai = TT.Y_TUONG;
    b.lichSu = Array.isArray(b.lichSu) ? b.lichSu : [];
    b.loiVersions = Array.isArray(b.loiVersions) ? b.loiVersions : [];
    b.nhacVersions = Array.isArray(b.nhacVersions) ? b.nhacVersions : [];
    if (b.loiChon == null && b.loiVersions.length) b.loiChon = b.loiVersions[b.loiVersions.length - 1].v;
    if (b.nhacChon === undefined) b.nhacChon = null;
    b.diem = Object.assign(diemRong(), b.diem || {});
    ['promptSuno', 'thumbnail', 'tieude', 'mota', 'shorts', 'tag', 'linkYoutube', 'ngayPhatHanh', 'ghiChu', 'promptChatGPT']
      .forEach(k => b[k] = str(b[k]));
    return b;
  }
  /**
   * Nhận mọi dạng kho: mảng bài cũ, {bai:[...]} cũ, hoặc kho v2.
   * Trả về {kho, baoCao:{tong, tuCu, v2, loi:[]}}.
   */
  function chuanHoaKho(raw, idBatDau = 1) {
    const kho = khoRong(); kho.nextId = idBatDau; const baoCao = { tong: 0, tuCu: 0, v2: 0, loi: [] };
    let ds;
    if (Array.isArray(raw)) ds = raw;
    else if (raw && Array.isArray(raw.bai)) { ds = raw.bai; if (raw.nextId > 0) kho.nextId = Math.max(kho.nextId, raw.nextId); }
    else if (raw == null) ds = [];
    else throw new Error('Không nhận ra cấu trúc kho (cần mảng bài hoặc đối tượng có trường "bai").');
    ds.forEach((o, i) => {
      if (!o || typeof o !== 'object') { baoCao.loi.push(`Mục ${i + 1} không phải bài hát, đã bỏ qua.`); return; }
      const b = laBaiCu(o) ? (baoCao.tuCu++, chuyenBaiCu(o, kho)) : (baoCao.v2++, chuanBaiV2(o, kho));
      kho.bai.push(b); baoCao.tong++;
    });
    kho.nextId = Math.max(kho.nextId, kho.bai.reduce((m, b) => Math.max(m, idNum(b.id)), 0) + 1);
    return { kho, baoCao };
  }

  /** Gộp bài từ nguồn ngoài vào kho: trùng ID thì bỏ qua (không ghi đè). */
  function gopKho(kho, nguon) {
    const kq = { them: 0, boQua: [] };
    const ds = Array.isArray(nguon) ? nguon : Array.isArray(nguon?.bai) ? nguon.bai : null;
    if (!ds) throw new Error('Không nhận ra cấu trúc kho (cần mảng bài hoặc đối tượng có trường "bai").');
    const daCo = o => {
      const id = str(o?.id), legacy = str(o?.legacyId);
      return kho.bai.some(x => (id && (x.id === id || x.legacyId === id)) || (legacy && (x.id === legacy || x.legacyId === legacy)));
    };
    const moi = ds.filter(o => { if (o && typeof o === 'object' && daCo(o)) { kq.boQua.push(`${o.id} · ${str(o.ten)}`); return false; } return true; });
    const { kho: k2 } = chuanHoaKho(moi, Math.max(kho.nextId, kho.bai.reduce((m, b) => Math.max(m, idNum(b.id)), 0) + 1));
    k2.bai.forEach(b => { kho.bai.push(b); kq.them++; });
    kho.nextId = Math.max(kho.nextId, kho.bai.reduce((m, b) => Math.max(m, idNum(b.id)), 0) + 1);
    return kq;
  }

  /* ---------- nhập kết quả ChatGPT ---------- */
  const TRUONG_NHAP = {
    loai: 'Loại', ten: 'Tên bài', series: 'Series', tuan: 'Tuần', loi: 'Lời bài hát', style: 'Prompt Suno',
    tieude: 'Tiêu đề YouTube', mota: 'Mô tả YouTube', shorts: 'Đoạn cho Shorts', tag: 'Hashtag', ghiChu: 'Ghi chú'
  };
  /** Tách khối JSON khỏi câu trả lời (có hoặc không có ```json). */
  function tachJson(text) {
    const t = str(text).trim();
    if (!t) throw new Error('Chưa có nội dung để kiểm tra.');
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const s = (m ? m[1] : t).replace(/[“”]/g, '"').trim();
    const thu = [s];
    if (!/^[[{]/.test(s)) {                       // có lời dẫn trước/sau JSON
      const a = s.search(/[[{]/), b = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
      if (a >= 0 && b > a) thu.unshift(s.slice(a, b + 1));
    }
    let err;
    for (const x of thu) { try { return JSON.parse(x); } catch (e) { err = err || e; } }
    throw new Error('JSON không hợp lệ: ' + err.message.replace(/^JSON\.parse: /, ''));
  }
  /** Kiểm tra một bài nhập từ ChatGPT. Trả về {ok, loi[], canhBao[], data}. */
  function kiemTraNhap(obj, macDinh = {}) {
    const loi = [], canhBao = [], data = {};
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, loi: ['Cần một đối tượng JSON {…} cho một bài.'], canhBao, data };
    Object.keys(obj).forEach(k => { if (!(k in TRUONG_NHAP)) canhBao.push(`Trường lạ "${k}" sẽ được bỏ qua.`); });
    for (const k of Object.keys(TRUONG_NHAP)) {
      const v = obj[k];
      if (v != null && typeof v === 'object' && !(k === 'tag' && Array.isArray(v))) loi.push(`"${k}" phải là chữ, không phải ${Array.isArray(v) ? 'mảng' : 'đối tượng'}.`);
    }
    data.loai = obj.loai === 'playlist' ? 'playlist' : 'bai';
    if (obj.loai != null && !['bai', 'playlist'].includes(obj.loai)) canhBao.push(`"loai" = "${obj.loai}" không hợp lệ, coi là "bai".`);
    data.ten = str(obj.ten).trim();
    if (!data.ten) loi.push('Thiếu "ten" (tên bài).'); else if (data.ten.length > 150) loi.push('"ten" dài quá 150 ký tự.');
    data.series = obj.series == null || obj.series === '' ? macDinh.series : str(obj.series).trim();
    if (!SERIES.includes(data.series)) loi.push(`"series" = "${obj.series}" không hợp lệ. Chỉ nhận: ${SERIES.join(', ')}.`);
    if (obj.tuan == null || obj.tuan === '') { data.tuan = macDinh.tuan; canhBao.push(`Không có "tuan", dùng tuần ${macDinh.tuan} đang chọn.`); }
    else { data.tuan = chuanTuan(obj.tuan); if (!data.tuan) loi.push(`"tuan" phải là số từ 1 đến ${SO_TUAN}.`); }
    data.loi = str(obj.loi).replace(/\r/g, '').replace(/\\n/g, '\n').trim();
    if (data.loai === 'bai' && !data.loi) loi.push('Thiếu "loi" (lời bài hát).');
    if (data.loai === 'bai' && data.loi && !/\[(verse|chorus|intro|bridge|outro|pre-chorus)/i.test(data.loi)) canhBao.push('Lời không có nhãn cấu trúc kiểu [Verse 1], [Chorus] cho Suno.');
    data.style = str(obj.style).trim();
    if (data.style.length > 1000) loi.push('"style" dài quá 1000 ký tự.'); else if (data.style.length > 200) canhBao.push(`"style" dài ${data.style.length} ký tự, nên dưới 200.`);
    data.tieude = str(obj.tieude).trim();
    if (data.tieude.length > 100) loi.push(`"tieude" dài ${data.tieude.length} ký tự, YouTube chỉ cho tối đa 100.`);
    data.mota = str(obj.mota).trim();
    if (data.mota.length > 5000) loi.push('"mota" dài quá 5000 ký tự (giới hạn YouTube).');
    data.shorts = str(obj.shorts).trim();
    data.tag = chuanTag(obj.tag);
    data.ghiChu = str(obj.ghiChu).trim();
    if (/\b(sk-[A-Za-z0-9]{10,}|api[_-]?key)/i.test(JSON.stringify(obj))) loi.push('Nội dung có vẻ chứa API key, không lưu.');
    return { ok: loi.length === 0, loi, canhBao, data };
  }
  /** Từ chuỗi người dùng dán → danh sách kết quả kiểm tra (hỗ trợ 1 bài, mảng, hoặc {bai:[…]}). */
  function phanTichNhap(text, macDinh) {
    const obj = tachJson(text);
    const ds = Array.isArray(obj) ? obj : Array.isArray(obj?.bai) ? obj.bai : [obj];
    if (!ds.length) throw new Error('JSON không có bài nào.');
    return ds.map(o => kiemTraNhap(o, macDinh));
  }
  function timBaiTrung(kho, ten) {
    const t = boDau(ten); return t ? kho.bai.find(b => boDau(b.ten) === t) || null : null;
  }
  /**
   * Áp dữ liệu đã kiểm tra vào kho.
   * - dich = null → tạo bài mới.
   * - dich = bài có sẵn → lời thành phiên bản mới; trường khác chỉ điền nếu đang trống
   *   hoặc nằm trong danhSachGhiDe.
   */
  function apNhap(kho, data, dich = null, danhSachGhiDe = [], promptChatGPT = '') {
    if (!dich) {
      return taoBai(kho, { ...data, promptSuno: data.style, nguon: 'chatgpt', promptChatGPT, ghiChuLoi: data.ghiChu });
    }
    if (data.loi) themLoi(dich, data.loi, 'chatgpt', data.ghiChu);
    const map = { style: 'promptSuno', tieude: 'tieude', mota: 'mota', shorts: 'shorts', tag: 'tag' };
    for (const [k, f] of Object.entries(map)) {
      if (!data[k]) continue;
      if (!dich[f] || danhSachGhiDe.includes(k)) dich[f] = data[k];
    }
    if (promptChatGPT) dich.promptChatGPT = promptChatGPT;
    if (dich.trangThai === TT.Y_TUONG && data.loi) doiTrangThai(dich, TT.VIET_LOI, 'Nhận lời từ ChatGPT');
    cham(dich); return dich;
  }
  /** Các trường sẽ xung đột khi nhập vào bài có sẵn. */
  function xungDot(dich, data) {
    const map = { style: 'promptSuno', tieude: 'tieude', mota: 'mota', shorts: 'shorts', tag: 'tag' };
    return Object.entries(map).filter(([k, f]) => data[k] && dich[f] && dich[f].trim() !== data[k].trim()).map(([k]) => k);
  }

  /* ---------- so sánh hai phiên bản lời (theo dòng, LCS) ---------- */
  function soSanh(a, b) {
    const A = str(a).split('\n'), B = str(b).split('\n');
    const n = A.length, m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) { out.push({ t: '=', s: A[i] }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) out.push({ t: '-', s: A[i++] });
      else out.push({ t: '+', s: B[j++] });
    }
    while (i < n) out.push({ t: '-', s: A[i++] });
    while (j < m) out.push({ t: '+', s: B[j++] });
    return out;
  }

  /* ---------- sao lưu ---------- */
  function goiSaoLuu(kho, tienDo) {
    return { loai: 'npt-sao-luu', schema: SCHEMA, luc: now(), kho: clone(kho), tienDoLich: clone(tienDo || {}) };
  }
  /** Đọc file sao lưu hoặc file kho; trả về {kho, tienDoLich|null, baoCao}. */
  function docSaoLuu(raw) {
    if (raw && raw.loai === 'npt-sao-luu') {
      const { kho, baoCao } = chuanHoaKho(raw.kho);
      return { kho, tienDoLich: raw.tienDoLich && typeof raw.tienDoLich === 'object' ? raw.tienDoLich : null, baoCao };
    }
    const { kho, baoCao } = chuanHoaKho(raw);
    return { kho, tienDoLich: null, baoCao };
  }
  function xuatKho(kho) { return Object.assign(clone(kho), { schema: SCHEMA, capNhat: now() }); }

  root.NPT = {
    SCHEMA, TRANG_THAI, TT, SERIES, TIEU_CHI, DIEM_TOI_THIEU, SO_TUAN, TRUONG_NHAP,
    khoRong, taoBai, themLoi, loiHienTai, chonLoi, themNhac, chonNhac, doiTrangThai, canhBaoChuyen,
    datDiem, tongDiem, chuanHoaKho, gopKho, tachJson, kiemTraNhap, phanTichNhap, timBaiTrung, apNhap, xungDot,
    soSanh, goiSaoLuu, docSaoLuu, xuatKho, boDau, fmtId
  };
})(typeof window !== 'undefined' ? window : globalThis);
