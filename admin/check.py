"""Run the admin HTTP checks against an isolated PHP fixture."""
import concurrent.futures
import http.cookiejar
import html as html_module
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import struct
import tempfile
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import zlib

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('PHP_BINARY', 'php')
def png_chunk(kind, body):
    return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))


PHOTO = b'\x89PNG\r\n\x1a\n' + png_chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)) + png_chunk(b'IDAT', zlib.compress(b'\x00\x18\x70\x44')) + png_chunk(b'IEND', b'')


class AdminHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix='amanah-admin-test-')
        cls.folder = Path(cls.temp.name)
        cls.public = cls.folder / 'public_html'
        cls.public.mkdir()
        for name in ['api', 'admin']:
            if (ROOT / name).exists():
                shutil.copytree(ROOT / name, cls.public / name, ignore=shutil.ignore_patterns('check.py', '__pycache__'))
        for name in ['content.js', 'index.html', 'tk.html', 'sd.html', 'smp.html', 'smk.html']:
            shutil.copy(ROOT / name, cls.public / name)
        cls.private = cls.folder / 'amanah-private'
        cls.private.mkdir()
        seed = (ROOT / 'content.js').read_text().split('=', 1)[1].strip().rstrip(';')
        cls.original = json.loads(seed)
        (cls.private / 'content.json').write_text(seed)
        hashed = subprocess.check_output([PHP, '-r', 'echo password_hash(stream_get_contents(STDIN), PASSWORD_DEFAULT);'], input=b'test-password-only').decode()
        (cls.private / 'admin-config.php').write_text("<?php if (!defined('AMANAH_API')) { http_response_code(404); exit; } return " + "['username'=>'Admin','password_hash'=>'" + hashed + "'];")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.url = 'http://127.0.0.1:' + str(port)
        cls.log = (cls.folder / 'php.log').open('w+')
        cls.sessions = cls.folder / 'sessions'
        cls.sessions.mkdir()
        cls.server = subprocess.Popen([PHP, '-d', 'session.save_path=' + str(cls.sessions), '-d', 'upload_max_filesize=10M', '-d', 'post_max_size=12M', '-S', '127.0.0.1:' + str(port), '-t', str(cls.public), str(ROOT / 'hosting/router.php')], env={**os.environ, 'AMANAH_PRIVATE_DIR': str(cls.private)}, stdout=cls.log, stderr=cls.log)
        for _ in range(80):
            try:
                urllib.request.urlopen(cls.url + '/', timeout=1).close()
                break
            except (OSError, urllib.error.URLError):
                time.sleep(.05)

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.log.close()
        cls.temp.cleanup()

    def setUp(self):
        self.jar = http.cookiejar.CookieJar()
        self.client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def request(self, path='/admin/', fields=None, photo=None, raw=None, content_type=None):
        headers = {}
        data = raw
        if photo is not None:
            boundary = 'amanah-test-multipart-boundary'
            pieces = []
            for name, value in fields.items():
                pieces.append(('Content-Disposition: form-data; name="' + name + '"\r\n\r\n' + value).encode())
            filename, mime, body = photo
            pieces.append(('Content-Disposition: form-data; name="photo"; filename="' + filename + '"\r\nContent-Type: ' + mime + '\r\n\r\n').encode() + body)
            data = b''.join(b'--' + boundary.encode() + b'\r\n' + item + b'\r\n' for item in pieces) + b'--' + boundary.encode() + b'--\r\n'
            headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
        elif fields is not None:
            data = urllib.parse.urlencode(fields).encode()
        if content_type:
            headers['Content-Type'] = content_type
        request = urllib.request.Request(self.url + path, data=data, headers=headers)
        try:
            response = self.client.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            return response.status, response.read().decode(errors='replace'), response.headers

    def token(self, html, name='csrf'):
        match = re.search(r'name="' + name + r'" value="([a-f0-9]+)"', html)
        self.assertIsNotNone(match, 'Expected form token ' + name)
        return match[1]

    def login(self):
        status, html, _ = self.request()
        self.assertEqual(status, 200)
        status, html, headers = self.request(fields={'action': 'login', 'csrf': self.token(html), 'username': 'Admin', 'password': 'test-password-only'})
        self.assertEqual(status, 200)
        self.assertIn('Terbitkan tulisan', html)
        return html

    def form(self, html, title='Berita uji lokal Amanah'):
        return {'action': 'publish', 'csrf': self.token(html), 'submission': self.token(html, 'submission'), 'title': title, 'body': 'Paragraf pertama dengan kutipan "siswa" dan <script>alert(1)</script>.\n\nParagraf kedua, kerja sama dan prestasi.', 'school': 'SMK AMANAH', 'category': 'prestasi', 'date': '2026-11-01'}

    def editing_form(self, html):
        fields = {'action': 'update'}
        for name in ['csrf', 'submission', 'post_id', 'version', 'title', 'date']:
            match = re.search(r'name="' + name + r'"[^>]*value="([^"]*)"', html)
            self.assertIsNotNone(match, 'Expected edit field ' + name)
            fields[name] = html_module.unescape(match[1])
        for name in ['school', 'category']:
            select = re.search(r'<select[^>]*name="' + name + r'"[^>]*>(.*?)</select>', html, re.S)[1]
            fields[name] = re.search(r'<option value="([^"]*)" selected', select)[1]
        fields['body'] = html_module.unescape(re.search(r'<textarea[^>]*name="body"[^>]*>(.*?)</textarea>', html, re.S)[1])
        return fields

    def create_edit_fixture(self, photo=True):
        html = self.login()
        title = 'Tulisan untuk ' + self.id().split('.')[-1]
        fields = self.form(html, title)
        status, _, _ = self.request(fields=fields, photo=('original.png', 'image/png', PHOTO) if photo else None)
        self.assertEqual(status, 200)
        data = json.loads(self.request('/api/content.php')[1])
        post = next(p for p in data['posts'] if p['title'] == title)
        return post, len(data['posts'])

    def test_06_edit_prefill_and_preserve_existing_image(self):
        post, count = self.create_edit_fixture()
        status, html, _ = self.request('/admin/?edit=' + str(post['id']))
        self.assertEqual(status, 200)
        self.assertIn('Edit tulisan', html)
        self.assertIn('Foto saat ini', html)
        fields = self.editing_form(html)
        fields['title'] = 'Judul berubah dari form edit'
        fields['school'] = 'SMP AMANAH'
        fields['category'] = 'artikel'
        self.assertEqual(self.request(fields=fields)[0], 200)
        data = json.loads(self.request('/api/content.php')[1])
        self.assertEqual(len(data['posts']), count)
        saved = next(p for p in data['posts'] if p['id'] == post['id'])
        self.assertEqual(saved, {**post, 'title': fields['title'], 'school': 'SMP AMANAH', 'category': 'artikel'})
        self.assertIn(fields['title'], self.request('/smp.html')[1])
        self.assertNotIn(fields['title'], self.request('/smk.html')[1])
        self.assertIn('Tulisan berhasil diperbarui', self.request(fields=fields)[1])

    def test_06_edit_replace_remove_photo_and_body(self):
        post, count = self.create_edit_fixture()
        fields = self.editing_form(self.request('/admin/?edit=' + str(post['id']))[1])
        fields['body'] = '# Subjudul utama\n\nIsi artikel yang sudah diperbarui dari panel admin.\n\n## Bagian kedua\n\n- Butir pertama'
        status, html, _ = self.request(fields=fields, photo=('replacement.png', 'image/png', PHOTO))
        self.assertEqual(status, 200)
        self.assertIn('Tulisan berhasil diperbarui', html)
        saved = next(p for p in json.loads(self.request('/api/content.php')[1])['posts'] if p['id'] == post['id'])
        self.assertNotEqual(saved['image'], post['image'])
        self.assertTrue((self.public / post['image']).exists())
        self.assertEqual([b['type'] for b in saved['blocks']], ['h2', 'p', 'h3', 'li'])
        fields = self.editing_form(self.request('/admin/?edit=' + str(post['id']))[1])
        fields['remove_photo'] = '1'
        self.assertEqual(self.request(fields=fields)[0], 200)
        data = json.loads(self.request('/api/content.php')[1])
        self.assertEqual(len(data['posts']), count)
        self.assertEqual(next(p for p in data['posts'] if p['id'] == post['id'])['image'], '')
        self.assertTrue((self.public / saved['image']).exists())

    def test_06_edit_conflict_keeps_newer_content(self):
        post, _ = self.create_edit_fixture()
        first = self.editing_form(self.request('/admin/?edit=' + str(post['id']))[1])
        stale = self.editing_form(self.request('/admin/?edit=' + str(post['id']))[1])
        first['title'] = 'Judul terbaru disimpan dari tab pertama'
        self.assertEqual(self.request(fields=first)[0], 200)
        before_images = set((self.public / 'assets/uploads').glob('*'))
        stale['title'] = 'Judul basi dari tab kedua'
        status, html, _ = self.request(fields=stale, photo=('stale.png', 'image/png', PHOTO))
        self.assertEqual(status, 409)
        self.assertIn('sudah diubah', html)
        self.assertIn(stale['title'], html)
        self.assertEqual(set((self.public / 'assets/uploads').glob('*')), before_images)
        saved = next(p for p in json.loads(self.request('/api/content.php')[1])['posts'] if p['id'] == post['id'])
        self.assertEqual(saved['title'], first['title'])

    def test_06_edit_authorization_csrf_and_missing_id(self):
        self.assertEqual(self.request(fields={'action': 'update', 'post_id': '20261101'})[0], 401)
        status, html, _ = self.request('/admin/?edit=20261101')
        self.assertEqual(status, 200)
        self.assertNotIn('name="post_id"', html)
        self.login()
        self.assertEqual(self.request('/admin/?edit=999999999999999')[0], 404)
        self.assertEqual(self.request('/admin/?edit=not-an-id')[0], 400)
        fields = self.editing_form(self.request('/admin/?edit=20261101')[1])
        fields['csrf'] = 'invalid'
        self.assertEqual(self.request(fields=fields)[0], 403)

    def test_06_edit_invalid_photo_and_noop_keep_saved_blocks(self):
        post, _ = self.create_edit_fixture()
        fields = self.editing_form(self.request('/admin/?edit=' + str(post['id']))[1])
        status, _, _ = self.request(fields=fields, photo=('attack.php', 'image/png', b'<?php echo 1; ?>'))
        self.assertEqual(status, 422)
        self.assertEqual(next(p for p in json.loads(self.request('/api/content.php')[1])['posts'] if p['id'] == post['id']), post)
        status, _, _ = self.request(fields=fields)
        self.assertEqual(status, 200)
        self.assertEqual(next(p for p in json.loads(self.request('/api/content.php')[1])['posts'] if p['id'] == post['id']), post)

    def test_06_edit_links_include_older_articles(self):
        html = self.login()
        for post in self.original['posts']:
            self.assertIn('/admin/?edit=' + str(post['id']), html)

    def test_06_edit_legacy_school_keeps_original_label(self):
        self.login()
        for original in self.original['posts']:
            if original['school'] not in ['AMANAH', 'AMANAH TALENT SHOW']:
                continue
            fields = self.editing_form(self.request('/admin/?edit=' + str(original['id']))[1])
            self.assertEqual(fields['school'], original['school'])
            fields['title'] = original['title'] + ' diperbarui'
            self.assertEqual(self.request(fields=fields)[0], 200)
            saved = next(p for p in json.loads(self.request('/api/content.php')[1])['posts'] if p['id'] == original['id'])
            self.assertEqual(saved, {**original, 'title': fields['title']})

    def test_01_login_and_unauthorized_write(self):
        status, html, headers = self.request()
        self.assertEqual(status, 200)
        self.assertIn('Masuk admin', html)
        self.assertIn('no-store', headers['Cache-Control'])
        status, _, _ = self.request(fields={'action': 'publish'})
        self.assertEqual(status, 401)
        status, html, _ = self.request()
        status, html, _ = self.request(fields={'action': 'login', 'csrf': self.token(html), 'username': 'Admin', 'password': 'wrong'})
        self.assertEqual(status, 422)
        self.assertNotIn('Terbitkan tulisan', html)

    def test_02_csrf_and_private_helpers(self):
        html = self.login()
        fields = self.form(html)
        fields['csrf'] = 'bad'
        status, _, _ = self.request(fields=fields)
        self.assertEqual(status, 403)
        for path in ['/api/storage.php', '/api/database.php', '/admin/lib.php', '/amanah-private/admin-config.php']:
            status, html, _ = self.request(path)
            self.assertIn(status, [403, 404], path)
            self.assertNotIn('password_hash', html)

    def test_03_publish_photo_and_preserve_content(self):
        html = self.login()
        fields = self.form(html)
        status, html, _ = self.request(fields=fields, photo=('../../script.php.png', 'image/png', PHOTO + b'<?php echo "bad"; ?>'))
        self.assertEqual(status, 200, re.findall(r'class="field-error"[^>]*>([^<]+)', html))
        self.assertIn('Tulisan berhasil diterbitkan', html)
        status, body, headers = self.request('/api/content.php')
        self.assertEqual(status, 200)
        data = json.loads(body)
        post = next(post for post in data['posts'] if post['title'] == fields['title'])
        self.assertRegex(post['image'], r'^assets/uploads/[a-z0-9-]+\.png$')
        image = (self.public / post['image']).read_bytes()
        self.assertTrue(image.startswith(b'\x89PNG'))
        self.assertNotIn(b'<?php', image)
        self.assertEqual(post['blocks'][0]['text'], fields['body'].split('\n\n')[0])
        self.assertNotIn('_submissions', data)
        for old in self.original['posts']:
            self.assertEqual(old, next(post for post in data['posts'] if post['id'] == old['id']))
        status, profile, _ = self.request('/smk.html')
        self.assertEqual(status, 200)
        self.assertIn(fields['title'], profile)
        self.assertEqual(headers['X-Amanah-Data'], 'file')
        self.assertTrue(list((self.private / 'backups').glob('*.json')))
        status, _, _ = self.request(fields=fields, photo=('again.png', 'image/png', PHOTO))
        self.assertEqual(status, 200)
        data = json.loads(self.request('/api/content.php')[1])
        self.assertEqual(sum(post['title'] == fields['title'] for post in data['posts']), 1)

    def test_04_invalid_images_and_fields(self):
        html = self.login()
        for photo in [('attack.php', 'image/png', b'<?php echo 1; ?>'), ('fake.svg', 'image/svg+xml', b'<svg onload="alert(1)"></svg>'), ('huge.png', 'image/png', b'x' * (8 * 1024 * 1024 + 1))]:
            status, _, _ = self.request(fields=self.form(html), photo=photo)
            self.assertEqual(status, 422)
        for name, value in [('title', ''), ('body', ''), ('school', '../../private'), ('category', 'other'), ('date', '2026-02-31')]:
            fields = self.form(html)
            fields[name] = value
            self.assertEqual(self.request(fields=fields)[0], 422, name)

    def test_05_article_kind_logout(self):
        html = self.login()
        fields = self.form(html, 'Artikel uji lokal Amanah')
        fields['category'] = 'artikel'
        self.assertEqual(self.request(fields=fields)[0], 200)
        data = json.loads(self.request('/api/content.php')[1])
        self.assertEqual(next(post for post in data['posts'] if post['title'] == fields['title'])['category'], 'artikel')
        status, html, _ = self.request(fields={'action': 'logout', 'csrf': self.token(html)})
        self.assertEqual(status, 200)
        self.assertIn('Masuk admin', html)
        self.assertEqual(self.request(fields=fields)[0], 401)

    def test_06_corrupt_store_does_not_overwrite(self):
        html = self.login()
        file = self.private / 'content.json'
        previous = file.read_bytes()
        file.write_text('{broken')
        try:
            status, _, _ = self.request(fields=self.form(html))
            self.assertEqual(status, 503)
            self.assertEqual(file.read_text(), '{broken')
        finally:
            file.write_bytes(previous)

    def test_06_concurrent_publish_and_idempotency(self):
        code = "define('AMANAH_API',true);require $argv[1];$x=json_decode(stream_get_contents(STDIN),true);echo amanah_publish_post($x['post'],$x['submission']);"
        def publish(index):
            post = {'title': 'Concurrent article ' + str(index), 'school': 'SMK AMANAH', 'category': 'artikel', 'date': '2026-11-01T12:00:00', 'image': '', 'blocks': [{'type': 'p', 'text': 'Independent concurrent article.'}]}
            return subprocess.check_output([PHP, '-r', code, str(self.public / 'api/storage.php')], input=json.dumps({'post': post, 'submission': 'concurrent-test-' + str(index)}).encode(), env={**os.environ, 'AMANAH_PRIVATE_DIR': str(self.private)})
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            ids = list(pool.map(publish, range(4)))
        self.assertEqual(len(set(ids)), 4)
        self.assertEqual(publish(0), ids[0])
        data = json.loads(self.request('/api/content.php')[1])
        for index in range(4):
            self.assertEqual(sum(post['title'] == 'Concurrent article ' + str(index) for post in data['posts']), 1)

    def test_06_session_expiry(self):
        self.login()
        cookie = next(cookie for cookie in self.jar if cookie.name == 'amanah_admin')
        code = "session_save_path($argv[1]);session_name('amanah_admin');session_id($argv[2]);session_start();$_SESSION['last_seen']=time()-3601;session_write_close();"
        subprocess.check_call([PHP, '-r', code, str(self.sessions), cookie.value])
        status, html, _ = self.request()
        self.assertEqual(status, 200)
        self.assertIn('Masuk admin', html)
        self.assertNotIn('Terbitkan tulisan', html)

    def test_06_semantic_corruption_is_not_overwritten(self):
        html = self.login()
        file = self.private / 'content.json'
        previous = file.read_bytes()
        for name, value in [('title', ['invalid']), ('date', 'broken'), ('image', '../private'), ('blocks', [{'type': 'p', 'text': ['not text']}])]:
            data = json.loads(previous)
            data['posts'][0][name] = value
            corrupted = json.dumps(data).encode()
            file.write_bytes(corrupted)
            try:
                self.assertEqual(self.request(fields=self.form(html))[0], 503, name)
                self.assertEqual(file.read_bytes(), corrupted, name)
            finally:
                file.write_bytes(previous)

    def test_06_store_size_limit_is_atomic(self):
        html = self.login()
        file = self.private / 'content.json'
        previous = file.read_bytes()
        data = json.loads(previous)
        data['padding'] = ''
        empty = json.dumps(data).encode()
        data['padding'] = 'x' * (32 * 1024 * 1024 - len(empty) - 100)
        near_limit = json.dumps(data).encode()
        self.assertLess(len(near_limit), 32 * 1024 * 1024)
        file.write_bytes(near_limit)
        try:
            self.assertEqual(self.request(fields=self.form(html))[0], 503)
            self.assertEqual(file.read_bytes(), near_limit)
        finally:
            file.write_bytes(previous)

    def test_06_json_objects_cannot_replace_lists(self):
        html = self.login()
        file = self.private / 'content.json'
        previous = file.read_bytes()
        variants = []
        for key in ['partners', 'profiles', 'posts']:
            data = json.loads(previous)
            data[key] = {'broken': data[key][0]}
            variants.append(data)
        data = json.loads(previous)
        data['posts'][0]['blocks'] = {'broken': data['posts'][0]['blocks'][0]}
        variants.append(data)
        data = json.loads(previous)
        data['profiles'][0]['paragraphs'] = {'broken': 'Invalid list shape'}
        variants.append(data)
        for data in variants:
            invalid = json.dumps(data).encode()
            file.write_bytes(invalid)
            try:
                self.assertEqual(self.request(fields=self.form(html))[0], 503)
                self.assertEqual(file.read_bytes(), invalid)
            finally:
                file.write_bytes(previous)

    def test_07_rate_limit(self):
        attempts = self.private / 'login-attempts'
        if attempts.exists():
            shutil.rmtree(attempts)
        for _ in range(5):
            _, html, _ = self.request()
            status, _, _ = self.request(fields={'action': 'login', 'csrf': self.token(html), 'username': 'Admin', 'password': 'wrong'})
            self.assertEqual(status, 422)
        _, html, _ = self.request()
        status, _, headers = self.request(fields={'action': 'login', 'csrf': self.token(html), 'username': 'Admin', 'password': 'test-password-only'})
        self.assertEqual(status, 429)
        self.assertIn('Retry-After', headers)


if __name__ == '__main__':
    unittest.main(verbosity=2)
