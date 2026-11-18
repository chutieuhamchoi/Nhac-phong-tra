"""Kiểm thử tự đồng bộ GitHub → trình duyệt (Playwright + Chromium).

Giả lập file data/kho-bai.json trên GitHub bằng page.route, nên chạy được với máy chủ cục bộ
hoặc thẳng trên GitHub Pages:
    NPT_URL=https://chutieuhamchoi.github.io/Nhac-phong-tra/ python3 tests/kiem_thu_dong_bo.py
"""
import asyncio, json, os, copy
from playwright.async_api import async_playwright

URL = os.environ.get('NPT_URL', 'http://localhost:8765/')
BAI = {
    "id": "NPT-0001", "loai": "bai", "ten": "Có Những Ngày Chỉ Muốn Về Nhà", "series": "tuoi-tho", "tuan": 1,
    "ngayTao": "2026-11-18T15:06:07.306Z", "ngayCapNhat": "2026-11-18T15:06:07.306Z", "trangThai": 2,
    "lichSu": [{"tu": None, "den": 2, "luc": "2026-11-18T15:06:07.306Z", "ghiChu": "Duyệt lời V1"}],
    "loiVersions": [{"v": 1, "loi": "[Verse 1]\nV1", "nguon": "chatgpt", "luc": "2026-11-18T15:06:07.306Z", "ghiChu": ""}],
    "loiChon": 1, "promptSuno": "ballad", "nhacVersions": [], "nhacChon": None, "diem": {},
    "tieude": "Tiêu đề GitHub", "mota": "Mô tả", "tag": "#a"}
def kho(*bai): return {"schema": 2, "nextId": len(bai) + 1, "bai": list(bai)}

state = {"body": json.dumps(kho(BAI)), "status": 200, "abort": False, "hits": 0, "urls": []}
n_ok = 0
def check(c, m):
    global n_ok
    if not c: raise AssertionError('THẤT BẠI: ' + m)
    n_ok += 1; print('  ✓', m)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 1280, 'height': 900})
        async def route(r):
            state["hits"] += 1; state["urls"].append(r.request.url)
            if state["abort"]: await r.abort('internetdisconnected'); return
            await r.fulfill(status=state["status"], body=state["body"], content_type='application/json',
                            headers={'cache-control': 'max-age=600'})
        await ctx.route('**/data/kho-bai.json*', route)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        async def mo():
            await pg.reload(); await pg.wait_for_function('document.querySelector("#db-trang-thai").innerText.length > 0 && !/Đang đồng bộ/.test(document.querySelector("#db-trang-thai").innerText)')
        lsKho = lambda: pg.evaluate("() => JSON.parse(localStorage.getItem('npt-kho-v2'))")
        await pg.goto(URL + '#kho')
        await pg.wait_for_function('document.querySelector("#db-trang-thai").innerText.length > 0 && !/Đang đồng bộ/.test(document.querySelector("#db-trang-thai").innerText)')
        await pg.evaluate('localStorage.clear()')

        print('1. Trình duyệt mới, chưa có localStorage')
        state["hits"] = 0; state["urls"] = []
        await mo()
        check(await pg.locator('.song').count() == 1 and 'NPT-0001' in await pg.inner_text('#ds-kho'), 'Kho bài hiện NPT-0001')
        check('Có Những Ngày Chỉ Muốn Về Nhà' in await pg.inner_text('#ds-kho'), 'đúng tên bài')
        check(await pg.inner_text('#dem-kho') == '1', 'nhãn tab Kho bài = 1')
        t = await pg.inner_text('#db-trang-thai')
        check('1 bài mới' in t, 'thông báo đã nhận 1 bài mới')
        check(all('?t=' in u for u in state["urls"]), 'mọi lần tải kho-bai.json đều có tham số chống cache')
        hits = state["hits"]
        check(hits == 1, f'chỉ tải file GitHub 1 lần khi mở trang (thực tế {hits})')

        print('2. Tải lại nhiều lần không tạo bài trùng')
        for _ in range(3): await mo()
        check((await lsKho())['bai'].__len__() == 1, 'vẫn 1 bài sau 3 lần tải lại')
        check('không có gì mới' in await pg.inner_text('#db-trang-thai'), 'báo "không có gì mới"')

        print('3. Trình duyệt đã có kho rỗng')
        await pg.evaluate("localStorage.clear(); localStorage.setItem('npt-kho-v2', JSON.stringify({schema:2,nextId:1,bai:[]}))")
        await mo()
        check(await pg.locator('.song').count() == 1, 'kho rỗng → nhận NPT-0001')

        print('4. Trình duyệt đã có bài cũ, đổi tên bài GitHub và sửa lời: tải lại không trùng, không mất')
        await pg.click('.song[data-id="NPT-0001"]')
        await pg.fill('#d-ten', 'Tên tôi tự đặt'); await pg.click('#d-luu')
        await pg.click('.dtabs button[data-d=loi]')
        await pg.fill('#d-loi', '[Verse 1]\nSửa tay'); await pg.click('#d-luu-loi'); await pg.click('#d-dong')
        await mo()
        k = await lsKho()
        check(len(k['bai']) == 1 and k['bai'][0]['ten'] == 'Tên tôi tự đặt', 'đổi tên giữ nguyên, không nhân đôi')
        check(len(k['bai'][0]['loiVersions']) == 2, 'giữ 2 phiên bản lời')

        print('5. ChatGPT cập nhật bài trên GitHub (lời V2, trạng thái, tiêu đề)')
        moi = copy.deepcopy(BAI); moi.update(ngayCapNhat='2026-11-19T10:00:00.000Z', trangThai=3, tieude='Tiêu đề GitHub mới', loiChon=2)
        moi['loiVersions'].append({"v": 2, "loi": "[Verse 1]\nV2 từ ChatGPT", "nguon": "chatgpt", "luc": "2026-11-19T09:00:00.000Z", "ghiChu": "sửa điệp khúc"})
        bai2 = copy.deepcopy(BAI); bai2.update(id='NPT-0002', ten='Bà ngoại và giàn trầu', ngayTao='2026-11-19T10:00:00.000Z', ngayCapNhat='2026-11-19T10:00:00.000Z')
        state["body"] = json.dumps(kho(moi, bai2))
        await mo()
        k = await lsKho(); b = next(x for x in k['bai'] if x['id'] == 'NPT-0001')
        check(len(k['bai']) == 2, 'nhận thêm NPT-0002')
        check([x['loi'] for x in b['loiVersions']][-1] == '[Verse 1]\nV2 từ ChatGPT' and len(b['loiVersions']) == 3, 'lời V2 từ GitHub thành phiên bản 3, bản cũ còn')
        check(b['trangThai'] == 3 and b['tieude'] == 'Tiêu đề GitHub mới', 'nhận trạng thái và tiêu đề mới (trình duyệt chưa sửa hai mục này)')
        check(b['ten'] == 'Tên tôi tự đặt', 'tên tự đặt trong trình duyệt vẫn giữ')
        check(b['loiVersions'][b['loiChon'] - 1]['loi'] == '[Verse 1]\nSửa tay' and 'loiChonText' in b['xungDotGitHub'],
              'cả hai cùng đổi lời đang dùng: giữ lời "Sửa tay", ghi xung đột')

        print('6. Xung đột: cả hai cùng sửa tiêu đề')
        await pg.click('.song[data-id="NPT-0001"]'); await pg.click('.dtabs button[data-d=yt]')
        await pg.fill('#d-tieude', 'Tiêu đề trình duyệt'); await pg.click('#d-luu'); await pg.click('#d-dong')
        moi2 = copy.deepcopy(moi); moi2.update(ngayCapNhat='2026-11-20T10:00:00.000Z', tieude='Tiêu đề GitHub lần 3')
        state["body"] = json.dumps(kho(moi2, bai2))
        await mo()
        b = next(x for x in (await lsKho())['bai'] if x['id'] == 'NPT-0001')
        check(b['tieude'] == 'Tiêu đề trình duyệt' and b['xungDotGitHub']['tieude']['github'] == 'Tiêu đề GitHub lần 3', 'giữ bản trình duyệt, lưu kèm bản GitHub')
        check('Xung đột' in await pg.inner_text('#db-trang-thai'), 'cảnh báo xung đột ở tab Kho bài')
        await pg.click('.song[data-id="NPT-0001"]'); await pg.click('.dtabs button[data-d=ls]')
        check('Tiêu đề GitHub lần 3' in await pg.inner_text('#d-lich-su'), 'mục Lịch sử hiện hai bản để chọn')
        await pg.click('[data-xd-github=tieude]'); await pg.wait_for_timeout(300)
        b = next(x for x in (await lsKho())['bai'] if x['id'] == 'NPT-0001')
        check(b['tieude'] == 'Tiêu đề GitHub lần 3' and 'tieude' not in b.get('xungDotGitHub', {}), 'chọn "Dùng bản GitHub" áp dụng và xóa cảnh báo mục đó')
        await pg.click('[data-xd-giu=loiChonText]'); await pg.wait_for_timeout(200)
        b = next(x for x in (await lsKho())['bai'] if x['id'] == 'NPT-0001')
        check('xungDotGitHub' not in b and b['loiVersions'][b['loiChon'] - 1]['loi'] == '[Verse 1]\nSửa tay', 'chọn "Giữ bản trình duyệt" giữ lời và hết cảnh báo')
        check(await pg.input_value('#d-tieude') == 'Tiêu đề GitHub lần 3', 'ô tiêu đề trong hộp cập nhật theo')
        await pg.click('#d-dong')

        print('7. Trùng ID giữa bài trong trình duyệt và GitHub')
        await pg.evaluate("localStorage.clear()")
        await pg.evaluate("""() => localStorage.setItem('npt-kho-v2', JSON.stringify({schema:2,nextId:2,bai:[{id:'NPT-0001',ten:'Bài riêng trên máy',loiVersions:[{v:1,loi:'[Verse] máy',luc:'2026-11-17T00:00:00Z'}],ngayTao:'2026-11-17T00:00:00Z'}]}))""")
        state["body"] = json.dumps(kho(BAI))
        await mo()
        k = await lsKho()
        ten = {x['id']: x['ten'] for x in k['bai']}
        check(ten.get('NPT-0001') == 'Bài riêng trên máy' and ten.get('NPT-0002') == 'Có Những Ngày Chỉ Muốn Về Nhà', 'giữ cả hai: bài GitHub mang mã NPT-0002')
        t = await pg.inner_text('#db-trang-thai')
        check('Trùng mã bài' in t and 'trùng với bài' in t and 'Lịch sử' not in t, 'cảnh báo trùng mã rõ ràng, không bảo chọn bản')
        await mo()
        check(len((await lsKho())['bai']) == 2, 'tải lại vẫn 2 bài')

        print('8. Mất mạng / GitHub lỗi / JSON hỏng')
        state["abort"] = True; await mo()
        t = await pg.inner_text('#db-trang-thai')
        check('Không đồng bộ được' in t and 'mất mạng' in t, 'mất mạng: báo lỗi rõ')
        check(await pg.locator('.song').count() == 2, 'mất mạng: kho trong trình duyệt vẫn đủ 2 bài')
        state["abort"] = False; state["status"] = 404; await mo()
        check('404' in await pg.inner_text('#db-trang-thai'), 'GitHub trả 404: báo mã lỗi')
        state["status"] = 200; state["body"] = '{"schema":2, "bai": [ hỏng'; await mo()
        check('không phải JSON hợp lệ' in await pg.inner_text('#db-trang-thai'), 'JSON hỏng: báo lỗi, không đụng dữ liệu')
        state["body"] = json.dumps({"schema": 1, "bai": []}); await mo()
        check('schema 1' in await pg.inner_text('#db-trang-thai'), 'sai schema: báo lỗi')
        check(len((await lsKho())['bai']) == 2, 'sau mọi lỗi kho vẫn nguyên 2 bài')

        print('9. Nút "Đồng bộ lại" và tự lưu trước khi đồng bộ')
        state["body"] = json.dumps(kho(BAI, bai2))
        await pg.click('#btn-dong-bo'); await pg.wait_for_function('/bài mới/.test(document.querySelector("#db-trang-thai").innerText)')
        check(await pg.locator('.song').count() == 3, 'bấm Đồng bộ lại nhận thêm bài, không cần tải lại trang')
        snaps = await pg.evaluate("() => JSON.parse(localStorage.getItem('npt-snapshots'))")
        check(any('đồng bộ GitHub' in s['lyDo'] and s['soBai'] > 0 for s in snaps), 'có bản tự lưu (không rỗng) trước khi đồng bộ')

        check(not errs, f'không có lỗi JavaScript {errs}')
        await br.close()
    print(f'\nĐẠT {n_ok} kiểm tra.')

asyncio.run(main())
