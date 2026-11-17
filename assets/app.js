/* Nhạc Phòng Trà – Cà Phê Chill · trang kế hoạch kênh
   Dữ liệu gốc nằm trong thư mục data/. Tiến độ và kho bài lưu trong trình duyệt (localStorage). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const KEY_LICH = 'npt-lich-v1', KEY_KHO = 'npt-kho-v1';
  const TRANG_THAI = ['Nháp lời', 'Đã duyệt lời', 'Đã tạo Suno', 'Đã đăng'];
  const GPT_URL = 'https://chatgpt.com/';
  let LICH = null, CHUDE = null, kho = [], tick = {};

  /* ---------- tiện ích ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Trình duyệt không cho lưu'); } }
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); };
  const fmt = d => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const seriesOf = id => CHUDE.series.find(s => s.id === id) || { ten: id, mau: '#E8A74A', goiY: '' };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }
  function download(name, text, type = 'application/json') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- markdown tối giản cho kế hoạch ---------- */
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(src) {
    const L = src.replace(/\r/g, '').split('\n'); let out = '', i = 0;
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) { i++; continue; }
      let m;
      if ((m = l.match(/^(#{1,3})\s+(.*)/))) { out += `<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`; i++; continue; }
      if (l.startsWith('|')) {
        const rows = []; while (i < L.length && L[i].startsWith('|')) rows.push(L[i++]);
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        out += '<table><thead><tr>' + cells(rows[0]).map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' +
          rows.slice(2).map(r => '<tr>' + cells(r).map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
        continue;
      }
      if (/^[-*]\s/.test(l)) {
        out += '<ul>'; while (i < L.length && /^[-*]\s/.test(L[i])) out += `<li>${inline(L[i++].slice(2))}</li>`; out += '</ul>'; continue;
      }
      const p = []; while (i < L.length && L[i].trim() && !/^(#|\||[-*]\s)/.test(L[i])) p.push(L[i++]);
      out += `<p>${inline(p.join(' '))}</p>`;
    }
    return out;
  }

  /* ---------- tabs ---------- */
  function showTab(id) {
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
    $$('.panel').forEach(p => p.classList.toggle('on', p.id === id));
    history.replaceState(null, '', '#' + id);
  }
  $$('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));

  /* ---------- tuần ---------- */
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

  /* ---------- tiến độ ---------- */
  function renderTienDo() {
    let tong = 0, xong = 0;
    LICH.tuan.forEach(w => itemsOf(w).forEach(it => { tong++; if (tick[`${w.so}:${it.id}`]) xong++; }));
    const n = tuanHienTai(), dang = kho.filter(s => s.tt === 3).length;
    $('#tien-do').innerHTML = `
      <div class="stat"><b>Tuần ${n}/15</b><span>${esc(LICH.tuan[n - 1].chuDe)}</span></div>
      <div class="stat"><b>${xong}/${tong}</b><span>việc trong lịch đã xong</span></div>
      <div class="stat"><b>${kho.length}</b><span>bài trong kho lời</span></div>
      <div class="stat"><b>${dang}</b><span>bài đã đăng YouTube</span></div>`;
  }

  /* ---------- lịch ---------- */
  function renderLich() {
    const now = tuanHienTai(), chi = $('#chi-tuan-nay').checked;
    $('#ds-tuan').innerHTML = LICH.tuan.filter(w => !chi || (w.so >= now && w.so <= now + 1)).map(w => {
      const s = seriesOf(w.series), st = tuanStart(w.so), its = itemsOf(w);
      const done = its.every(it => tick[`${w.so}:${it.id}`]);
      return `<div class="week ${w.so === now ? 'now' : ''} ${done ? 'done' : ''}" style="--c:${s.mau}">
        <div class="wk-head"><h3>Tuần ${w.so} · ${esc(w.chuDe)}</h3><span class="wk-date">${fmt(st)} – ${fmt(addDays(st, 6))}</span></div>
        <div class="wk-meta"><span class="tag">${esc(w.giaiDoan)}</span><span class="tag">${esc(s.ten)}</span></div>
        <ul class="items">${its.map(it => {
          const k = `${w.so}:${it.id}`;
          return `<li class="${tick[k] ? 'xong' : ''}"><input type="checkbox" data-k="${k}" ${tick[k] ? 'checked' : ''}>
            <span class="t"><span class="kind">${it.kind}</span>${esc(it.t)}</span>
            ${it.bai ? `<button class="mini" data-tao="${w.so}|${esc(it.t)}">Tạo lời</button>` : ''}</li>`;
        }).join('')}</ul></div>`;
    }).join('');
  }
  $('#ds-tuan').addEventListener('change', e => {
    const k = e.target.dataset.k; if (!k) return;
    tick[k] = e.target.checked; if (!tick[k]) delete tick[k];
    store.set(KEY_LICH, tick); renderLich(); renderTienDo();
  });
  $('#ds-tuan').addEventListener('click', e => {
    const v = e.target.dataset.tao; if (!v) return;
    const [so, ten] = v.split('|'); const w = LICH.tuan[+so - 1];
    $('input[name=loai][value=bai]').checked = true; capNhatLoai();
    $('#f-tuan').value = so; $('#f-series').value = w.series; $('#f-ten').value = ten; $('#f-chitiet').value = '';
    buildPrompt(); showTab('tao-loi'); $('#f-chitiet').focus();
  });
  $('#chi-tuan-nay').onchange = renderLich;

  /* ---------- tạo lời ---------- */
  const opt = (arr, v = x => x, t = x => x) => arr.map(x => `<option value="${esc(v(x))}">${esc(t(x))}</option>`).join('');
  function loai() { return $('input[name=loai]:checked').value; }
  function capNhatLoai() {
    const pl = loai() === 'playlist';
    $$('.only-bai').forEach(e => e.hidden = pl); $$('.only-playlist').forEach(e => e.hidden = !pl);
    if (pl) { const w = LICH.tuan[+$('#f-tuan').value - 1]; if (!$('#f-pl-ten').value) $('#f-pl-ten').value = w.playlist || ''; renderPlPick(); }
  }
  function renderPlPick() {
    const sr = $('#f-series').value;
    const ds = kho.filter(s => s.loai !== 'playlist').sort((a, b) => (b.series === sr) - (a.series === sr));
    $('#pl-ds').innerHTML = ds.length ? ds.map(s => `<label><input type="checkbox" value="${s.id}" ${s.series === sr ? 'checked' : ''}>${esc(s.ten)} <small class="m">· ${esc(seriesOf(s.series).ten)}</small></label>`).join('')
      : '<small class="m">Kho chưa có bài. Vẫn tạo được câu lệnh, ChatGPT sẽ gợi ý tên bài.</small>';
  }

  const QUY_TAC = `Quy tắc bắt buộc:
- Lời hoàn toàn mới do bạn sáng tác. Không chép, không mượn câu hay đoạn của bất kỳ bài hát đã có nào (kể cả nhạc xưa, nhạc Trịnh, bolero).
- Không nhắc tên ca sĩ, nhạc sĩ hay thương hiệu có thật, kể cả trong phần style.
- Tiếng Việt có dấu, câu chữ giản dị, có hình ảnh cụ thể, vần tự nhiên, dễ hát.`;

  function promptBai() {
    const w = LICH.tuan[+$('#f-tuan').value - 1], s = seriesOf($('#f-series').value);
    const ten = $('#f-ten').value.trim() || '(bạn tự đặt tên phù hợp chủ đề)';
    const ct = $('#f-chitiet').value.trim(), gc = $('#f-ghichu').value.trim();
    return `Bạn là nhạc sĩ viết lời nhạc trữ tình phòng trà Việt Nam. Hãy viết một bài hát MỚI cho kênh YouTube "Nhạc Phòng Trà – Cà Phê Chill" (nhạc trữ tình, hoài niệm, nghe thư giãn, mở ở quán cà phê). Nhạc sẽ được tạo bằng Suno.

Thông tin bài:
- Tên bài / ý tưởng: ${ten}
- Series: ${s.ten} (gợi ý chất liệu: ${s.goiY})
- Chủ đề tuần ${w.so}: ${w.chuDe}
${ct ? `- Hình ảnh, chi tiết muốn có: ${ct}\n` : ''}- Cảm xúc: ${$('#f-camxuc').value}
- Nhịp / thể loại: ${$('#f-nhip').value}
- Giọng hát: ${$('#f-giong').value}
- Nhạc cụ chính: ${$('#f-nhaccu').value}
${gc ? `- Ghi chú: ${gc}\n` : ''}
${QUY_TAC}
- Độ dài khi hát khoảng 3–4 phút. Điệp khúc 4 câu, dễ nhớ, có câu chứa tên bài.
- Đặt nhãn cấu trúc cho Suno trên dòng riêng: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Chorus], [Bridge], [Final Chorus], [Outro].

Trả lời ĐÚNG theo các mục sau, giữ nguyên tiêu đề mục (dòng bắt đầu bằng ###), không thêm lời bình:

### TÊN BÀI
### LỜI BÀI HÁT
### STYLE CHO SUNO
(tiếng Anh, dưới 200 ký tự, gồm thể loại, nhịp, nhạc cụ, giọng hát, không tên nghệ sĩ)
### TIÊU ĐỀ YOUTUBE
(theo mẫu: <Tên bài> | Nhạc Phòng Trà Hoài Niệm – Sáng tác mới)
### MÔ TẢ YOUTUBE
(2–3 câu kể câu chuyện của bài hát, giọng gần gũi)
### ĐOẠN CHO SHORTS
(4 câu điệp khúc hay nhất)
### HASHTAG
(3 hashtag tiếng Việt không dấu)`;
  }

  function promptPlaylist() {
    const w = LICH.tuan[+$('#f-tuan').value - 1], s = seriesOf($('#f-series').value);
    const chon = $$('#pl-ds input:checked').map(i => kho.find(x => x.id === i.value)).filter(Boolean);
    const gc = $('#f-ghichu').value.trim();
    return `Bạn là người biên tập kênh YouTube "Nhạc Phòng Trà – Cà Phê Chill" (nhạc trữ tình, hoài niệm, lời do kênh tự sáng tác, nhạc tạo bằng AI, hợp mở ở quán cà phê).
Hãy chuẩn bị nội dung cho một video playlist dài ${$('#f-pl-gio').value}.

- Tên dự kiến: ${$('#f-pl-ten').value.trim() || '(bạn đề xuất)'}
- Series: ${s.ten}; chủ đề tuần ${w.so}: ${w.chuDe}
${chon.length ? `- Các bài có sẵn trong kho:\n${chon.map((x, k) => `  ${k + 1}. ${x.ten}${x.mota ? ' — ' + x.mota.split('\n')[0].slice(0, 120) : ''}`).join('\n')}\n` : '- Kho chưa có bài: hãy đề xuất 12 tên bài mới hợp chủ đề để kênh sáng tác thêm.\n'}${gc ? `- Ghi chú: ${gc}\n` : ''}
${QUY_TAC}

Trả lời ĐÚNG theo các mục sau, giữ nguyên tiêu đề mục (dòng bắt đầu bằng ###):

### TÊN BÀI
(tên playlist ngắn gọn để lưu kho)
### TIÊU ĐỀ YOUTUBE
(3 phương án, mỗi phương án dưới 90 ký tự, từ khóa "nhạc phòng trà", "nhạc cà phê", "nhạc trữ tình" ở nửa đầu, có thời lượng)
### LỜI BÀI HÁT
(thứ tự bài đề xuất kèm lý do ngắn: bài mở đầu phải cuốn nhất)
### MÔ TẢ YOUTUBE
(đoạn mở 2–3 câu tạo không khí, dòng "Lời do kênh sáng tác, nhạc và giọng hát tạo với sự hỗ trợ của AI", chỗ để điền mốc thời gian dạng 00:00 Tên bài)
### ĐOẠN CHO SHORTS
(1 câu bình luận ghim hỏi người nghe muốn nghe chủ đề gì tiếp theo)
### HASHTAG
(3 hashtag tiếng Việt không dấu)`;
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
    buildPrompt();
  });
  $('#btn-copy-prompt').onclick = async () => toast(await copy($('#prompt').value) ? 'Đã sao chép câu lệnh' : 'Không sao chép được, hãy bôi đen và Ctrl+C');
  $('#btn-mo-gpt').onclick = async () => {
    const p = $('#prompt').value; await copy(p);
    const url = p.length < 3500 ? GPT_URL + '?q=' + encodeURIComponent(p) : GPT_URL;
    window.open(url, '_blank', 'noopener');
    toast(p.length < 3500 ? 'Đã mở ChatGPT kèm câu lệnh' : 'Đã sao chép, dán vào ChatGPT');
  };

  /* ---------- đọc kết quả ChatGPT ---------- */
  const MUC = { 'TÊN BÀI': 'ten', 'LỜI BÀI HÁT': 'loi', 'STYLE CHO SUNO': 'style', 'TIÊU ĐỀ YOUTUBE': 'tieude', 'MÔ TẢ YOUTUBE': 'mota', 'ĐOẠN CHO SHORTS': 'shorts', 'HASHTAG': 'tag' };
  const bo = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toUpperCase();
  function parseKetQua(txt) {
    const out = {}; let cur = null;
    const keys = Object.entries(MUC).map(([k, v]) => [bo(k), v]);
    for (const line of txt.replace(/\r/g, '').split('\n')) {
      const h = line.match(/^\s*(?:#{1,4}\s*|\*\*\s*)?(?:\d+[.)]\s*)?([^:*#]+?)\s*(?:\*\*)?\s*:?\s*$/);
      const hit = h && keys.find(([k]) => bo(h[1]).trim() === k);
      if (hit) { cur = hit[1]; out[cur] = ''; continue; }
      if (cur) out[cur] += line + '\n';
    }
    for (const k in out) out[k] = out[k].replace(/^\s*\n|\n\s*$/g, '').replace(/^\*\*(.*)\*\*$/, '$1').trim();
    if (out.ten) out.ten = out.ten.split('\n')[0].replace(/^["“*]+|["”*]+$/g, '').trim();
    if (!Object.keys(out).length) out.loi = txt.trim();
    return out;
  }
  $('#btn-luu').onclick = () => {
    const txt = $('#ket-qua').value.trim();
    if (!txt) { toast('Chưa dán kết quả'); return; }
    const p = parseKetQua(txt);
    const s = {
      id: uid(), loai: loai(), tuan: +$('#f-tuan').value, series: $('#f-series').value, tt: 0,
      ten: p.ten || $('#f-ten').value.trim() || $('#f-pl-ten').value.trim() || 'Bài chưa đặt tên',
      loi: p.loi || '', style: p.style || '', tieude: p.tieude || '', mota: p.mota || '', shorts: p.shorts || '', tag: p.tag || '',
      link: '', prompt: $('#prompt').value, ngay: new Date().toISOString().slice(0, 10)
    };
    kho.unshift(s); saveKho();
    $('#ket-qua').value = '';
    $('#luu-note').textContent = `Đã lưu "${s.ten}" vào Kho bài (${p.loi ? 'đã tách đủ các mục' : 'không nhận ra mục, đã lưu nguyên văn vào phần lời'}).`;
    toast('Đã lưu vào kho');
  };

  /* ---------- kho bài ---------- */
  function saveKho() { store.set(KEY_KHO, kho); renderKho(); renderTienDo(); $('#dem-kho').textContent = kho.length; }
  function renderKho() {
    const fs = $('#loc-series').value, ft = $('#loc-tt').value, q = bo($('#loc-q').value.trim());
    const ds = kho.filter(s => (!fs || s.series === fs) && (ft === '' || s.tt === +ft) && (!q || bo(s.ten).includes(q)));
    $('#ds-kho').innerHTML = ds.length ? ds.map(s => `
      <div class="song" data-id="${s.id}" style="--c:${seriesOf(s.series).mau}">
        <h4>${esc(s.ten)}</h4>
        <div class="m">${s.loai === 'playlist' ? 'Playlist' : 'Bài đơn'} · Tuần ${s.tuan} · ${esc(seriesOf(s.series).ten)} · <span class="tt tt-${s.tt}">${TRANG_THAI[s.tt]}</span></div>
        <pre>${esc((s.loi || s.mota || '').slice(0, 300))}</pre>
      </div>`).join('') : `<div class="empty">${kho.length ? 'Không có bài khớp bộ lọc.' : 'Kho chưa có bài. Vào tab <b>Tạo lời</b> để bắt đầu.'}</div>`;
  }
  ['#loc-series', '#loc-tt', '#loc-q'].forEach(s => $(s).addEventListener('input', renderKho));

  let dangSua = null;
  const F = ['ten', 'loi', 'style', 'tieude', 'mota', 'shorts', 'tag', 'link'];
  $('#ds-kho').addEventListener('click', e => {
    const c = e.target.closest('.song'); if (!c) return;
    dangSua = kho.find(s => s.id === c.dataset.id); if (!dangSua) return;
    F.forEach(f => $('#d-' + f).value = dangSua[f] || ''); $('#d-tt').value = dangSua.tt;
    $('#dlg').showModal();
  });
  $('#d-luu').onclick = () => {
    F.forEach(f => dangSua[f] = $('#d-' + f).value); dangSua.tt = +$('#d-tt').value;
    saveKho(); $('#dlg').close(); toast('Đã lưu');
  };
  $('#d-xoa').onclick = () => {
    if (!confirm(`Xóa "${dangSua.ten}" khỏi kho?`)) return;
    kho = kho.filter(s => s !== dangSua); saveKho(); $('#dlg').close();
  };

  $('#btn-xuat-json').onclick = () => download('kho-bai.json', JSON.stringify({ capNhat: new Date().toISOString(), bai: kho }, null, 2));
  $('#btn-xuat-md').onclick = () => {
    const md = kho.filter(s => s.loai !== 'playlist').map(s =>
      `# ${s.ten}\n\n- Series: ${seriesOf(s.series).ten} · Tuần ${s.tuan} · ${TRANG_THAI[s.tt]} · ${s.ngay}\n- Style Suno: ${s.style}\n- Tiêu đề YouTube: ${s.tieude}\n${s.link ? `- Link: ${s.link}\n` : ''}\n## Lời\n\n${s.loi}\n\n## Mô tả\n\n${s.mota}\n\n${s.tag}\n`).join('\n---\n\n');
    download('loi-bai-hat.md', md || '# Kho trống\n', 'text/markdown');
  };
  $('#nhap-json').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); const ds = Array.isArray(d) ? d : d.bai || [];
      const co = new Set(kho.map(s => s.id)); const moi = ds.filter(s => s.id && !co.has(s.id));
      kho = [...moi, ...kho]; saveKho(); toast(`Đã nhập ${moi.length} bài mới`);
    } catch { toast('File không đúng định dạng'); }
    e.target.value = '';
  };

  /* ---------- khởi động ---------- */
  async function load(path, asText) {
    const r = await fetch(path, { cache: 'no-cache' }); if (!r.ok) throw new Error(path);
    return asText ? r.text() : r.json();
  }
  async function init() {
    try {
      [LICH, CHUDE] = await Promise.all([load('data/lich.json'), load('data/chu-de.json')]);
    } catch {
      document.querySelector('main').innerHTML = '<div class="empty">Không tải được dữ liệu. Hãy mở trang qua GitHub Pages hoặc một máy chủ web (không mở trực tiếp file).</div>';
      return;
    }
    load('data/ke-hoach.md', true).then(t => $('#noi-dung-ke-hoach').innerHTML = md(t)).catch(() => $('#noi-dung-ke-hoach').textContent = 'Không tải được kế hoạch.');
    tick = store.get(KEY_LICH, {});
    kho = store.get(KEY_KHO, null);
    if (!kho) { // lần đầu: lấy kho đã lưu trong repo (nếu có)
      kho = await load('data/kho-bai.json').then(d => d.bai || []).catch(() => []);
      store.set(KEY_KHO, kho);
    }

    $('#f-tuan').innerHTML = LICH.tuan.map(w => `<option value="${w.so}">Tuần ${w.so} · ${esc(w.chuDe)}</option>`).join('');
    $('#f-series').innerHTML = opt(CHUDE.series, s => s.id, s => s.ten);
    $('#f-camxuc').innerHTML = opt(CHUDE.camXuc); $('#f-nhip').innerHTML = opt(CHUDE.nhip);
    $('#f-giong').innerHTML = opt(CHUDE.giong); $('#f-nhaccu').innerHTML = opt(CHUDE.nhacCu);
    $('#loc-series').innerHTML += opt(CHUDE.series, s => s.id, s => s.ten);
    $('#loc-tt').innerHTML += TRANG_THAI.map((t, k) => `<option value="${k}">${t}</option>`).join('');
    $('#d-tt').innerHTML = TRANG_THAI.map((t, k) => `<option value="${k}">${t}</option>`).join('');

    const n = tuanHienTai(); $('#f-tuan').value = n; $('#f-series').value = LICH.tuan[n - 1].series;
    $('#dem-kho').textContent = kho.length;
    renderTienDo(); renderLich(); renderKho(); buildPrompt();
    const h = location.hash.slice(1); if (h && $('#' + h)?.classList.contains('panel')) showTab(h);
  }
  init();
})();
