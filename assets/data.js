/* Nhạc Phòng Trà Studio · lớp dữ liệu (giai đoạn 1)
   Không phụ thuộc giao diện, chạy được trong trình duyệt và Node (để kiểm thử).
   Nguyên tắc: không ghi đè, không xóa dữ liệu cũ; mọi bản cũ được giữ lại trong trường _v1. */
(function (root) {
  'use strict';

  const SCHEMA = 2;
  const TRANG_THAI = ['Ý tưởng', 'Đang viết lời', 'Đã duyệt lời', 'Đang tạo nhạc', 'Đang đánh giá', 'Đã duyệt phát hành', 'Đã đăng YouTube'];
  const TT = { Y_TUONG: 0, VIET_LOI: 1, DUYET_LOI: 2, TAO_NHAC: 3, DANH_GIA: 4, DUYET_PHAT_HANH: 5, DA_DANG: 6 };
  // Danh sách mặc định; trang gọi datSeries() với id trong data/chu-de.json khi tải xong.
  const SERIES = ['tuoi-tho', 'dem-mua', 'ca-phe-sang', 'mua'];
  /** Cập nhật danh sách series hợp lệ từ cấu hình (giữ nguyên tham chiếu mảng). Bỏ qua nếu cấu hình rỗng. */
  function datSeries(ids) {
    const ds = (Array.isArray(ids) ? ids : []).map(x => str(x).trim()).filter(Boolean);
    if (ds.length) SERIES.splice(0, SERIES.length, ...new Set(ds));
    return SERIES;
  }
  // Phiếu duyệt (đa sắc, 19/11/2026): mặc định 4 tiêu chí × 5 điểm; trang gọi datTieuChi() với data/chu-de.json.
  // Mỗi mục: [khóa, tên, điểm tối đa]. Khóa sinh từ tên (Câu chuyện → cauChuyen) để dữ liệu ổn định.
  const TIEU_CHI = [['cauChuyen', 'Câu chuyện', 5], ['diemCham', 'Điểm chạm', 5], ['giaiDieu', 'Giai điệu', 5], ['banSac', 'Bản sắc', 5]];
  const NGUONG = { deXuatDuyet: 17, canChinhSua: 14 };   // ≥17 đề xuất duyệt · 14–16 cần chỉnh sửa · <14 viết lại
  // Thang cũ (trước 19/11/2026, 5 tiêu chí / 25 điểm): điểm đã chấm được chuyển sang trường diemCu, không xóa.
  const TIEU_CHI_CU = { loi: 'Lời ca', caoTrao: 'Cao trào', camXuc: 'Cảm xúc', thuHut: 'Khả năng thu hút' };
  const khoaTieuChi = ten => boDau(ten).replace(/[^a-z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
  /** Đặt phiếu duyệt từ chu-de.json (tieuChiDuyet, nguongDuyet). Giữ nguyên tham chiếu mảng/đối tượng. */
  function datTieuChi(ds, nguong) {
    const moi = (Array.isArray(ds) ? ds : []).map(x => [khoaTieuChi(x && x.ten), str(x && x.ten).trim(), parseInt(x && x.diemToiDa, 10) || 5])
      .filter(([k, t]) => k && t);
    if (moi.length) TIEU_CHI.splice(0, TIEU_CHI.length, ...moi);
    if (nguong && Number.isFinite(+nguong.deXuatDuyet)) NGUONG.deXuatDuyet = +nguong.deXuatDuyet;
    if (nguong && Number.isFinite(+nguong.canChinhSua)) NGUONG.canChinhSua = +nguong.canChinhSua;
    return TIEU_CHI;
  }
  const diemToiDa = () => TIEU_CHI.reduce((a, [, , m]) => a + m, 0);
  /** Xếp loại theo tổng điểm: {muc: 'duyet'|'sua'|'viet-lai'|null, nhan}. */
  function xepLoai(t) {
    if (t === null || t === undefined) return { muc: null, nhan: `Chấm đủ ${TIEU_CHI.length} tiêu chí` };
    if (t >= NGUONG.deXuatDuyet) return { muc: 'duyet', nhan: 'Đề xuất duyệt' };
    if (t >= NGUONG.canChinhSua) return { muc: 'sua', nhan: 'Cần chỉnh sửa' };
    return { muc: 'viet-lai', nhan: 'Viết lại' };
  }
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
      promptSuno: '', styleVersions: [], styleChon: null, caiDatSuno: chuanCaiDat(d.caiDatSuno),
      nhacVersions: [], nhacChon: null,
      diem: diemRong(),
      thumbnail: str(d.thumbnail), tieude: str(d.tieude), mota: str(d.mota), shorts: str(d.shorts),
      tag: chuanTag(d.tag), linkYoutube: str(d.linkYoutube), ngayPhatHanh: str(d.ngayPhatHanh), ghiChu: str(d.ghiChu),
      promptChatGPT: str(d.promptChatGPT),
      shortVideos: []
    };
    b.lichSu.push({ tu: null, den: b.trangThai, luc: t, ghiChu: 'Tạo bài' });
    if (str(d.loi).trim()) themLoi(b, d.loi, d.nguon || 'chatgpt', d.ghiChuLoi || '');
    if (str(d.promptSuno ?? d.style).trim()) themStyle(b, d.promptSuno ?? d.style, d.nguon || 'chatgpt');
    kho.bai.unshift(b);
    return b;
  }
  const chuanTuan = v => { const n = parseInt(v, 10); return n >= 1 && n <= SO_TUAN ? n : null; };
  const chuanTag = v => Array.isArray(v) ? v.map(x => str(x).trim()).filter(Boolean).join(' ') : str(v).trim();

  /* ---------- thông số Suno (Advanced, chốt 22/11/2026) ----------
     b.caiDatSuno: thông số đang dùng/đề xuất cho bài. Mỗi bản nhạc lưu ảnh chụp ở nhacVersions[].caiDat.
     Giá trị chưa biết để null hoặc '' (không đoán). */
  const CAI_DAT_SUNO = [
    // [khóa, nhãn hiển thị, kiểu]
    ['model', 'Phiên bản model', 'chu'], ['giong', 'Vocal Gender', 'giong'], ['thoiLuong', 'Duration', 'thoiLuong'],
    ['maxMode', 'Max Mode', 'bat'], ['weirdness', 'Weirdness', 'phanTram'], ['styleInfluence', 'Style Influence', 'phanTram'],
    ['variety', 'Variety', 'chu'], ['personalize', 'Personalize', 'bat']
  ];
  function caiDatRong() { return { model: '', giong: '', thoiLuong: '', maxMode: null, weirdness: null, styleInfluence: null, variety: '', personalize: null }; }
  function chuanCaiDat(o) {
    const d = caiDatRong(); if (!o || typeof o !== 'object' || Array.isArray(o)) return d;
    const bat = v => v === true || /^(on|bật|bat|true|1|có|co)$/i.test(str(v).trim()) ? true
      : v === false || /^(off|tắt|tat|false|0|không|khong)$/i.test(str(v).trim()) ? false : null;
    const pt = v => { const n = parseInt(str(v).replace('%', ''), 10); return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null; };
    d.model = str(o.model).trim();
    const g = boDau(o.giong ?? o.vocalGender);
    d.giong = /^(nam|male|m)$/.test(g) ? 'nam' : /^(nu|female|f)$/.test(g) ? 'nu' : '';
    const t = str(o.thoiLuong ?? o.duration).trim().toLowerCase();
    if (/^(auto|tu dong|tự động)$/.test(t)) d.thoiLuong = 'auto';
    else if (/^\d+:\d{2}$/.test(t)) d.thoiLuong = t;
    else if (/^\d+$/.test(t) && +t > 0) d.thoiLuong = `${Math.floor(+t / 60)}:${String(+t % 60).padStart(2, '0')}`;
    d.maxMode = bat(o.maxMode); d.personalize = bat(o.personalize);
    d.weirdness = pt(o.weirdness); d.styleInfluence = pt(o.styleInfluence);
    d.variety = str(o.variety).trim();
    return d;
  }
  const caiDatTrong = cd => JSON.stringify(chuanCaiDat(cd)) === JSON.stringify(caiDatRong());
  /** Một dòng tóm tắt, VD: "v6 · Nữ · Duration Auto · Max Off · Weirdness 58% · Style Influence 46% · Variety Normal · Personalize Off". */
  function tomTatCaiDat(cd) {
    const d = chuanCaiDat(cd), o = [];
    if (d.model) o.push(d.model);
    if (d.giong) o.push(d.giong === 'nam' ? 'Nam' : 'Nữ');
    if (d.thoiLuong) o.push('Duration ' + (d.thoiLuong === 'auto' ? 'Auto' : d.thoiLuong));
    if (d.maxMode !== null) o.push('Max ' + (d.maxMode ? 'On' : 'Off'));
    if (d.weirdness !== null) o.push(`Weirdness ${d.weirdness}%`);
    if (d.styleInfluence !== null) o.push(`Style Influence ${d.styleInfluence}%`);
    if (d.variety) o.push('Variety ' + d.variety);
    if (d.personalize !== null) o.push('Personalize ' + (d.personalize ? 'On' : 'Off'));
    return o.join(' · ');
  }
  function datCaiDat(b, o) { const moi = chuanCaiDat(Object.assign({}, b.caiDatSuno, o)); if (JSON.stringify(moi) !== JSON.stringify(b.caiDatSuno)) { b.caiDatSuno = moi; cham(b); } }

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
  function themNhac(b, link, ghiChu = '', caiDat) {
    const v = (b.nhacVersions.reduce((m, x) => Math.max(m, x.v), 0)) + 1;
    const cd = chuanCaiDat(caiDat === undefined ? b.caiDatSuno : caiDat);
    b.nhacVersions.push({ v, link: str(link).trim(), ghiChu: str(ghiChu), luc: now(), loiV: b.loiChon, styleV: b.styleChon ?? null, caiDat: caiDatTrong(cd) ? null : cd });
    cham(b); return v;
  }
  function chonNhac(b, v) { if (v === null || b.nhacVersions.some(x => x.v === v)) { b.nhacChon = v; cham(b); } }

  /* Style Suno có phiên bản riêng (chốt 22/11/2026). promptSuno luôn là nội dung bản đang chọn (styleChon). */
  const chuanStyle = s => str(s).replace(/\r/g, '').trim();
  function styleHienTai(b) {
    const x = (b.styleVersions || []).find(x => x.v === b.styleChon) || (b.styleVersions || []).at(-1);
    return x ? x.style : null;
  }
  /** Thêm bản Style mới (trùng nội dung bản đã có thì chỉ chọn lại bản đó). Trả về số phiên bản mới, null nếu không thêm. */
  function themStyle(b, style, nguon = 'tay', ghiChu = '') {
    const text = chuanStyle(style); if (!text) return null;
    const da = b.styleVersions.find(x => x.style === text);
    if (da) { if (b.styleChon !== da.v || b.promptSuno !== text) { b.styleChon = da.v; b.promptSuno = text; cham(b); } return null; }
    const v = b.styleVersions.reduce((m, x) => Math.max(m, x.v), 0) + 1;
    b.styleVersions.push({ v, style: text, nguon, luc: now(), ghiChu: str(ghiChu) });
    b.styleChon = v; b.promptSuno = text; cham(b);
    return v;
  }
  function chonStyle(b, v) { const x = b.styleVersions.find(x => x.v === v); if (x) { b.styleChon = v; b.promptSuno = x.style; cham(b); } }
  /** Giữ promptSuno và styleVersions khớp nhau, không đổi ngày cập nhật (dùng khi chuẩn hóa và đồng bộ). */
  function dongBoStyle(b) {
    b.styleVersions = Array.isArray(b.styleVersions) ? b.styleVersions.filter(x => x && chuanStyle(x.style)) : [];
    if (b.styleChon === undefined) b.styleChon = null;
    const p = chuanStyle(b.promptSuno);
    if (!p) { const c = styleHienTai(b); if (c !== null) { b.promptSuno = c; b.styleChon = b.styleVersions.find(x => x.style === c).v; } return; }
    let x = b.styleVersions.find(x => x.style === p);
    if (!x) {                                               // promptSuno được sửa thẳng (vd. trên GitHub): ghi thành bản mới
      const v = b.styleVersions.reduce((m, y) => Math.max(m, y.v), 0) + 1;
      x = { v, style: p, nguon: 'tu-dong', luc: b.ngayCapNhat || b.ngayTao || now(), ghiChu: b.styleVersions.length ? 'Tự ghi nhận khi promptSuno được sửa trực tiếp' : '', tuDong: true };
      b.styleVersions.push(x);
    }
    b.styleChon = x.v; b.promptSuno = p;
  }

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
      if (t === null) w.push(`Bài chưa được chấm đủ ${TIEU_CHI.length} tiêu chí.`);
      else if (t < NGUONG.deXuatDuyet) w.push(`Tổng điểm ${t}/${diemToiDa()}, dưới mức đề xuất duyệt ${NGUONG.deXuatDuyet}/${diemToiDa()} (${xepLoai(t).nhan.toLowerCase()}).`);
      if (b.nhacVersions.length && b.nhacChon === null) w.push('Chưa chọn phiên bản nhạc để phát hành.');
      if (!b.nhacVersions.length) w.push('Chưa có phiên bản nhạc Suno nào.');
    }
    if (den === TT.DA_DANG && !b.linkYoutube) w.push('Chưa nhập link YouTube.');
    return w;
  }

  /* ---------- điểm ---------- */
  function datDiem(b, k, v) {
    const tc = TIEU_CHI.find(([x]) => x === k); if (!tc) return;
    const n = v === '' || v == null ? null : parseInt(v, 10);
    b.diem[k] = n >= 1 && n <= tc[2] ? n : null; cham(b);
  }
  function tongDiem(b) {
    const vals = TIEU_CHI.map(([k]) => b.diem?.[k]);
    return vals.every(x => Number.isInteger(x)) ? vals.reduce((a, c) => a + c, 0) : null;
  }
  function cham(b) { b.ngayCapNhat = now(); }
  /** Đưa điểm về phiếu hiện tại. Điểm thang cũ đã chấm (khác null) được chuyển sang b.diemCu một lần, không mất. */
  function chuanDiem(b) {
    const goc = b.diem && typeof b.diem === 'object' ? b.diem : {}, d = diemRong(), cu = {};
    Object.keys(goc).forEach(k => {
      if (k in d) d[k] = Number.isInteger(goc[k]) ? goc[k] : null;
      else if (goc[k] != null) cu[k] = goc[k];
    });
    if (Object.keys(cu).length && !b.diemCu) b.diemCu = Object.assign({ thang: 25, ghiChu: 'Điểm theo phiếu cũ 5 tiêu chí (trước 19/11/2026)' }, cu);
    return d;
  }

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
      promptSuno: str(o.style), caiDatSuno: caiDatRong(),
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
  /* ---------- Shorts (Tèo phụ trách, thêm 26/11/2026) ----------
     b.shortVideos: [{ ma, batDau, ketThuc, doan, file, linkDrive, tieude, mota, lichDang, linkYoutube, ngayDang, ghiChu, luc }]
     batDau/ketThuc: giây trên MP3 gốc. ngayDang rỗng = đã dựng, chưa đăng.
     mota: mô tả riêng của Short; lichDang: lịch đăng dự kiến hoặc giờ hẹn công khai "YYYY-MM-DDTHH:mm" (giờ VN), thêm 27/11/2026. */
  function chuanShorts(v) {
    return (Array.isArray(v) ? v : []).filter(x => x && typeof x === 'object').map(x => Object.assign({}, x, {
      ma: str(x.ma), doan: str(x.doan), file: str(x.file), linkDrive: str(x.linkDrive), tieude: str(x.tieude),
      mota: str(x.mota), lichDang: str(x.lichDang), linkYoutube: str(x.linkYoutube), ngayDang: str(x.ngayDang), ghiChu: str(x.ghiChu)
    }));
  }
  const shortDaDang = x => !!(x && x.ngayDang && x.linkYoutube);
  /** So sánh shortVideos bỏ qua trường thêm sau (mota, lichDang) khi bên kia còn trống — tránh báo xung đột giả khi nâng cấp. */
  function shortsGiongCot(a, b) {
    const bo = v => { try { return JSON.stringify(chuanShorts(v ? JSON.parse(v) : []).map(x => { const y = Object.assign({}, x); delete y.mota; delete y.lichDang; return y; })); } catch { return v; } };
    return bo(a) === bo(b);
  }
  const chuanShortsDB = v => { try { return v ? JSON.stringify(chuanShorts(JSON.parse(v))) : ''; } catch { return v; } };
  /** Tình trạng một Short: 'dang' đã công khai · 'hen' đã tải lên và hẹn giờ · 'lich' có lịch dự kiến · 'dung' mới dựng. */
  const lucDang = x => { const t = Date.parse(((x && x.lichDang) || '').slice(0, 16) + ':00+07:00'); return isNaN(t) ? null : t; };
  const shortTinhTrang = (x, bayGio = Date.now()) => {
    if (shortDaDang(x)) return lucDang(x) !== null && lucDang(x) > bayGio ? 'hen' : 'dang';   // đã hẹn giờ trên YouTube, chưa tới giờ
    return (x && x.lichDang) ? 'lich' : 'dung';
  };
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
    if (!b.loiVersions.length && typeof o.loi === 'string' && o.loi.trim())   // dạng phẳng {"loi": "..."}
      b.loiVersions = [{ v: 1, loi: o.loi.replace(/\r/g, ''), nguon: 'github', luc: b.ngayTao || now(), ghiChu: '' }];
    if (!b.promptSuno && typeof o.style === 'string') b.promptSuno = o.style;
    b.promptSuno = str(b.promptSuno); dongBoStyle(b);
    if (b.loiChon == null && b.loiVersions.length) b.loiChon = b.loiVersions[b.loiVersions.length - 1].v;
    if (b.nhacChon === undefined) b.nhacChon = null;
    b.caiDatSuno = chuanCaiDat(b.caiDatSuno);
    b.nhacVersions.forEach(x => { if (x && x.caiDat != null) x.caiDat = caiDatTrong(x.caiDat) ? null : chuanCaiDat(x.caiDat); });
    b.diem = chuanDiem(b);
    b.shortVideos = chuanShorts(b.shortVideos);
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

  /* ---------- tự đồng bộ GitHub → trình duyệt ----------
     Mỗi bài từ GitHub được nhận diện qua remoteId (mã trên GitHub).
     - Bài mới: thêm vào kho (trùng mã với bài khác trong trình duyệt thì cấp mã mới, giữ cả hai).
     - Bài đã có: gộp kiểu ba chiều theo từng trường, dựa trên bản GitHub lần đồng bộ trước (gocGitHub):
         GitHub đổi, trình duyệt chưa đổi  → nhận bản GitHub
         trình duyệt đổi, GitHub chưa đổi  → giữ bản trình duyệt
         cả hai đổi khác nhau              → giữ bản trình duyệt, lưu bản GitHub vào xungDotGitHub và cảnh báo
       Phiên bản lời, phiên bản nhạc, lịch sử chỉ được THÊM, không bao giờ xóa hay sửa. */
  const TRUONG_DB = ['ten', 'loai', 'series', 'tuan', 'trangThai', 'promptSuno', 'thumbnail', 'tieude', 'mota', 'shorts',
    'tag', 'linkYoutube', 'ngayPhatHanh', 'ghiChu', 'diem', 'caiDatSuno', 'loiChonText', 'nhacChonLink', 'shortVideos'];
  const NHAN_DB = { ten: 'tên bài', loai: 'loại', series: 'series', tuan: 'tuần', trangThai: 'trạng thái', promptSuno: 'prompt Suno',
    thumbnail: 'thumbnail', tieude: 'tiêu đề', mota: 'mô tả', shorts: 'Shorts', tag: 'hashtag', linkYoutube: 'link YouTube',
    ngayPhatHanh: 'ngày phát hành', ghiChu: 'ghi chú', diem: 'điểm', caiDatSuno: 'thông số Suno', loiChonText: 'lời đang dùng', nhacChonLink: 'bản nhạc phát hành', shortVideos: 'Shorts đã dựng' };
  function giaTriDB(b, f) {
    if (f === 'loiChonText') return loiHienTai(b) ?? '';
    if (f === 'nhacChonLink') return b.nhacVersions.find(x => x.v === b.nhacChon)?.link ?? '';
    if (f === 'diem') return JSON.stringify(b.diem);
    if (f === 'caiDatSuno') return caiDatTrong(b.caiDatSuno) ? '' : JSON.stringify(chuanCaiDat(b.caiDatSuno));
    if (f === 'shortVideos') return (b.shortVideos || []).length ? JSON.stringify(chuanShorts(b.shortVideos)) : '';
    return b[f] ?? '';
  }
  function ganDB(l, f, v) {
    if (f === 'loiChonText') { const x = l.loiVersions.find(x => x.loi === v); if (x) l.loiChon = x.v; return; }
    if (f === 'nhacChonLink') { const x = l.nhacVersions.find(x => x.link === v); l.nhacChon = x ? x.v : null; return; }
    if (f === 'diem') { l.diem = Object.assign(diemRong(), JSON.parse(v)); return; }
    if (f === 'caiDatSuno') { l.caiDatSuno = chuanCaiDat(v ? JSON.parse(v) : null); return; }
    if (f === 'shortVideos') { l.shortVideos = chuanShorts(v ? JSON.parse(v) : []); return; }
    if (f === 'trangThai') {
      if (l.trangThai !== v) {
        const daCo = l.lichSu.some(h => h.den === v && h.nguon === 'github');
        if (!daCo) l.lichSu.push({ tu: l.trangThai, den: v, luc: now(), ghiChu: 'Cập nhật từ GitHub', nguon: 'github' });
        l.trangThai = v;
      }
      return;
    }
    l[f] = v;
    if (f === 'promptSuno') dongBoStyle(l);
  }
  const thoiGian = s => { const t = Date.parse(s); return isNaN(t) ? 0 : t; };
  function themPhanBoSung(l, r) {        // chỉ thêm, không xóa
    let them = 0;
    const coLoi = new Set(l.loiVersions.map(x => x.loi));
    for (const x of r.loiVersions) {
      if (!str(x.loi).trim() || coLoi.has(x.loi)) continue;
      const v = l.loiVersions.reduce((m, y) => Math.max(m, y.v), 0) + 1;
      l.loiVersions.push({ v, loi: x.loi, nguon: 'github', luc: x.luc || now(), ghiChu: `Từ GitHub (bản v${x.v} của ${r.id})${x.ghiChu ? ': ' + x.ghiChu : ''}` });
      coLoi.add(x.loi); them++;
    }
    if (l.loiChon == null && l.loiVersions.length) l.loiChon = l.loiVersions[l.loiVersions.length - 1].v;
    const tuDong = l.styleVersions.length > 0 && l.styleVersions.every(x => x.tuDong);
    if (r.styleVersions.some(x => !x.tuDong) && (tuDong || !l.styleVersions.length)) {
      // bản trình duyệt chỉ có Style tự ghi nhận: lấy nguyên lịch sử Style trên GitHub để giữ đúng số phiên bản
      const giu = l.styleVersions.filter(x => !r.styleVersions.some(y => y.style === x.style));
      l.styleVersions = clone(r.styleVersions);
      giu.forEach(x => l.styleVersions.push(Object.assign({}, x, { v: l.styleVersions.reduce((m, y) => Math.max(m, y.v), 0) + 1 })));
      them++;
    } else {
      const coStyle = new Set(l.styleVersions.map(x => x.style));
      for (const x of r.styleVersions) {
        if (!chuanStyle(x.style) || coStyle.has(x.style)) continue;
        const v = l.styleVersions.reduce((m, y) => Math.max(m, y.v), 0) + 1;
        l.styleVersions.push({ v, style: x.style, nguon: 'github', luc: x.luc || now(), ghiChu: `Từ GitHub (bản v${x.v} của ${r.id})${x.ghiChu ? ': ' + x.ghiChu : ''}` });
        coStyle.add(x.style); them++;
      }
    }
    dongBoStyle(l);
    const coNhac = new Set(l.nhacVersions.map(x => x.link + '|' + x.ghiChu));
    for (const x of r.nhacVersions) {
      if (coNhac.has(x.link + '|' + x.ghiChu)) continue;
      const v = l.nhacVersions.reduce((m, y) => Math.max(m, y.v), 0) + 1;
      l.nhacVersions.push({ v, link: str(x.link), ghiChu: str(x.ghiChu), luc: x.luc || now(), loiV: x.loiV ?? null, styleV: x.styleV ?? null, caiDat: x.caiDat ?? null, nguon: 'github' });
      coNhac.add(x.link + '|' + x.ghiChu); them++;
    }
    const coLs = new Set(l.lichSu.map(h => h.luc + '|' + h.den));
    for (const h of r.lichSu) {
      if (!h || coLs.has(h.luc + '|' + h.den)) continue;
      l.lichSu.push(Object.assign({}, h, { nguon: 'github' })); coLs.add(h.luc + '|' + h.den); them++;
    }
    l.lichSu.sort((a, b) => thoiGian(a.luc) - thoiGian(b.luc));
    return them;
  }
  function chupGoc(r) { const g = {}; TRUONG_DB.forEach(f => g[f] = giaTriDB(r, f)); return g; }

  /** Chọn bản cho một trường đang xung đột: dungGitHub=true lấy bản GitHub, false giữ bản trình duyệt. */
  function giaiXungDot(b, f, dungGitHub) {
    const x = b.xungDotGitHub?.[f]; if (!x) return;
    if (dungGitHub) { ganDB(b, f, x.github); cham(b); }
    b.lichSu.push({ tu: b.trangThai, den: b.trangThai, luc: now(), ghiChu: `Xung đột "${NHAN_DB[f] || f}": ${dungGitHub ? 'dùng bản GitHub' : 'giữ bản trình duyệt'}` });
    delete b.xungDotGitHub[f];
    if (!Object.keys(b.xungDotGitHub).length) delete b.xungDotGitHub;
  }
  function hienGiaTriDB(f, v) {
    if (f === 'trangThai') return TRANG_THAI[v] ?? str(v);
    if (f === 'diem') { try { const d = JSON.parse(v); return TIEU_CHI.map(([k, t]) => `${t}: ${d[k] ?? '—'}`).join(', '); } catch { return str(v); } }
    if (f === 'caiDatSuno') { try { return v ? tomTatCaiDat(JSON.parse(v)) || '(trống)' : '(trống)'; } catch { return str(v); } }
    return str(v) || '(trống)';
  }
  function dongBoTuGitHub(kho, raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.bai)) throw new Error('File kho trên GitHub không hợp lệ (thiếu danh sách "bai").');
    if (raw.schema !== SCHEMA) throw new Error(`File kho trên GitHub có schema ${raw.schema}, trang cần schema ${SCHEMA}.`);
    const kq = { tong: raw.bai.length, them: 0, trung: 0, capNhat: 0, doiMa: 0, boQua: [], trungMa: [], xungDot: [], doi: false };
    const daGap = new Set();
    for (const r0 of raw.bai) {
      if (!r0 || typeof r0 !== 'object' || !isNptId(r0.id)) { kq.boQua.push(`Mục không có mã NPT hợp lệ (${str(r0?.id) || 'trống'})`); continue; }
      if (daGap.has(r0.id)) { kq.boQua.push(`${r0.id} xuất hiện hai lần trong file GitHub, chỉ lấy lần đầu`); continue; }
      daGap.add(r0.id);
      const r = chuanBaiV2(clone(r0), khoRong());            // bổ sung trường thiếu, giữ nguyên mã
      const l = kho.bai.find(b => b.remoteId === r.id)
        || kho.bai.find(b => !b.remoteId && b.id === r.id && (boDau(b.ten) === boDau(r.ten)
          || (b.ngayTao === r.ngayTao && str(b.loiVersions[0]?.loi) === str(r.loiVersions[0]?.loi))));   // đổi tên nhưng cùng bài
      if (!l) {                                                // bài mới
        r.remoteId = r.id; r.gocGitHub = chupGoc(r); r.remoteNgayCapNhat = r.ngayCapNhat;
        if (kho.bai.some(x => x.id === r.id)) {
          const cu = kho.bai.find(x => x.id === r.id);
          r.id = capId(kho); kq.doiMa++;
          kq.trungMa.push(`Mã ${r.remoteId} trên GitHub ("${r.ten}") trùng với bài "${cu.ten}" trong trình duyệt. Đã giữ cả hai: bài GitHub mang mã ${r.id}.`);
        }
        kho.bai.push(r); kq.them++; kq.doi = true; continue;
      }
      kq.trung++;
      if (!l.remoteId) { l.remoteId = r.id; kq.doi = true; }
      // Tí quản lý thông số đề xuất trên GitHub, kể cả với kho đã đồng bộ.
      const suno = giaTriDB(r, 'caiDatSuno');
      let doiSuno = false;
      if (suno) {
        if (suno !== giaTriDB(l, 'caiDatSuno')) {
          ganDB(l, 'caiDatSuno', suno); doiSuno = true;
        }
        if (l.xungDotGitHub?.caiDatSuno) {
          delete l.xungDotGitHub.caiDatSuno;
          if (!Object.keys(l.xungDotGitHub).length) delete l.xungDotGitHub;
          doiSuno = true;
        }
      }
      // Xung đột Shorts giả do thêm trường mới (27/11/2026): nếu chỉ khác mota/lichDang mà trình duyệt chưa điền thì nhận bản GitHub.
      const xdS = l.xungDotGitHub?.shortVideos;
      if (xdS && shortsGiongCot(xdS.trinhDuyet, giaTriDB(r, 'shortVideos'))
          && !(chuanShorts(JSON.parse(xdS.trinhDuyet || '[]')).some(x => x.mota || x.lichDang))) {
        ganDB(l, 'shortVideos', giaTriDB(r, 'shortVideos'));
        delete l.xungDotGitHub.shortVideos;
        if (!Object.keys(l.xungDotGitHub).length) delete l.xungDotGitHub;
        if (l.gocGitHub) l.gocGitHub.shortVideos = giaTriDB(r, 'shortVideos');
        kq.capNhat++; kq.doi = true;
      }
      // Trạng thái không lùi (27/11/2026): xung đột trạng thái đã ghi mà GitHub cao hơn thì nhận bản GitHub.
      const xdT = l.xungDotGitHub?.trangThai;
      if (xdT && +r.trangThai > +l.trangThai) {
        const cu = l.trangThai; l.trangThai = +r.trangThai;
        delete l.xungDotGitHub.trangThai; if (!Object.keys(l.xungDotGitHub).length) delete l.xungDotGitHub;
        l.lichSu.push({ tu: cu, den: l.trangThai, luc: now(), ghiChu: 'Đồng bộ GitHub: nhận trạng thái mới hơn từ GitHub (trạng thái không lùi).' });
        kq.capNhat++; kq.doi = true;
      }
      if (l.remoteNgayCapNhat === r.ngayCapNhat && l.gocGitHub) {
        if (doiSuno) { l.gocGitHub.caiDatSuno = suno; kq.capNhat++; kq.doi = true; }
        continue;
      }
      let doi = themPhanBoSung(l, r) > 0 || doiSuno;
      if (!l.gocGitHub) {
        // Lần đầu ghép: nếu bản trong trình duyệt mới hơn thì coi bản GitHub làm gốc, không đổi gì thêm.
        l.gocGitHub = thoiGian(r.ngayCapNhat) > thoiGian(l.ngayCapNhat) ? {} : chupGoc(r);
      }
      const goc = l.gocGitHub, xd = [];
      for (const f of TRUONG_DB) {
        const vr = giaTriDB(r, f), vl = giaTriDB(l, f), vg = f === 'shortVideos' ? chuanShortsDB(goc[f]) : goc[f];
        if (vr === vl || vr === vg) continue;                  // không có gì mới từ GitHub
        if (f === 'trangThai' && +vl === TT.DA_DANG && +vr < TT.DA_DANG) continue;   // bài đã đăng YouTube không bị kéo lùi
        if (vr === '' || (f === 'diem' && vr === JSON.stringify(diemRong()))) continue;   // GitHub để trống: không xóa dữ liệu trình duyệt
        if (vl === vg || vl === '' || vl === undefined || (f === 'diem' && vl === JSON.stringify(diemRong()))) { ganDB(l, f, vr); doi = true; continue; }
        if (f === 'trangThai' && +vr > +vl) { ganDB(l, f, vr); doi = true; continue; }   // GitHub tiến xa hơn thì nhận, không báo xung đột
        xd.push(f);
        (l.xungDotGitHub = l.xungDotGitHub || {})[f] = { github: vr, trinhDuyet: vl, luc: now() };
      }
      if (xd.length) kq.xungDot.push(`${l.id} "${l.ten}": ${xd.map(f => NHAN_DB[f]).join(', ')} khác nhau giữa GitHub và trình duyệt. Đang giữ bản trong trình duyệt; bản GitHub được lưu kèm trong bài.`);
      l.gocGitHub = chupGoc(r); l.remoteNgayCapNhat = r.ngayCapNhat;
      if (doi) { kq.capNhat++; cham(l); }
      kq.doi = true;
    }
    kho.bai.forEach(dongBoStyle);                            // promptSuno vừa nhận từ GitHub có bản Style tương ứng
    kho.nextId = Math.max(kho.nextId || 1, raw.nextId || 1, kho.bai.reduce((m, b) => Math.max(m, idNum(b.id)), 0) + 1);
    return kq;
  }

  /* ---------- nhập kết quả ChatGPT ---------- */
  const TRUONG_NHAP = {
    loai: 'Loại', ten: 'Tên bài', series: 'Series', tuan: 'Tuần', loi: 'Lời bài hát', style: 'Prompt Suno', caiDatSuno: 'Thông số Suno',
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
      if (k === 'caiDatSuno') { if (v != null && (typeof v !== 'object' || Array.isArray(v))) loi.push('"caiDatSuno" phải là đối tượng {model, giong, thoiLuong, maxMode, weirdness, styleInfluence, variety, personalize}.'); continue; }
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
    data.caiDatSuno = null;
    if (obj.caiDatSuno && typeof obj.caiDatSuno === 'object' && !Array.isArray(obj.caiDatSuno)) {
      const cd = chuanCaiDat(obj.caiDatSuno), goc = obj.caiDatSuno;
      Object.keys(goc).forEach(k => { if (!CAI_DAT_SUNO.some(([x]) => x === k)) canhBao.push(`caiDatSuno: trường lạ "${k}" sẽ bị bỏ qua.`); });
      CAI_DAT_SUNO.forEach(([k, t]) => { if (goc[k] != null && goc[k] !== '' && (cd[k] === null || cd[k] === '')) canhBao.push(`caiDatSuno.${k} = "${goc[k]}" không hợp lệ (${t}), bỏ qua.`); });
      if (!caiDatTrong(cd)) data.caiDatSuno = cd;
    }
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
    if (data.caiDatSuno && (caiDatTrong(dich.caiDatSuno) || danhSachGhiDe.includes('caiDatSuno'))) datCaiDat(dich, data.caiDatSuno);
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
    const ds = Object.entries(map).filter(([k, f]) => data[k] && dich[f] && dich[f].trim() !== data[k].trim()).map(([k]) => k);
    if (data.caiDatSuno && !caiDatTrong(dich.caiDatSuno) && JSON.stringify(chuanCaiDat(dich.caiDatSuno)) !== JSON.stringify(chuanCaiDat(data.caiDatSuno))) ds.push('caiDatSuno');
    return ds;
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
    SCHEMA, TRANG_THAI, TT, SERIES, datSeries, TIEU_CHI, TIEU_CHI_CU, NGUONG, datTieuChi, diemToiDa, xepLoai, SO_TUAN, TRUONG_NHAP,
    khoRong, taoBai, themLoi, loiHienTai, chonLoi, themNhac, chonNhac, themStyle, chonStyle, styleHienTai, dongBoStyle, doiTrangThai, canhBaoChuyen,
    datDiem, tongDiem, chuanHoaKho, gopKho, dongBoTuGitHub, giaiXungDot, hienGiaTriDB, NHAN_DB, tachJson, kiemTraNhap, phanTichNhap, timBaiTrung, apNhap, xungDot,
    CAI_DAT_SUNO, caiDatRong, chuanCaiDat, tomTatCaiDat, datCaiDat, chuanShorts, shortDaDang, shortTinhTrang,
    soSanh, goiSaoLuu, docSaoLuu, xuatKho, boDau, fmtId
  };
})(typeof window !== 'undefined' ? window : globalThis);
