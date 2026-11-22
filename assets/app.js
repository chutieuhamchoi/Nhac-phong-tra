/* Nhạc Phòng Trà Studio · giao diện (giai đoạn 1)
   Dữ liệu và quy tắc nằm trong assets/data.js (window.NPT). Tệp này chỉ lo hiển thị và thao tác. */
(() => {
  'use strict';
  const N = window.NPT;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const KEY_LICH = 'npt-lich-v1', KEY_KHO_CU = 'npt-kho-v1', KEY_KHO = 'npt-kho-v2', KEY_DA_CHUYEN = 'npt-kho-v1-da-chuyen', KEY_SNAP = 'npt-snapshots', SNAP_MAX = 8;
  const GPT_URL = 'https://chatgpt.com/';
  let LICH = null, CHUDE = null, kho = N.khoRong(), tick = {};

  /* ---------- tiện ích ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };
  const fmt = d => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const fmtLuc = iso => { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const lopDiem = t => ({ duyet: 'ok', sua: 'sua', 'viet-lai': 'no' })[N.xepLoai(t).muc] || '';
  const seriesOf = id => CHUDE.series.find(s => s.id === id) || { ten: id, mau: '#E8A74A', goiY: '' };
  const ttPill = t => `<span class="tt tt-${t}">${esc(N.TRANG_THAI[t])}</span>`;
  const linkOk = u => /^https?:\/\//i.test(u || '');
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; }
  }
  function download(name, text, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const homNay = () => new Date().toISOString().slice(0, 10);

  /* ---------- lưu trữ & bản tự lưu ---------- */
  function luuKho() {
    kho.capNhat = new Date().toISOString();
    if (!store.set(KEY_KHO, kho)) { toast('Bộ nhớ trình duyệt đầy! Hãy tải bản sao lưu ngay.'); return false; }
    $('#dem-kho').textContent = kho.bai.length;
    renderKho(); renderTienDo();
    return true;
  }
  function snap(lyDo, data = N.goiSaoLuu(kho, tick)) {
    const ds = store.get(KEY_SNAP, []);
    ds.unshift({ luc: new Date().toISOString(), lyDo, soBai: data.kho?.bai?.length ?? 0, data });
    while (ds.length > SNAP_MAX) ds.pop();
    while (ds.length && !store.set(KEY_SNAP, ds)) ds.pop();   // hết chỗ thì bỏ bản cũ nhất
    renderSnap();
  }

  /* ---------- markdown tối giản ---------- */
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(src) {
    const L = src.replace(/\r/g, '').split('\n'); let out = '', i = 0;
    while (i < L.length) {
      const l = L[i]; let m;
      if (!l.trim()) { i++; continue; }
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
      if (l.startsWith('|')) {
        const rows = []; while (i < L.length && L[i].startsWith('|')) rows.push(L[i++]);
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        out += '<table><thead><tr>' + cells(rows[0]).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rows.slice(2).map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
        continue;
      }
      if (/^[-*]\s/.test(l)) { out += '<ul>'; while (i < L.length && /^[-*]\s/.test(L[i])) out += `<li>${inline(L[i++].slice(2))}</li>`; out += '</ul>'; continue; }
      const p = []; while (i < L.length && L[i].trim() && !/^(#|\||[-*]\s)/.test(L[i])) p.push(L[i++]);
      out += `<p>${inline(p.join(' '))}</p>`;
    }
    return out;
  }

  /* ---------- tabs ---------- */
  function showTab(id) {
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
    $$('main > .panel').forEach(p => p.classList.toggle('on', p.id === id));
    history.replaceState(null, '', '#' + id);
  }
  $$('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  /* ---------- lịch ---------- */
  const tuanStart = n => addDays(new Date(LICH.batDau + 'T00:00:00'), (n - 1) * 7);
  function tuanHienTai() {
    const d = Math.floor((new Date() - new Date(LICH.batDau + 'T00:00:00')) / 864e5);
    return Math.min(Math.max(Math.floor(d / 7) + 1, 1), LICH.tuan.length);
  }
  function itemsOf(w) {
    const it = w.baiDon.map((t, k) => ({ id: `b${k}`, kind: 'Bài đơn', t, bai: true }));
    if (w.playlist) it.push({ id: 'pl', kind: 'Playlist', t: w.playlist });
    it.push({ id: 'sh', kind: 'Shorts', t: `${w.so >= 12 ? 5 : 4} Shorts trong tuần` });
    w.viec.forEach((t, k) => it.push({ id: `v${k}`, kind: 'Việc', t }));
    return it;
  }
  // Việc coi là xong: đã tích trên trình duyệt này, hoặc là bài đơn/playlist đã đăng YouTube trong kho (đồng bộ mọi máy).
  function daXong(w, it) {
    if (tick[`${w.so}:${it.id}`]) return true;
    if (it.bai) { const b = baiCuaLich(it.t); return !!b && b.trangThai === N.TT.DA_DANG; }
    if (it.id === 'pl') return kho.bai.some(b => b.loai === 'playlist' && b.trangThai === N.TT.DA_DANG && N.boDau(b.ten) === N.boDau(it.t));
    return false;
  }
  function renderTienDo() {
    let tong = 0, xong = 0;
    LICH.tuan.forEach(w => itemsOf(w).forEach(it => { tong++; if (daXong(w, it)) xong++; }));
    const n = tuanHienTai();
    const dang = kho.bai.filter(b => b.trangThai === N.TT.DA_DANG).length;
    const choDuyet = kho.bai.filter(b => b.trangThai === N.TT.DANH_GIA).length;
    $('#tien-do').innerHTML = `
      <div class="stat"><b>Tuần ${n}/15</b><span>${esc(LICH.tuan[n - 1].chuDe)}</span></div>
      <div class="stat"><b>${xong}/${tong}</b><span>việc trong lịch đã xong</span></div>
      <div class="stat"><b>${kho.bai.length}</b><span>bài trong kho · ${choDuyet} đang chờ đánh giá</span></div>
      <div class="stat"><b>${dang}</b><span>bài đã đăng YouTube</span></div>`;
  }
  function baiCuaLich(ten) { return N.timBaiTrung(kho, ten); }
  function renderLich() {
    const now = tuanHienTai(), chi = $('#chi-tuan-nay').checked;
    $('#ds-tuan').innerHTML = LICH.tuan.filter(w => !chi || (w.so >= now && w.so <= now + 1)).map(w => {
      const s = seriesOf(w.series), st = tuanStart(w.so), its = itemsOf(w);
      const done = its.every(it => daXong(w, it));
      return `<div class="week ${w.so === now ? 'now' : ''} ${done ? 'done' : ''}" style="--c:${s.mau}">
        <div class="wk-head"><h3>Tuần ${w.so} · ${esc(w.chuDe)}</h3><span class="wk-date">${fmt(st)} – ${fmt(addDays(st, 6))}</span></div>
        <div class="wk-meta"><span class="tag">${esc(w.giaiDoan)}</span><span class="tag">${esc(s.ten)}</span></div>
        <ul class="items">${its.map(it => {
          const k = `${w.so}:${it.id}`, b = it.bai ? baiCuaLich(it.t) : null;
          const x = daXong(w, it);
          return `<li class="${x ? 'xong' : ''}"><input type="checkbox" data-k="${k}" ${x ? 'checked' : ''}>
            <span class="t"><span class="kind">${it.kind}</span>${esc(it.t)}${b ? `<br><a href="#" class="mini-link" data-mo="${b.id}">${b.id}</a> ${ttPill(b.trangThai)}` : ''}</span>
            ${it.bai ? `<button class="mini" data-tao="${w.so}|${esc(it.t)}">Sáng tác</button>` : ''}</li>`;
        }).join('')}</ul></div>`;
    }).join('');
  }
  $('#ds-tuan').addEventListener('change', e => {
    const k = e.target.dataset.k; if (!k) return;
    if (e.target.checked) tick[k] = true; else delete tick[k];
    store.set(KEY_LICH, tick); renderLich(); renderTienDo();
  });
  $('#ds-tuan').addEventListener('click', e => {
    const mo = e.target.dataset.mo; if (mo) { e.preventDefault(); moBai(mo); return; }
    const v = e.target.dataset.tao; if (!v) return;
    const [so, ten] = v.split('|'); const w = LICH.tuan[+so - 1];
    $('input[name=loai][value=bai]').checked = true; capNhatLoai();
    $('#f-tuan').value = so; $('#f-series').value = w.series; $('#f-ten').value = ten; $('#f-chitiet').value = '';
    const b = baiCuaLich(ten); $('#f-viet-lai').value = b ? b.id : '';
    buildPrompt(); showTab('tao-loi'); $('#f-chitiet').focus();
  });
  $('#chi-tuan-nay').onchange = renderLich;

  /* ---------- sáng tác: tạo yêu cầu ---------- */
  const opt = (arr, v = x => x, t = x => x) => arr.map(x => `<option value="${esc(v(x))}">${esc(t(x))}</option>`).join('');
  const loai = () => $('input[name=loai]:checked').value;
  function capNhatLoai() {
    const pl = loai() === 'playlist';
    $$('.only-bai').forEach(e => e.hidden = pl); $$('.only-playlist').forEach(e => e.hidden = !pl);
    if (pl) { const w = LICH.tuan[+$('#f-tuan').value - 1]; if (!$('#f-pl-ten').value) $('#f-pl-ten').value = w.playlist || ''; renderPlPick(); }
  }
  function renderPlPick() {
    const sr = $('#f-series').value;
    const ds = kho.bai.filter(b => b.loai !== 'playlist').sort((a, b) => (b.series === sr) - (a.series === sr));
    $('#pl-ds').innerHTML = ds.length ? ds.map(b => `<label><input type="checkbox" value="${b.id}" ${b.series === sr && b.trangThai >= N.TT.DUYET_PHAT_HANH ? 'checked' : ''}>${esc(b.ten)} <small class="m">· ${b.id} · ${esc(N.TRANG_THAI[b.trangThai])}</small></label>`).join('')
      : '<small class="m">Kho chưa có bài. Vẫn tạo được yêu cầu, ChatGPT sẽ gợi ý tên bài.</small>';
  }
  function renderVietLai() {
    const cur = $('#f-viet-lai').value;
    $('#f-viet-lai').innerHTML = '<option value="">— Bài mới —</option>' +
      kho.bai.filter(b => b.loai === 'bai').map(b => `<option value="${b.id}">${b.id} · ${esc(b.ten)}</option>`).join('');
    $('#f-viet-lai').value = kho.bai.some(b => b.id === cur) ? cur : '';
  }

  const DINH_VI = () => CHUDE.dinhViKenh || 'Nhạc Phòng Trà – Mỗi bài hát, một câu chuyện đáng nghe.';
  const NGUYEN_TAC = () => (CHUDE.nguyenTacSangTac || []).length ? `\nNguyên tắc sáng tác của kênh:\n${CHUDE.nguyenTacSangTac.map(x => '- ' + x).join('\n')}\n` : '';
  const QUY_TAC = `Quy tắc bắt buộc:
- Lời hoàn toàn mới do bạn sáng tác. Không chép, không mượn câu hay đoạn của bất kỳ bài hát đã có nào (kể cả nhạc xưa, nhạc Trịnh, bolero).
- Không nhắc tên ca sĩ, nhạc sĩ hay thương hiệu có thật, kể cả trong "style".
- Tiếng Việt có dấu, câu chữ giản dị, có hình ảnh cụ thể, vần tự nhiên, dễ hát.`;
  const DINH_DANG = (series, tuan, loaiBai) => `
ĐỊNH DẠNG TRẢ LỜI: chỉ trả về MỘT khối mã \`\`\`json, không thêm lời bình trước hay sau. Giữ đúng tên trường, xuống dòng trong chuỗi viết là \\n:
\`\`\`json
{
  "loai": "${loaiBai}",
  "ten": "tên bài",
  "series": "${series}",
  "tuan": ${tuan},
  "loi": "${loaiBai === 'bai' ? '[Intro]\\n...\\n[Verse 1]\\n...\\n[Chorus]\\n...' : 'thứ tự bài đề xuất, mỗi bài một dòng kèm lý do ngắn'}",
  "style": "${loaiBai === 'bai' ? 'tiếng Anh, dưới 200 ký tự: thể loại, nhịp, nhạc cụ, giọng hát' : ''}",
  "tieude": "tiêu đề YouTube, tối đa 100 ký tự",
  "mota": "mô tả YouTube",
  "shorts": "${loaiBai === 'bai' ? '4 câu điệp khúc hay nhất' : 'câu bình luận ghim hỏi người nghe muốn nghe chủ đề gì tiếp'}",
  "tag": "#hashtag1 #hashtag2 #hashtag3",
  "ghiChu": "${loaiBai === 'bai' ? '1–2 câu về ý đồ sáng tác và điểm nhấn cảm xúc' : '2 phương án tiêu đề khác'}"
}
\`\`\``;

  function promptBai() {
    const w = LICH.tuan[+$('#f-tuan').value - 1], s = seriesOf($('#f-series').value);
    const goc = kho.bai.find(b => b.id === $('#f-viet-lai').value);
    const ten = $('#f-ten').value.trim() || goc?.ten || '(bạn tự đặt tên phù hợp chủ đề)';
    const ct = $('#f-chitiet').value.trim(), gc = $('#f-ghichu').value.trim();
    const loiCu = goc ? N.loiHienTai(goc) : null;
    return `Bạn là nhạc sĩ viết lời cho kênh YouTube Nhạc Phòng Trà. Hãy ${goc ? 'VIẾT LẠI (bản mới tốt hơn) lời' : 'viết một bài hát MỚI'} cho kênh. Định vị kênh: ${DINH_VI()} Nhạc sẽ được tạo bằng Suno.

Thông tin bài:
- Tên bài / ý tưởng: ${ten}
- Series: ${s.ten} (gợi ý chất liệu: ${s.goiY})
- Chủ đề tuần ${w.so}: ${w.chuDe}
${ct ? `- Hình ảnh, chi tiết muốn có: ${ct}\n` : ''}- Cảm xúc: ${$('#f-camxuc').value}
- Nhịp / thể loại: ${$('#f-nhip').value}
- Giọng hát: ${$('#f-giong').value}
- Nhạc cụ chính: ${$('#f-nhaccu').value}
${gc ? `- Ghi chú: ${gc}\n` : ''}${loiCu ? `\nLời hiện tại (phiên bản ${goc.loiChon}) để bạn viết lại, giữ ý chính nhưng làm điệp khúc cuốn hơn:\n"""\n${loiCu}\n"""\n` : ''}
${NGUYEN_TAC()}
${QUY_TAC}
- Độ dài khi hát khoảng 3–4 phút. Điệp khúc 4 câu, dễ nhớ, có câu chứa tên bài.
- Bài phải có một điểm nhấn cảm xúc rõ (một hình ảnh hoặc câu hát khiến người nghe muốn nghe lại).
- Đặt nhãn cấu trúc cho Suno trên dòng riêng: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Chorus], [Bridge], [Final Chorus], [Outro].
${DINH_DANG(s.id, w.so, 'bai')}`;
  }
  function promptPlaylist() {
    const w = LICH.tuan[+$('#f-tuan').value - 1], s = seriesOf($('#f-series').value);
    const chon = $$('#pl-ds input:checked').map(i => kho.bai.find(x => x.id === i.value)).filter(Boolean);
    const gc = $('#f-ghichu').value.trim();
    return `Bạn là người biên tập kênh YouTube Nhạc Phòng Trà (lời do kênh tự sáng tác, nhạc tạo bằng AI). Định vị kênh: ${DINH_VI()}
Hãy chuẩn bị nội dung cho một video playlist dài ${$('#f-pl-gio').value}.

- Tên dự kiến: ${$('#f-pl-ten').value.trim() || '(bạn đề xuất)'}
- Series: ${s.ten}; chủ đề tuần ${w.so}: ${w.chuDe}
${chon.length ? `- Các bài có sẵn trong kho:\n${chon.map((x, k) => `  ${k + 1}. ${x.ten}${x.mota ? ' — ' + x.mota.split('\n')[0].slice(0, 120) : ''}`).join('\n')}\n` : '- Kho chưa có bài: hãy đề xuất 12 tên bài mới hợp chủ đề để kênh sáng tác thêm.\n'}${gc ? `- Ghi chú: ${gc}\n` : ''}
${QUY_TAC}
- Tiêu đề có từ khóa "nhạc phòng trà" hoặc từ khóa thể loại của playlist ở nửa đầu và ghi thời lượng.
- Mô tả có dòng "Lời do kênh sáng tác, nhạc và giọng hát tạo với sự hỗ trợ của AI" và chỗ điền mốc thời gian dạng 00:00 Tên bài.
${DINH_DANG(s.id, w.so, 'playlist')}`;
  }
  function buildPrompt() { $('#prompt').value = loai() === 'playlist' ? promptPlaylist() : promptBai(); }
  $('#form-loi').addEventListener('input', buildPrompt);
  $('#form-loi').addEventListener('change', e => {
    if (e.target.name === 'loai') capNhatLoai();
    if (e.target.id === 'f-series' && loai() === 'playlist') renderPlPick();
    if (e.target.id === 'f-tuan') {
      const w = LICH.tuan[+e.target.value - 1]; $('#f-series').value = w.series;
      if (loai() === 'playlist') { $('#f-pl-ten').value = w.playlist || ''; renderPlPick(); }
    }
    if (e.target.id === 'f-viet-lai') {
      const b = kho.bai.find(x => x.id === e.target.value);
      if (b) { $('#f-ten').value = b.ten; $('#f-series').value = b.series; $('#f-tuan').value = b.tuan; }
    }
    buildPrompt();
  });
  $('#btn-copy-prompt').onclick = async () => toast(await copy($('#prompt').value) ? 'Đã sao chép yêu cầu' : 'Không sao chép được, hãy bôi đen và Ctrl+C');
  $('#btn-mo-gpt').onclick = async () => {
    const p = $('#prompt').value; await copy(p);
    const ngan = p.length < 3500;
    window.open(ngan ? GPT_URL + '?q=' + encodeURIComponent(p) : GPT_URL, '_blank', 'noopener');
    toast(ngan ? 'Đã mở ChatGPT kèm yêu cầu' : 'Đã sao chép, dán vào ChatGPT');
  };

  /* ---------- sáng tác: nhập JSON có xem trước ---------- */
  let nhapTam = null;   // {ketQua:[…], prompt}
  const NHAN = { style: 'Prompt Suno', tieude: 'Tiêu đề', mota: 'Mô tả', shorts: 'Shorts', tag: 'Hashtag' };
  const TRUONG_BAI = { style: 'promptSuno', tieude: 'tieude', mota: 'mota', shorts: 'shorts', tag: 'tag' };
  $('#btn-kiem-tra').onclick = () => {
    const md = { series: $('#f-series').value, tuan: +$('#f-tuan').value };
    try { nhapTam = { ketQua: N.phanTichNhap($('#ket-qua').value, md), prompt: $('#prompt').value }; }
    catch (e) { nhapTam = null; $('#xem-truoc').innerHTML = `<div class="alert err"><b>Không đọc được.</b> ${esc(e.message)}</div>`; return; }
    renderXemTruoc();
  };
  function renderXemTruoc() {
    const box = $('#xem-truoc'); if (!nhapTam) { box.innerHTML = ''; return; }
    const vietLai = $('#f-viet-lai').value;
    box.innerHTML = nhapTam.ketQua.map((r, i) => {
      const d = r.data;
      const goiY = (i === 0 && vietLai) || N.timBaiTrung(kho, d.ten)?.id || '';
      const dich = kho.bai.find(b => b.id === goiY);
      return `<div class="preview ${r.ok ? '' : 'bad'}" data-i="${i}">
        <div class="pv-head"><b>${esc(d.ten || '(chưa có tên)')}</b> ${r.ok ? '<span class="ok">Hợp lệ</span>' : '<span class="no">Chưa hợp lệ</span>'}</div>
        ${r.loi.length ? `<div class="alert err"><ul>${r.loi.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${r.canhBao.length ? `<div class="alert warn"><ul>${r.canhBao.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        <table class="pv-table">
          <tr><th>Series · Tuần</th><td>${esc(seriesOf(d.series).ten)} · Tuần ${esc(d.tuan)}</td></tr>
          ${d.loi ? `<tr><th>Lời</th><td><pre>${esc(d.loi)}</pre></td></tr>` : ''}
          ${Object.entries(NHAN).filter(([k]) => d[k]).map(([k, n]) => `<tr><th>${n}</th><td>${esc(d[k]).replace(/\n/g, '<br>')}</td></tr>`).join('')}
          ${d.ghiChu ? `<tr><th>Ghi chú</th><td>${esc(d.ghiChu)}</td></tr>` : ''}
        </table>
        ${r.ok ? `<label>Lưu vào
          <select class="pv-dich"><option value="">Tạo bài mới</option>${kho.bai.map(b => `<option value="${b.id}" ${b.id === goiY ? 'selected' : ''}>Phiên bản lời mới cho ${b.id} · ${esc(b.ten)}</option>`).join('')}</select></label>
        <div class="pv-xd">${xungDotHtml(dich, d)}</div>
        <button type="button" class="primary pv-luu">Xác nhận lưu</button>` : '<p class="hint">Sửa JSON (hoặc nhờ ChatGPT sửa) rồi bấm Kiểm tra lại.</p>'}
      </div>`;
    }).join('');
  }
  function xungDotHtml(dich, d) {
    if (!dich) return '';
    const xd = N.xungDot(dich, d);
    const dien = Object.entries(TRUONG_BAI).filter(([k, f]) => d[k] && !dich[f]).map(([k]) => NHAN[k]);
    return `<p class="hint">Lời sẽ thành <b>phiên bản ${(dich.loiVersions.reduce((m, x) => Math.max(m, x.v), 0)) + 1}</b> của ${dich.id}, các bản cũ giữ nguyên.
      ${dien.length ? `Sẽ điền vào trường đang trống: ${dien.join(', ')}.` : ''}</p>
      ${xd.length ? `<div class="alert warn">Các trường đã có nội dung khác, mặc định <b>giữ bản cũ</b>. Tick để thay bằng bản mới:
        ${xd.map(k => `<label class="chk"><input type="checkbox" class="pv-ghi" value="${k}"> ${NHAN[k]}: <i>${esc(dich[TRUONG_BAI[k]]).slice(0, 60)}</i> → <i>${esc(d[k]).slice(0, 60)}</i></label>`).join('')}</div>` : ''}`;
  }
  $('#xem-truoc').addEventListener('change', e => {
    if (!e.target.classList.contains('pv-dich')) return;
    const box = e.target.closest('.preview'), r = nhapTam.ketQua[+box.dataset.i];
    box.querySelector('.pv-xd').innerHTML = xungDotHtml(kho.bai.find(b => b.id === e.target.value), r.data);
  });
  $('#xem-truoc').addEventListener('click', e => {
    if (!e.target.classList.contains('pv-luu')) return;
    const box = e.target.closest('.preview'), r = nhapTam.ketQua[+box.dataset.i];
    const dich = kho.bai.find(b => b.id === box.querySelector('.pv-dich').value) || null;
    const ghiDe = $$('.pv-ghi:checked', box).map(x => x.value);
    const b = N.apNhap(kho, r.data, dich, ghiDe, nhapTam.prompt);
    if (!luuKho()) return;
    box.innerHTML = `<div class="alert ok">Đã lưu <b>${b.id} · ${esc(b.ten)}</b> (lời phiên bản ${b.loiChon}). <a href="#" data-mo="${b.id}">Mở bài</a></div>`;
    renderVietLai(); renderLich(); toast('Đã lưu vào kho');
  });
  $('#xem-truoc').addEventListener('click', e => { const id = e.target.dataset.mo; if (id) { e.preventDefault(); moBai(id); } });

  /* ---------- kho bài ---------- */
  function renderKho() {
    const fs = $('#loc-series').value, ft = $('#loc-tt').value, q = N.boDau($('#loc-q').value);
    const ds = kho.bai.filter(b => (!fs || b.series === fs) && (ft === '' || b.trangThai === +ft) && (!q || N.boDau(b.ten + ' ' + b.id).includes(q)));
    $('#dem-tt').innerHTML = N.TRANG_THAI.map((t, k) => {
      const n = kho.bai.filter(b => b.trangThai === k).length;
      return `<button class="ttc ${ft === String(k) ? 'on' : ''}" data-tt="${k}">${esc(t)} <b>${n}</b></button>`;
    }).join('');
    $('#ds-kho').innerHTML = ds.length ? ds.map(b => {
      const tong = N.tongDiem(b), loi = N.loiHienTai(b) || '';
      return `<div class="song" data-id="${b.id}" style="--c:${seriesOf(b.series).mau}">
        <div class="song-top"><span class="id-pill">${b.id}</span>${ttPill(b.trangThai)}</div>
        <h4>${esc(b.ten)}</h4>
        <div class="m">${b.loai === 'playlist' ? 'Playlist' : 'Bài đơn'} · Tuần ${b.tuan} · ${esc(seriesOf(b.series).ten)}</div>
        <div class="m">Lời: ${b.loiVersions.length} bản · Nhạc: ${b.nhacVersions.length} bản${b.nhacChon ? ` (chọn v${b.nhacChon})` : ''} · Điểm: ${tong === null ? '—' : `<b class="${lopDiem(tong)}" title="${N.xepLoai(tong).nhan}">${tong}/${N.diemToiDa()}</b>`}</div>
        <pre>${esc(loi.slice(0, 220))}</pre>
        ${b.loai === 'playlist' ? '' : `<div class="song-copy">
          <button type="button" class="mini copy-btn" data-copy="loi" ${loi.trim() ? '' : 'disabled'} title="Sao chép toàn bộ lời đang dùng">⧉ Copy lời</button>
          <button type="button" class="mini copy-btn" data-copy="style" ${b.promptSuno.trim() ? '' : 'disabled'} title="Sao chép prompt Suno">⧉ Copy style</button>
        </div>`}
      </div>`;
    }).join('') : `<div class="empty">${kho.bai.length ? 'Không có bài khớp bộ lọc.' : 'Kho chưa có bài. Vào tab <b>Sáng tác</b> để bắt đầu, hoặc bấm <b>+ Ý tưởng mới</b>.'}</div>`;
  }
  ['#loc-series', '#loc-tt', '#loc-q'].forEach(s => $(s).addEventListener('input', renderKho));
  $('#dem-tt').addEventListener('click', e => {
    const b = e.target.closest('.ttc'); if (!b) return;
    $('#loc-tt').value = $('#loc-tt').value === b.dataset.tt ? '' : b.dataset.tt; renderKho();
  });
  // Copy nhanh lời / prompt Suno để dán vào ô Lyrics và Style của Suno
  async function copyCo(text, ten) {
    if (!text || !text.trim()) return toast(`Bài chưa có ${ten}`);
    toast(await copy(text) ? `Đã sao chép ${ten} (${text.length} ký tự)` : 'Không sao chép được, hãy bôi đen và Ctrl+C');
  }
  $('#ds-kho').addEventListener('click', e => {
    const nut = e.target.closest('[data-copy]');
    if (nut) {
      e.stopPropagation();
      const b = kho.bai.find(x => x.id === nut.closest('.song').dataset.id); if (!b) return;
      return nut.dataset.copy === 'loi' ? copyCo(N.loiHienTai(b) || '', 'lời') : copyCo(b.promptSuno, 'prompt Suno');
    }
    const c = e.target.closest('.song'); if (c) moBai(c.dataset.id);
  });
  $('#d-copy-loi').onclick = () => copyCo($('#d-loi').value, 'lời');
  $('#d-copy-style').onclick = () => copyCo($('[data-f=promptSuno]').value, 'prompt Suno');
  $('#btn-bai-moi').onclick = () => {
    const ten = prompt('Tên ý tưởng bài hát:'); if (!ten || !ten.trim()) return;
    const w = LICH.tuan[tuanHienTai() - 1];
    const b = N.taoBai(kho, { ten: ten.trim(), series: w.series, tuan: w.so, trangThai: N.TT.Y_TUONG });
    luuKho(); renderVietLai(); moBai(b.id);
  };
  $('#btn-xuat-md').onclick = () => {
    const out = kho.bai.filter(b => b.loai !== 'playlist').map(b => {
      const nhac = b.nhacVersions.find(x => x.v === b.nhacChon);
      return `# ${b.id} · ${b.ten}\n\n- Series: ${seriesOf(b.series).ten} · Tuần ${b.tuan} · ${N.TRANG_THAI[b.trangThai]}\n- Lời: phiên bản ${b.loiChon ?? '—'} / ${b.loiVersions.length}\n- Prompt Suno: ${b.promptSuno}\n${nhac ? `- Bản nhạc phát hành: v${nhac.v} ${nhac.link}\n` : ''}- Điểm: ${N.tongDiem(b) ?? '—'}/${N.diemToiDa()}\n- Tiêu đề YouTube: ${b.tieude}\n${b.linkYoutube ? `- Link: ${b.linkYoutube}\n` : ''}\n## Lời\n\n${N.loiHienTai(b) || ''}\n\n## Mô tả\n\n${b.mota}\n\n${b.tag}\n`;
    }).join('\n---\n\n');
    download(`loi-bai-hat-${homNay()}.md`, out || '# Kho trống\n', 'text/markdown');
  };

  /* ---------- hộp chi tiết bài ---------- */
  let bai = null, dirty = false, loiDangXem = null;
  const dlg = $('#dlg');
  function moBai(id) {
    bai = kho.bai.find(b => b.id === id); if (!bai) return;
    dirty = false; $('#d-dirty').textContent = '';
    $('#d-id').textContent = bai.id;
    $$('[data-f]', dlg).forEach(el => el.value = bai[el.dataset.f] ?? '');
    $('#d-tt-ghichu').value = ''; $('#d-loi-ghichu').value = ''; $('#d-diff').innerHTML = '';
    $('#d-nhac-link').value = ''; $('#d-nhac-ghichu').value = '';
    loiDangXem = bai.loiChon;
    dTab('tt'); renderBai();
    if (!dlg.open) dlg.showModal();
  }
  function renderBai() {
    const b = bai;
    // trạng thái
    $('#d-steps').innerHTML = N.TRANG_THAI.map((t, k) => `<div class="stp ${k < b.trangThai ? 'qua' : ''} ${k === b.trangThai ? 'cur' : ''}"><i>${k + 1}</i>${esc(t)}</div>`).join('');
    $('#d-tt-moi').innerHTML = N.TRANG_THAI.map((t, k) => `<option value="${k}" ${k === Math.min(b.trangThai + 1, 6) ? 'selected' : ''} ${k === b.trangThai ? 'disabled' : ''}>${k + 1}. ${esc(t)}</option>`).join('');
    renderCanhBao();
    $('#d-ngay').innerHTML = `Tạo: ${fmtLuc(b.ngayTao)} · Cập nhật: ${fmtLuc(b.ngayCapNhat)}${b.legacyId ? ` · Mã trong kho cũ: ${esc(b.legacyId)}` : ''}`;
    // lời
    $('#d-dem-loi').textContent = b.loiVersions.length;
    $('#d-ds-loi').innerHTML = b.loiVersions.length ? [...b.loiVersions].reverse().map(x => `
      <div class="vrow ${x.v === loiDangXem ? 'xem' : ''}">
        <b>v${x.v}</b>${x.v === b.loiChon ? '<span class="chon">đang dùng</span>' : ''}
        <span class="m">${fmtLuc(x.luc)} · ${esc({ chatgpt: 'ChatGPT', tay: 'sửa tay', 'kho-cu': 'kho cũ' }[x.nguon] || x.nguon)}</span>
        ${x.ghiChu ? `<div class="m">${esc(x.ghiChu)}</div>` : ''}
        <span class="vbtn"><button type="button" class="mini" data-xem-loi="${x.v}">Xem</button>${x.v !== b.loiChon ? `<button type="button" class="mini" data-chon-loi="${x.v}">Dùng bản này</button>` : ''}</span>
      </div>`).join('') : '<p class="hint">Chưa có lời. Viết vào ô bên phải rồi lưu, hoặc nhập từ ChatGPT ở tab Sáng tác.</p>';
    const xem = b.loiVersions.find(x => x.v === loiDangXem);
    $('#d-loi-nhan').textContent = xem ? `Lời phiên bản ${xem.v}${xem.v === b.loiChon ? ' (đang dùng)' : ''}` : 'Lời mới';
    $('#d-loi').value = xem ? xem.loi : '';
    const vs = [...b.loiVersions].reverse().map(x => `<option value="${x.v}">v${x.v} · ${fmtLuc(x.luc)}</option>`).join('');
    $('#d-ss-a').innerHTML = vs; $('#d-ss-b').innerHTML = vs;
    if (b.loiVersions.length > 1) { $('#d-ss-b').value = b.loiVersions.at(-1).v; $('#d-ss-a').value = b.loiVersions.at(-2).v; }
    // nhạc
    $('#d-dem-nhac').textContent = b.nhacVersions.length;
    $('#d-ds-nhac').innerHTML = b.nhacVersions.length ? `<label class="vrow chk"><input type="radio" name="nhac-chon" value="" ${b.nhacChon === null ? 'checked' : ''}> Chưa chọn bản phát hành</label>` +
      b.nhacVersions.map(x => `<label class="vrow chk"><input type="radio" name="nhac-chon" value="${x.v}" ${x.v === b.nhacChon ? 'checked' : ''}>
        <span><b>v${x.v}</b> ${linkOk(x.link) ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>` : esc(x.link) || '<i>không có link</i>'}
        <span class="m">· ${fmtLuc(x.luc)}${x.loiV ? ` · theo lời v${x.loiV}` : ''}</span>${x.ghiChu ? `<br><span class="m">${esc(x.ghiChu)}</span>` : ''}</span></label>`).join('')
      : '<p class="hint">Chưa có bản nhạc nào. Tạo trên Suno rồi dán link vào đây, mỗi lần tạo là một phiên bản.</p>';
    // điểm
    const tong = N.tongDiem(b);
    $('#d-diem').innerHTML = N.TIEU_CHI.map(([k, t, max]) => `<label>${esc(t)}<select data-diem="${k}"><option value="">—</option>${Array.from({ length: max }, (_, i) => i + 1).map(n => `<option ${b.diem[k] === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`).join('') +
      `<div class="tong ${lopDiem(tong)}">Tổng <b>${tong ?? '—'}</b>/${N.diemToiDa()}<br><small>${esc(N.xepLoai(tong).nhan)}${tong === null ? '' : ` · duyệt từ ${N.NGUONG.deXuatDuyet}, sửa ${N.NGUONG.canChinhSua}–${N.NGUONG.deXuatDuyet - 1}`}</small></div>` +
      (b.diemCu ? `<div class="m diem-cu">Điểm phiếu cũ (thang ${b.diemCu.thang}): ${Object.entries(N.TIEU_CHI_CU).filter(([k]) => b.diemCu[k] != null).map(([k, t]) => `${esc(t)} ${b.diemCu[k]}`).join(', ') || '—'}</div>` : '');
    // youtube
    capNhatTieuDe(); capNhatThumb();
    // lịch sử
    const xd = Object.entries(b.xungDotGitHub || {});
    $('#d-lich-su').innerHTML = (xd.length ? `<div class="alert warn"><b>Xung đột với GitHub</b>: cả trình duyệt và GitHub đều sửa các mục dưới đây. Đang dùng bản trình duyệt.
      ${xd.map(([f, x]) => `<div class="xd"><b>${esc(N.NHAN_DB[f] || f)}</b>
        <div class="xd2"><div><small>Trình duyệt (đang dùng)</small><pre>${esc(N.hienGiaTriDB(f, x.trinhDuyet))}</pre></div>
        <div><small>GitHub</small><pre>${esc(N.hienGiaTriDB(f, x.github))}</pre></div></div>
        <button type="button" class="mini" data-xd-github="${f}">Dùng bản GitHub</button> <button type="button" class="mini" data-xd-giu="${f}">Giữ bản trình duyệt</button></div>`).join('')}</div>` : '') +
      `<ol class="ls">${[...b.lichSu].reverse().map(h => `<li><span class="m">${fmtLuc(h.luc)}</span>
      ${h.tu === null ? '' : `${ttPill(h.tu)} →`} ${ttPill(h.den)}${h.ghiChu ? ` <span>${esc(h.ghiChu)}</span>` : ''}</li>`).join('')}</ol>`;
  }
  function renderCanhBao() {
    const den = +$('#d-tt-moi').value, w = N.canhBaoChuyen(bai, den);
    $('#d-canh-bao').innerHTML = w.length ? `<div class="alert warn">${w.map(esc).join('<br>')} Vẫn chuyển được nếu ông chủ chắc chắn.</div>` : '';
  }
  function dTab(d) { $$('.dtabs button', dlg).forEach(b => b.classList.toggle('on', b.dataset.d === d)); $$('.dpanel', dlg).forEach(p => p.classList.toggle('on', p.dataset.d === d)); }
  $$('.dtabs button', dlg).forEach(b => b.onclick = () => dTab(b.dataset.d));
  function capNhatTieuDe() { const n = $('#d-tieude').value.length; $('#d-dem-td').textContent = `${n}/100`; $('#d-dem-td').className = 'cnt' + (n > 90 ? ' no' : ''); }
  function capNhatThumb() { const u = $('#d-thumb').value.trim(), img = $('#d-thumb-img'); img.hidden = !linkOk(u); if (linkOk(u)) img.src = u; }
  dlg.addEventListener('input', e => {
    if (e.target.dataset.f) { dirty = true; $('#d-dirty').textContent = 'Có thay đổi chưa lưu'; }
    if (e.target.id === 'd-tieude') capNhatTieuDe();
    if (e.target.id === 'd-thumb') capNhatThumb();
  });
  $('#d-tt-moi').onchange = renderCanhBao;
  function luuTruong() {
    $$('[data-f]', dlg).forEach(el => { const f = el.dataset.f; bai[f] = f === 'tuan' ? +el.value : el.value; });
    bai.ten = bai.ten.trim() || 'Bài chưa đặt tên';
    bai.ngayCapNhat = new Date().toISOString();
    dirty = false; $('#d-dirty').textContent = '';
  }
  $('#d-luu').onclick = () => {
    const v = themNhacTuO();                                 // link Suno còn nằm trong ô: thêm luôn, không để mất
    if (v < 0) return;
    luuTruong(); if (luuKho()) { renderBai(); renderLich(); renderVietLai(); toast(v ? `Đã lưu (thêm nhạc v${v})` : 'Đã lưu'); }
  };
  function dong() {
    if (dirty && !confirm('Có thay đổi chưa lưu ở các ô thông tin/YouTube. Đóng mà không lưu?')) return;
    dirty = false; dlg.close();
  }
  $('#d-dong').onclick = dong;
  dlg.addEventListener('cancel', e => { e.preventDefault(); dong(); });
  // trạng thái
  $('#d-chuyen').onclick = () => {
    const den = +$('#d-tt-moi').value, w = N.canhBaoChuyen(bai, den);
    if (w.length && !confirm(w.join('\n') + '\n\nVẫn chuyển sang "' + N.TRANG_THAI[den] + '"?')) return;
    if (dirty) luuTruong();
    if (N.doiTrangThai(bai, den, $('#d-tt-ghichu').value.trim())) {
      $('#d-tt-ghichu').value = '';
      $$('[data-f="ngayPhatHanh"]', dlg).forEach(el => el.value = bai.ngayPhatHanh);
      luuKho(); renderBai(); renderLich(); toast('Đã chuyển: ' + N.TRANG_THAI[den]);
    }
  };
  // lời
  $('#d-ds-loi').addEventListener('click', e => {
    const x = e.target.dataset.xemLoi, c = e.target.dataset.chonLoi;
    if (x) { loiDangXem = +x; renderBai(); }
    if (c) { N.chonLoi(bai, +c); loiDangXem = +c; luuKho(); renderBai(); toast(`Đang dùng lời v${c}`); }
  });
  $('#d-luu-loi').onclick = () => {
    const text = $('#d-loi').value.trim();
    if (!text) { toast('Lời đang trống'); return; }
    const v = N.themLoi(bai, text, 'tay', $('#d-loi-ghichu').value.trim());
    if (v === null) { toast('Lời giống hệt bản đang dùng, không tạo bản mới'); return; }
    if (bai.trangThai === N.TT.Y_TUONG) N.doiTrangThai(bai, N.TT.VIET_LOI, 'Có lời đầu tiên');
    $('#d-loi-ghichu').value = ''; loiDangXem = v; luuKho(); renderBai(); toast(`Đã lưu lời v${v}`);
  };
  $('#d-so-sanh').onclick = () => {
    const a = bai.loiVersions.find(x => x.v === +$('#d-ss-a').value), b = bai.loiVersions.find(x => x.v === +$('#d-ss-b').value);
    if (!a || !b) { toast('Cần ít nhất hai phiên bản'); return; }
    const d = N.soSanh(a.loi, b.loi);
    const them = d.filter(x => x.t === '+').length, bot = d.filter(x => x.t === '-').length;
    $('#d-diff').innerHTML = `<div class="sub-h">So sánh v${a.v} → v${b.v}: <span class="no">−${bot} dòng</span> <span class="ok">+${them} dòng</span></div>
      <pre class="diff">${d.map(x => `<span class="d${x.t === '+' ? 'add' : x.t === '-' ? 'del' : ''}">${x.t === '=' ? ' ' : x.t} ${esc(x.s)}</span>`).join('\n')}</pre>`;
    $('#d-diff').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  // nhạc
  // Thêm bản nhạc từ ô link/ghi chú. Trả về số phiên bản, 0 nếu ô trống, -1 nếu link sai.
  function themNhacTuO() {
    const link = $('#d-nhac-link').value.trim(), gc = $('#d-nhac-ghichu').value.trim();
    if (!link && !gc) return 0;
    if (link && !linkOk(link)) { toast('Link phải bắt đầu bằng https://'); return -1; }
    if (link && bai.nhacVersions.some(x => x.link === link)) { $('#d-nhac-link').value = ''; $('#d-nhac-ghichu').value = ''; toast('Link này đã có trong danh sách'); return -1; }
    const v = N.themNhac(bai, link, gc);
    if (bai.trangThai <= N.TT.DUYET_LOI) N.doiTrangThai(bai, N.TT.TAO_NHAC, 'Có bản nhạc Suno đầu tiên');
    if (bai.nhacChon == null) N.chonNhac(bai, v);          // bản đầu tiên tự được chọn làm bản phát hành
    $('#d-nhac-link').value = ''; $('#d-nhac-ghichu').value = '';
    return v;
  }
  $('#d-them-nhac').onclick = () => {
    const v = themNhacTuO();
    if (v === 0) { toast('Nhập link Suno hoặc ghi chú'); return; }
    if (v < 0) return;
    luuKho(); renderBai(); toast(`Đã thêm nhạc v${v}`);
  };
  ['#d-nhac-link', '#d-nhac-ghichu'].forEach(s => $(s).addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('#d-them-nhac').click(); }
  }));
  $('#d-ds-nhac').addEventListener('change', e => {
    if (e.target.name !== 'nhac-chon') return;
    N.chonNhac(bai, e.target.value === '' ? null : +e.target.value); luuKho(); renderBai();
  });
  $('#d-diem').addEventListener('change', e => {
    const k = e.target.dataset.diem; if (!k) return;
    N.datDiem(bai, k, e.target.value); luuKho(); renderBai();
  });
  $('#d-lich-su').addEventListener('click', e => {
    const g = e.target.dataset.xdGithub, k = e.target.dataset.xdGiu;
    if (!g && !k) return;
    N.giaiXungDot(bai, g || k, !!g); luuKho(); renderBai();
    $$('[data-f]', dlg).forEach(el => el.value = bai[el.dataset.f] ?? '');
    toast(g ? 'Đã dùng bản GitHub' : 'Đã giữ bản trình duyệt');
  });
  $('#d-xoa').onclick = () => {
    if (!confirm(`Xóa ${bai.id} · "${bai.ten}" khỏi kho?\nTrang sẽ tự lưu một bản trước khi xóa, khôi phục được ở tab Sao lưu.`)) return;
    snap(`Trước khi xóa ${bai.id} · ${bai.ten}`);
    kho.bai = kho.bai.filter(b => b !== bai); dirty = false; dlg.close();
    luuKho(); renderLich(); renderVietLai(); toast('Đã xóa');
  };

  /* ---------- sao lưu / khôi phục / gộp ---------- */
  $('#btn-sao-luu').onclick = () => download(`npt-sao-luu-${homNay()}.json`, JSON.stringify(N.goiSaoLuu(kho, tick), null, 2));
  $('#btn-xuat-json').onclick = () => download('kho-bai.json', JSON.stringify(N.xuatKho(kho), null, 2));
  async function docFile(input) {
    const f = input.files[0]; input.value = ''; if (!f) return null;
    try { return { ten: f.name, data: JSON.parse(await f.text()) }; }
    catch { toast('File không phải JSON hợp lệ'); return null; }
  }
  let kpTam = null, gopTam = null;
  $('#file-khoi-phuc').onchange = async e => {
    const f = await docFile(e.target); if (!f) return;
    try { kpTam = N.docSaoLuu(f.data); }
    catch (err) { $('#kp-xem-truoc').innerHTML = `<div class="alert err">${esc(err.message)}</div>`; return; }
    const r = kpTam.baoCao;
    $('#kp-xem-truoc').innerHTML = `<div class="alert warn"><b>${esc(f.ten)}</b>: ${r.tong} bài${r.tuCu ? ` (${r.tuCu} bài định dạng cũ sẽ được chuyển đổi)` : ''}${kpTam.tienDoLich ? `, ${Object.keys(kpTam.tienDoLich).length} việc đã tick trong lịch` : ''}.
      ${r.loi.length ? '<br>' + r.loi.map(esc).join('<br>') : ''}<br>Kho hiện tại có ${kho.bai.length} bài sẽ được <b>thay hoàn toàn</b> (đã tự lưu một bản trước).
      <div class="btns"><button type="button" class="primary" id="kp-xac-nhan">Khôi phục</button><button type="button" id="kp-huy">Hủy</button></div></div>`;
  };
  $('#kp-xem-truoc').addEventListener('click', e => {
    if (e.target.id === 'kp-huy') { kpTam = null; $('#kp-xem-truoc').innerHTML = ''; }
    if (e.target.id === 'kp-xac-nhan' && kpTam) {
      snap('Trước khi khôi phục từ file');
      kho = kpTam.kho; if (kpTam.tienDoLich) { tick = kpTam.tienDoLich; store.set(KEY_LICH, tick); }
      kpTam = null; $('#kp-xem-truoc').innerHTML = '<div class="alert ok">Đã khôi phục.</div>';
      luuKho(); renderLich(); renderVietLai(); toast('Đã khôi phục');
    }
  });
  $('#file-gop').onchange = async e => {
    const f = await docFile(e.target); if (!f) return;
    let thu;
    try { thu = N.khoRong(); thu.bai = JSON.parse(JSON.stringify(kho.bai)); thu.nextId = kho.nextId; gopTam = { data: f.data, kq: N.gopKho(thu, f.data) }; }
    catch (err) { $('#gop-xem-truoc').innerHTML = `<div class="alert err">${esc(err.message)}</div>`; return; }
    const kq = gopTam.kq;
    $('#gop-xem-truoc').innerHTML = `<div class="alert warn"><b>${esc(f.ten)}</b>: sẽ thêm ${kq.them} bài mới, bỏ qua ${kq.boQua.length} bài đã có.
      ${kq.boQua.length ? `<details><summary>Bài bỏ qua</summary>${kq.boQua.map(esc).join('<br>')}</details>` : ''}
      <div class="btns"><button type="button" class="primary" id="gop-xac-nhan" ${kq.them ? '' : 'disabled'}>Gộp ${kq.them} bài</button><button type="button" id="gop-huy">Hủy</button></div></div>`;
  };
  $('#gop-xem-truoc').addEventListener('click', e => {
    if (e.target.id === 'gop-huy') { gopTam = null; $('#gop-xem-truoc').innerHTML = ''; }
    if (e.target.id === 'gop-xac-nhan' && gopTam) {
      snap('Trước khi gộp kho');
      const kq = N.gopKho(kho, gopTam.data); gopTam = null;
      $('#gop-xem-truoc').innerHTML = `<div class="alert ok">Đã thêm ${kq.them} bài.</div>`;
      luuKho(); renderLich(); renderVietLai(); toast(`Đã gộp ${kq.them} bài`);
    }
  });
  function renderSnap() {
    const ds = store.get(KEY_SNAP, []);
    $('#ds-snap').innerHTML = ds.length ? `<table class="snap"><tr><th>Lúc</th><th>Lý do</th><th>Số bài</th><th></th></tr>${ds.map((s, i) => `<tr><td>${fmtLuc(s.luc)}</td><td>${esc(s.lyDo)}</td><td>${s.soBai}</td>
      <td><button type="button" class="mini" data-snap-tai="${i}">Tải</button> <button type="button" class="mini" data-snap-kp="${i}">Khôi phục</button></td></tr>`).join('')}</table>`
      : '<p class="hint">Chưa có bản tự lưu nào.</p>';
  }
  $('#ds-snap').addEventListener('click', e => {
    const ds = store.get(KEY_SNAP, []);
    const t = e.target.dataset.snapTai, k = e.target.dataset.snapKp;
    if (t !== undefined) download(`npt-tu-luu-${ds[t].luc.slice(0, 16).replace(/[:T]/g, '-')}.json`, JSON.stringify(ds[t].data, null, 2));
    if (k !== undefined) {
      const s = ds[k]; if (!confirm(`Khôi phục bản tự lưu lúc ${fmtLuc(s.luc)} (${s.soBai} bài)? Kho hiện tại sẽ được tự lưu trước.`)) return;
      const r = N.docSaoLuu(s.data); snap('Trước khi khôi phục bản tự lưu');
      kho = r.kho; if (r.tienDoLich) { tick = r.tienDoLich; store.set(KEY_LICH, tick); }
      luuKho(); renderLich(); renderVietLai(); toast('Đã khôi phục bản tự lưu');
    }
  });

  /* ---------- khởi động ---------- */
  async function load(path, asText) {
    const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(path);
    return asText ? r.text() : r.json();
  }
  /* ---------- tự đồng bộ GitHub → trình duyệt ---------- */
  const NGUON_GITHUB = 'data/kho-bai.json';
  let dbTT = null;                 // {luc, ok, kq?, loi?}
  let dangDongBo = false;
  async function taiKhoGitHub() {
    let r;
    try { r = await fetch(`${NGUON_GITHUB}?t=${Date.now()}`, { cache: 'no-store' }); }   // tránh cache trình duyệt và CDN
    catch { throw new Error('Không kết nối được GitHub Pages (mất mạng hoặc bị chặn).'); }
    if (!r.ok) throw new Error(`GitHub Pages trả lỗi ${r.status} khi tải ${NGUON_GITHUB}.`);
    const text = await r.text();
    try { return JSON.parse(text); } catch { throw new Error(`File ${NGUON_GITHUB} trên GitHub không phải JSON hợp lệ.`); }
  }
  /** Đồng bộ vào kho k. Không bao giờ ném lỗi: lỗi được ghi vào dbTT để hiển thị. */
  async function dongBo(k) {
    const luc = new Date().toISOString();
    let raw;
    try { raw = await taiKhoGitHub(); }
    catch (e) { dbTT = { luc, ok: false, loi: e.message }; return dbTT; }
    const truoc = N.goiSaoLuu(k, tick);                 // ảnh chụp trước khi đồng bộ
    let kq;
    try { kq = N.dongBoTuGitHub(k, raw); }
    catch (e) { dbTT = { luc, ok: false, loi: e.message }; return dbTT; }
    if (kq.them || kq.capNhat) snap('Trước khi tự đồng bộ GitHub', truoc);
    if (kq.doi && !store.set(KEY_KHO, k)) { dbTT = { luc, ok: false, loi: 'Bộ nhớ trình duyệt đầy, không lưu được kết quả đồng bộ.' }; return dbTT; }
    dbTT = { luc, ok: true, kq };
    return dbTT;
  }
  function thongBaoDongBo() {
    if (!dbTT) return;
    if (!dbTT.ok) { toast('Không đồng bộ được với GitHub. Đang dùng kho trong trình duyệt.'); return; }
    const { them, capNhat, xungDot } = dbTT.kq;
    if (xungDot.length || dbTT.kq.trungMa.length) toast(`Đồng bộ GitHub: có ${xungDot.length + dbTT.kq.trungMa.length} cảnh báo, xem tab Kho bài`);
    else if (them || capNhat) toast(`Đã đồng bộ GitHub: ${them} bài mới, ${capNhat} bài cập nhật`);
    else toast('Đã đồng bộ GitHub: kho đã khớp, không có gì mới');
  }
  function renderDongBo() {
    const box = $('#db-trang-thai'); if (!box) return;
    const nut = '<button type="button" class="mini" id="btn-dong-bo">Đồng bộ lại</button>';
    if (dangDongBo) { box.innerHTML = '<div class="sync">Đang đồng bộ với GitHub…</div>'; return; }
    if (!dbTT) { box.innerHTML = `<div class="sync">Chưa đồng bộ với GitHub. ${nut}</div>`; return; }
    const gio = fmtLuc(dbTT.luc);
    if (!dbTT.ok) {
      box.innerHTML = `<div class="alert err"><b>Không đồng bộ được với GitHub</b> (${gio}): ${esc(dbTT.loi)}<br>Đang dùng kho trong trình duyệt (${kho.bai.length} bài), dữ liệu không bị ảnh hưởng. ${nut}</div>`;
      return;
    }
    const k = dbTT.kq;
    box.innerHTML = `<div class="sync ok-line">Đã đồng bộ GitHub lúc ${gio} · GitHub có ${k.tong} bài${k.them || k.capNhat ? ` · vừa nhận <b>${k.them} bài mới</b>, <b>${k.capNhat} bài cập nhật</b>` : ' · không có gì mới'}. ${nut}</div>` +
      (k.trungMa.length ? `<div class="alert warn"><b>Trùng mã bài (đã giữ cả hai bài):</b><ul>${k.trungMa.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '') +
      (k.xungDot.length ? `<div class="alert warn"><b>Xung đột dữ liệu (đã giữ cả hai bản):</b><ul>${k.xungDot.map(x => `<li>${esc(x)}</li>`).join('')}</ul>Mở bài, mục <b>Lịch sử</b> để chọn bản muốn dùng.</div>` : '') +
      (k.boQua.length ? `<div class="alert warn">Bỏ qua trong file GitHub: ${k.boQua.map(esc).join('; ')}</div>` : '');
  }
  async function dongBoLai(imLang = false) {
    if (dangDongBo) return;
    dangDongBo = true; renderDongBo();
    await dongBo(kho);
    dangDongBo = false;
    $('#dem-kho').textContent = kho.bai.length;
    renderDongBo(); renderKho(); renderTienDo(); renderLich(); renderVietLai();
    if (bai && dlg.open) { bai = kho.bai.find(b => b.id === bai.id) || bai; if (!dirty) renderBai(); }
    if (!imLang || !dbTT.ok || dbTT.kq.them || dbTT.kq.capNhat || dbTT.kq.xungDot.length || dbTT.kq.trungMa.length) thongBaoDongBo();
  }
  document.addEventListener('click', e => { if (e.target.id === 'btn-dong-bo') dongBoLai(); });
  // Quay lại tab trình duyệt sau một lúc: tự kiểm tra bài mới (không làm khi đang sửa dở trong hộp bài).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !dbTT || dirty) return;
    if (Date.now() - Date.parse(dbTT.luc) > 60e3) dongBoLai(true);
  });

  async function napKho() {
    const v2 = store.get(KEY_KHO, null);
    const k = v2 ? N.chuanHoaKho(v2).kho : N.khoRong();
    // Kho cũ (trang trước nâng cấp): gộp vào đúng một lần, KHÔNG xóa khóa cũ, bài đã có thì bỏ qua.
    const v1 = store.get(KEY_KHO_CU, null);
    if (Array.isArray(v1) && v1.length && !store.get(KEY_DA_CHUYEN, false)) {
      snap('Trước khi nâng cấp cấu trúc dữ liệu (kho cũ)', { loai: 'npt-sao-luu', schema: 1, luc: new Date().toISOString(), kho: { bai: v1 }, tienDoLich: tick });
      const kq = N.gopKho(k, v1);
      store.set(KEY_DA_CHUYEN, new Date().toISOString());
      setTimeout(() => toast(`Đã nâng cấp ${kq.them} bài từ kho cũ sang cấu trúc mới, kho cũ vẫn giữ nguyên`), 400);
    }
    store.set(KEY_KHO, k);
    // Luôn đồng bộ GitHub khi mở trang, kể cả khi trình duyệt đã có kho.
    await dongBo(k);
    return k;
  }
  async function init() {
    try { [LICH, CHUDE] = await Promise.all([load('data/lich.json'), load('data/chu-de.json')]); N.datSeries(CHUDE.series.map(x => x.id)); N.datTieuChi(CHUDE.tieuChiDuyet, CHUDE.nguongDuyet); }   // series hợp lệ lấy từ chu-de.json, trước khi nạp kho
    catch {
      document.querySelector('main').innerHTML = '<div class="empty">Không tải được dữ liệu. Hãy mở trang qua GitHub Pages hoặc một máy chủ web (không mở trực tiếp file).</div>';
      return;
    }
    load('data/ke-hoach.md', true).then(t => $('#noi-dung-ke-hoach').innerHTML = md(t)).catch(() => $('#noi-dung-ke-hoach').textContent = 'Không tải được kế hoạch.');
    tick = store.get(KEY_LICH, {});
    kho = await napKho();
    setTimeout(thongBaoDongBo, 700);
    const snaps = store.get(KEY_SNAP, []);
    if (!snaps.length || Date.now() - new Date(snaps[0].luc) > 864e5) if (kho.bai.length) snap('Tự lưu hằng ngày');

    $('#f-tuan').innerHTML = LICH.tuan.map(w => `<option value="${w.so}">Tuần ${w.so} · ${esc(w.chuDe)}</option>`).join('');
    $('#d-tuan').innerHTML = LICH.tuan.map(w => `<option value="${w.so}">Tuần ${w.so} · ${esc(w.chuDe)}</option>`).join('');
    $('#f-series').innerHTML = opt(CHUDE.series, s => s.id, s => s.ten);
    $('#d-series').innerHTML = opt(CHUDE.series, s => s.id, s => s.ten);
    $('#f-camxuc').innerHTML = opt(CHUDE.camXuc); $('#f-nhip').innerHTML = opt(CHUDE.nhip);
    $('#f-giong').innerHTML = opt(CHUDE.giong); $('#f-nhaccu').innerHTML = opt(CHUDE.nhacCu);
    $('#loc-series').innerHTML += opt(CHUDE.series, s => s.id, s => s.ten);
    $('#loc-tt').innerHTML += N.TRANG_THAI.map((t, k) => `<option value="${k}">${k + 1}. ${esc(t)}</option>`).join('');

    const n = tuanHienTai(); $('#f-tuan').value = n; $('#f-series').value = LICH.tuan[n - 1].series;
    $('#dem-kho').textContent = kho.bai.length;
    renderVietLai(); renderTienDo(); renderLich(); renderKho(); renderSnap(); renderDongBo(); buildPrompt();
    const h = location.hash.slice(1); if (h && document.getElementById(h)?.classList.contains('panel')) showTab(h);
  }
  init();
})();
