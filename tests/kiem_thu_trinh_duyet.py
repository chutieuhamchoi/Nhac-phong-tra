"""Kiểm thử giao diện bằng trình duyệt thật (Playwright + Chromium).

Chạy:  python3 -m http.server 8765  (trong thư mục repo, ở một cửa sổ khác)
       python3 tests/kiem_thu_trinh_duyet.py [thư-mục-ảnh]
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

URL = os.environ.get('NPT_URL', 'http://localhost:8765/')
SHOT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/npt-shots'
os.makedirs(SHOT, exist_ok=True)

# Kho cũ đúng như bản trang trước đã lưu trong localStorage
KHO_CU = [
    {"id": "mi3old1", "loai": "bai", "tuan": 1, "series": "tuoi-tho", "tt": 2, "ten": "Mái Trường Làng Ngày Ấy",
     "loi": "[Verse 1]\nCon đường đất đỏ dẫn em về\n[Chorus]\nMái trường làng ngày ấy ơi", "style": "nostalgic ballad",
     "tieude": "Mái Trường Làng Ngày Ấy | Nhạc Phòng Trà", "mota": "Mô tả cũ", "shorts": "", "tag": "#a", "link": "",
     "prompt": "p", "ngay": "2026-11-17"},
    {"id": "mi3old2", "loai": "playlist", "tuan": 3, "series": "ca-phe-sang", "tt": 0, "ten": "Cà phê sáng 1 giờ",
     "loi": "", "style": "", "tieude": "", "mota": "", "shorts": "", "tag": "", "link": "", "prompt": "", "ngay": "2026-11-18"},
]
JSON_MOI = '''Đây là bài hát:
```json
{"loai":"bai","ten":"Bà ngoại và giàn trầu","series":"tuoi-tho","tuan":1,
 "loi":"[Intro]\\n[Verse 1]\\nGiàn trầu xanh trước ngõ\\n[Chorus]\\nBà ơi, giàn trầu năm ấy",
 "style":"Vietnamese nostalgic ballad, 70 BPM, piano, warm female vocal",
 "tieude":"Bà Ngoại Và Giàn Trầu | Nhạc Phòng Trà Hoài Niệm – Sáng tác mới",
 "mota":"Bài hát về bà ngoại.","shorts":"Bà ơi","tag":["#nhacphongtra","#bangoai"],"ghiChu":"Điểm nhấn: mùi trầu"}
```'''
JSON_VIET_LAI = '{"ten":"Mái trường làng ngày ấy","series":"tuoi-tho","tuan":1,"loi":"[Verse 1]\\nCon đường đất đỏ dẫn em về\\nTiếng trống trường vang\\n[Chorus]\\nMái trường làng ơi","tieude":"Tiêu đề mới","mota":"","style":"bolero"}'

ok_count = 0
def check(cond, msg):
    global ok_count
    if not cond:
        raise AssertionError('THẤT BẠI: ' + msg)
    ok_count += 1
    print('  ✓', msg)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        # Giả lập kho GitHub rỗng để kết quả không phụ thuộc bài thật trong repo
        await ctx.route('**/data/kho-bai.json*', lambda r: r.fulfill(status=200, content_type='application/json',
                        body='{"schema":2,"nextId":1,"bai":[]}'))
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and errs.append(m.text))  # bỏ qua phông chữ bị chặn mạng
        dialogs = []
        async def on_dialog(d):
            dialogs.append(d.message)
            if d.type == 'prompt': await d.accept('Ý tưởng thử nghiệm')
            else: await d.accept()
        pg.on('dialog', lambda d: asyncio.ensure_future(on_dialog(d)))

        print('1. Nâng cấp kho cũ trong trình duyệt')
        await pg.goto(URL); await pg.wait_for_selector('.week', state='attached')
        await pg.evaluate("""k => { localStorage.clear(); localStorage.setItem('npt-kho-v1', JSON.stringify(k));
                                     localStorage.setItem('npt-lich-v1', JSON.stringify({'1:v0': true})); }""", KHO_CU)
        await pg.reload(); await pg.wait_for_timeout(1200)
        st = await pg.evaluate("""() => ({v1: localStorage.getItem('npt-kho-v1'), v2: JSON.parse(localStorage.getItem('npt-kho-v2')),
                                          snaps: JSON.parse(localStorage.getItem('npt-snapshots')||'[]')})""")
        check(st['v1'] == json.dumps(KHO_CU, ensure_ascii=False, separators=(',', ':')) or json.loads(st['v1']) == KHO_CU, 'kho cũ (npt-kho-v1) giữ nguyên')
        ids = [b['id'] for b in st['v2']['bai']]
        check(ids == ['NPT-0001', 'NPT-0002'], f'cấp mã NPT: {ids}')
        check(st['v2']['bai'][0]['trangThai'] == 4 and st['v2']['bai'][1]['trangThai'] == 1, 'trạng thái cũ được chuyển đúng')
        check(st['v2']['bai'][0]['_v1']['id'] == 'mi3old1', 'bản gốc lưu trong _v1')
        check(any('nâng cấp' in s['lyDo'] for s in st['snaps']), 'có bản tự lưu trước khi nâng cấp')
        await pg.reload(); await pg.wait_for_timeout(800)
        n = await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2')).bai.length")
        check(n == 2, 'mở lại trang không gộp kho cũ lần hai')
        await pg.screenshot(path=f'{SHOT}/01-ke-hoach.png')

        print('2. Lịch: bài đã có hiện mã và trạng thái')
        await pg.click('[data-tab=lich]')
        txt = await pg.inner_text('.week.now')
        check('NPT-0001' in txt, 'tuần 1 hiện NPT-0001 cạnh "Mái trường làng ngày ấy"')

        print('3. Sáng tác: yêu cầu JSON, kiểm tra, xem trước, lưu bài mới')
        await pg.click('button[data-tao^="1|Bà ngoại"]')
        pr = await pg.input_value('#prompt')
        check('```json' in pr and '"series": "tuoi-tho"' in pr and '"tuan": 1' in pr, 'yêu cầu có khuôn JSON điền sẵn series và tuần')
        await pg.fill('#ket-qua', '{ten: sai}')
        await pg.click('#btn-kiem-tra')
        check('JSON không hợp lệ' in await pg.inner_text('#xem-truoc'), 'báo lỗi JSON hỏng')
        await pg.fill('#ket-qua', '{"ten":"","series":"abc","tuan":99,"tieude":"' + 'x' * 120 + '"}')
        await pg.click('#btn-kiem-tra')
        t = await pg.inner_text('#xem-truoc')
        check('Chưa hợp lệ' in t and 'series' in t and await pg.locator('.pv-luu').count() == 0, 'dữ liệu sai: liệt kê lỗi, không cho lưu')
        await pg.fill('#ket-qua', JSON_MOI)
        await pg.click('#btn-kiem-tra')
        check(await pg.locator('.preview .ok').count() == 1, 'JSON đúng: hợp lệ, có xem trước')
        await pg.screenshot(path=f'{SHOT}/02-xem-truoc.png', full_page=True)
        check(await pg.locator('.pv-dich').input_value() == '', 'mặc định tạo bài mới')
        await pg.click('.pv-luu')
        check('NPT-0003' in await pg.inner_text('#xem-truoc'), 'đã lưu thành NPT-0003')

        print('4. Viết lại bài có sẵn: lời thành phiên bản mới, không ghi đè')
        await pg.fill('#ket-qua', JSON_VIET_LAI)
        await pg.click('#btn-kiem-tra')
        check(await pg.locator('.pv-dich').input_value() == 'NPT-0001', 'tự nhận ra bài trùng tên NPT-0001')
        t = await pg.inner_text('.pv-xd')
        check('phiên bản 2' in t and 'Tiêu đề' in t, 'báo lời thành v2 và xung đột tiêu đề')
        await pg.click('.pv-luu')
        b1 = await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2')).bai.find(b=>b.id==='NPT-0001')")
        check(len(b1['loiVersions']) == 2 and b1['loiVersions'][0]['loi'].startswith('[Verse 1]\nCon đường'), 'lời v1 còn nguyên, có thêm v2')
        check(b1['tieude'] == 'Mái Trường Làng Ngày Ấy | Nhạc Phòng Trà', 'tiêu đề cũ giữ nguyên (không tick ghi đè)')
        check(b1['promptSuno'] == 'nostalgic ballad', 'prompt Suno cũ giữ nguyên')

        print('5. Hộp chi tiết bài: phiên bản lời, so sánh')
        await pg.click('[data-tab=kho]')
        check(await pg.locator('.song').count() == 3, 'kho có 3 bài')
        await pg.click('.song[data-id="NPT-0001"]')
        await pg.click('.dtabs button[data-d=loi]')
        check(await pg.locator('#d-ds-loi .vrow').count() == 2, 'hiện 2 phiên bản lời')
        await pg.fill('#d-loi', (await pg.input_value('#d-loi')) + '\n[Outro]\nMái trường xưa')
        await pg.fill('#d-loi-ghichu', 'thêm outro')
        await pg.click('#d-luu-loi')
        check(await pg.locator('#d-ds-loi .vrow').count() == 3, 'lưu sửa tay thành v3')
        await pg.click('#d-luu-loi')
        check(await pg.locator('#d-ds-loi .vrow').count() == 3, 'lưu lại y hệt không tạo bản trùng')
        await pg.select_option('#d-ss-a', '1'); await pg.select_option('#d-ss-b', '3')
        await pg.click('#d-so-sanh')
        check(await pg.locator('#d-diff .dadd').count() >= 2 and await pg.locator('#d-diff .ddel').count() >= 1, 'so sánh v1→v3 có dòng thêm và bớt')
        await pg.screenshot(path=f'{SHOT}/03-loi-so-sanh.png')
        await pg.click('[data-chon-loi="1"]')
        check('đang dùng' in await pg.inner_text('#d-ds-loi .vrow:has-text("v1")'), 'chọn lại v1 làm bản đang dùng')

        print('6. Nhạc, điểm, trạng thái, lịch sử')
        await pg.click('.dtabs button[data-d=nhac]')
        await pg.fill('#d-nhac-link', 'https://suno.com/song/aaa'); await pg.fill('#d-nhac-ghichu', 'giọng nữ, hơi nhanh')
        await pg.click('#d-them-nhac')
        await pg.fill('#d-nhac-link', 'https://suno.com/song/bbb'); await pg.click('#d-them-nhac')
        await pg.fill('#d-nhac-link', 'suno.com/khong-https'); await pg.click('#d-them-nhac')
        check(await pg.locator('input[name=nhac-chon]').count() == 3, '2 phiên bản nhạc (link sai bị từ chối) + ô "chưa chọn"')
        await pg.check('input[name=nhac-chon][value="2"]')
        for k, v in zip(['loi', 'giaiDieu', 'caoTrao', 'camXuc', 'thuHut'], ['4', '4', '3', '4', '2']):
            await pg.select_option(f'select[data-diem={k}]', v)
        check('17' in await pg.inner_text('.tong') and 'Dưới 18' in await pg.inner_text('.tong'), 'tổng 17/25 bị đánh dấu chưa đạt')
        await pg.screenshot(path=f'{SHOT}/04-nhac-diem.png')
        await pg.click('.dtabs button[data-d=tt]')
        await pg.select_option('#d-tt-moi', '5')
        check('17/25' in await pg.inner_text('#d-canh-bao'), 'cảnh báo khi duyệt phát hành bài dưới 18 điểm')
        await pg.click('.dtabs button[data-d=nhac]'); await pg.select_option('select[data-diem=thuHut]', '4')
        await pg.click('.dtabs button[data-d=tt]'); await pg.select_option('#d-tt-moi', '5')
        check(await pg.inner_text('#d-canh-bao') == '', 'đủ 19 điểm + đã chọn nhạc: hết cảnh báo')
        await pg.fill('#d-tt-ghichu', 'nghe ổn, điệp khúc hay')
        await pg.click('#d-chuyen')
        check('Đã duyệt phát hành' in await pg.inner_text('.stp.cur'), 'chuyển sang Đã duyệt phát hành')
        await pg.screenshot(path=f'{SHOT}/05-trang-thai.png')
        await pg.click('.dtabs button[data-d=yt]')
        await pg.fill('[data-f=linkYoutube]', 'https://youtu.be/xyz')
        await pg.fill('[data-f=thumbnail]', 'https://example.com/a.jpg')
        await pg.click('.dtabs button[data-d=tt]'); await pg.select_option('#d-tt-moi', '6'); await pg.click('#d-chuyen')
        await pg.click('.dtabs button[data-d=ls]')
        ls = await pg.inner_text('#d-lich-su')
        check('nghe ổn' in ls and 'Đã đăng YouTube' in ls and 'kho cũ' in ls, 'lịch sử ghi đủ các lần chuyển, có ghi chú')
        b1 = await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2')).bai.find(b=>b.id==='NPT-0001')")
        check(b1['linkYoutube'] == 'https://youtu.be/xyz' and b1['ngayPhatHanh'], 'link YouTube lưu cùng lúc chuyển trạng thái, có ngày phát hành')
        check(b1['nhacChon'] == 2 and len(b1['nhacVersions']) == 2, 'bản nhạc phát hành là v2')

        print('7. Đóng hộp khi còn thay đổi chưa lưu phải hỏi')
        await pg.click('.dtabs button[data-d=yt]'); await pg.fill('[data-f=mota]', 'mô tả mới chưa lưu')
        n0 = len(dialogs); await pg.click('#d-dong')
        check(len(dialogs) == n0 + 1 and 'chưa lưu' in dialogs[-1], 'hỏi xác nhận khi đóng có thay đổi chưa lưu')

        print('8. Sao lưu, xóa, khôi phục, gộp')
        async with pg.expect_download() as dl:
            await pg.click('[data-tab=sao-luu]'); await pg.click('#btn-sao-luu')
        f = await (await dl.value).path()
        pkg = json.load(open(f))
        check(pkg['loai'] == 'npt-sao-luu' and len(pkg['kho']['bai']) == 3 and pkg['tienDoLich'].get('1:v0'), 'file sao lưu có 3 bài và tiến độ lịch')
        await pg.click('[data-tab=kho]'); await pg.click('.song[data-id="NPT-0002"]'); await pg.click('#d-xoa')
        check(await pg.locator('.song').count() == 2, 'xóa bài NPT-0002')
        snaps = await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-snapshots'))")
        check('Trước khi xóa NPT-0002' in snaps[0]['lyDo'], 'tự lưu trước khi xóa')
        await pg.click('[data-tab=sao-luu]')
        await pg.set_input_files('#file-khoi-phuc', f)
        await pg.wait_for_selector('#kp-xac-nhan')
        t = await pg.inner_text('#kp-xem-truoc')
        check('3 bài' in t, 'xem trước khôi phục: 3 bài')
        await pg.click('#kp-xac-nhan')
        check(await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2')).bai.length") == 3, 'khôi phục xong: lại có 3 bài')
        old = '/tmp/kho-cu-test.json'
        json.dump({'capNhat': '2026-11-17', 'bai': KHO_CU + [{"id": "mi3new", "tt": 0, "ten": "Bài từ máy khác", "loi": "[Chorus] x", "series": "mua", "tuan": 10}]}, open(old, 'w'), ensure_ascii=False)
        await pg.set_input_files('#file-gop', old)
        await pg.wait_for_selector('#gop-xac-nhan')
        t = await pg.inner_text('#gop-xem-truoc')
        check('thêm 1 bài' in t and 'bỏ qua 2' in t, 'gộp file kho cũ: thêm 1, bỏ qua 2 bài đã có')
        await pg.click('#gop-xac-nhan')
        kho = await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2'))")
        check(len(kho['bai']) == 4 and kho['bai'][-1]['id'] == 'NPT-0004', 'sau gộp có 4 bài, bài mới là NPT-0004')
        await pg.screenshot(path=f'{SHOT}/06-sao-luu.png', full_page=True)
        async with pg.expect_download() as dl2:
            await pg.click('#btn-xuat-json')
        kb = json.load(open(await (await dl2.value).path()))
        check(kb['schema'] == 2 and len(kb['bai']) == 4, 'xuất kho-bai.json cấu trúc mới')

        print('9. Trang khi trình duyệt chưa có dữ liệu: lấy từ data/kho-bai.json, không lỗi')
        await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(1000)
        check(await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2')).schema") == 2, 'tạo kho mới cấu trúc v2')

        await pg.set_viewport_size({'width': 390, 'height': 844})
        await pg.click('[data-tab=kho]'); await pg.screenshot(path=f'{SHOT}/07-dien-thoai.png')
        check(not errs, f'không có lỗi JavaScript ({errs})')
        await br.close()
    print(f'\nĐẠT {ok_count} kiểm tra.')

asyncio.run(main())
