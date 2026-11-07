<?php
declare(strict_types=1);
define('AMANAH_API', true);
require __DIR__ . '/lib.php';
date_default_timezone_set('Asia/Jakarta');
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'HEAD', 'POST'], true)) { http_response_code(405); header('Allow: GET, HEAD, POST'); exit; }
admin_start_session();
$errors = [];
$message = '';
$config = null;
$authenticated = false;
$flash = null;
$posts = [];
$editing = false;
$editId = 0;
$editPost = null;
$version = '';
$editorAvailable = true;
$conflict = false;
$schools = ['SEKOLAH AMANAH' => 'Semua jenjang', 'TK AMANAH' => 'KB/RA–TK Amanah', 'SD AMANAH' => 'SD Amanah', 'SMP AMANAH' => 'SMP Amanah', 'SMK AMANAH' => 'SMK Amanah'];
$categories = ['kegiatan' => 'Berita kegiatan', 'prestasi' => 'Berita prestasi', 'artikel' => 'Artikel'];
$values = ['title' => '', 'body' => '', 'school' => 'SEKOLAH AMANAH', 'category' => 'kegiatan', 'date' => date('Y-m-d')];
try {
    $config = admin_configuration();
    $authenticated = admin_authenticated($config);
    if ($authenticated && $method !== 'POST' && isset($_GET['edit'])) {
        $editing = true;
        $editId = admin_post_id(admin_text($_GET, 'edit'));
        $editPost = admin_find_post($editId);
        $version = amanah_post_version($editPost);
        foreach (['title', 'school', 'category'] as $key) { $values[$key] = $editPost[$key]; }
        $values['date'] = substr($editPost['date'], 0, 10);
        $values['body'] = admin_blocks_text($editPost['blocks']);
    }
    if ($method === 'POST') {
        $action = admin_text($_POST, 'action');
        if (!$authenticated && $action !== 'login') {
            http_response_code(401); $message = 'Masuk sebagai admin sebelum mengelola tulisan.';
        } elseif (!admin_csrf_valid()) {
            http_response_code(403); $message = 'Form sudah kedaluwarsa. Muat ulang halaman lalu coba lagi.';
        } elseif ($action === 'login') {
            $result = admin_login_attempt($config, admin_text($_POST, 'username'), admin_text($_POST, 'password'));
            if ($result === 'ok') { header('Location: /admin/', true, 303); exit; }
            http_response_code($result === 'limited' ? 429 : 422);
            if ($result === 'limited') { header('Retry-After: 900'); }
            $message = $result === 'limited' ? 'Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.' : 'Username atau password belum cocok.';
        } elseif ($action === 'logout') {
            $_SESSION = [];
            $cookie = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => $cookie['path'], 'secure' => $cookie['secure'], 'httponly' => true, 'samesite' => 'Strict']);
            session_destroy(); header('Location: /admin/', true, 303); exit;
        } elseif (in_array($action, ['publish', 'update'], true)) {
            $editing = $action === 'update';
            foreach ($values as $key => $_) { $values[$key] = admin_text($_POST, $key); }
            $submission = admin_text($_POST, 'submission');
            if (!preg_match('/^[a-f0-9]{32}$/D', $submission)) { throw new AdminValidation(['form' => 'Form tidak valid. Muat ulang halaman sebelum mencoba lagi.']); }
            if ($editing) {
                $editId = admin_post_id(admin_text($_POST, 'post_id'));
                $editPost = admin_find_post($editId);
                $version = admin_text($_POST, 'version');
                if (!preg_match('/^[a-f0-9]{64}$/D', $version)) { throw new AdminValidation(['form' => 'Versi tulisan tidak valid. Muat ulang halaman sebelum mencoba lagi.']); }
            }
            $operation = $action . ':' . $editId . ':' . $submission;
            if (isset($_SESSION['published'][$operation])) {
                $id = $_SESSION['published'][$operation];
            } else {
                $post = admin_post_fields($_POST, $editPost);
                if ($editing) {
                    if ($values['date'] === substr($editPost['date'], 0, 10)) { $post['date'] = $editPost['date']; }
                    $body = str_replace(["\r\n", "\r"], "\n", $values['body']);
                    if ($body === trim(admin_blocks_text($editPost['blocks']))) { $post['blocks'] = $editPost['blocks']; }
                    $post['image'] = admin_text($_POST, 'remove_photo') === '1' ? '' : $editPost['image'];
                }
                $photo = '';
                try {
                    $upload = $_FILES['photo'] ?? [];
                    if (!is_array($upload)) { throw new AdminValidation(['photo' => 'Pilih satu berkas foto yang valid.']); }
                    $photo = admin_save_photo($upload);
                    if ($photo !== '') { $post['image'] = $photo; }
                    $id = $editing ? amanah_update_post($editId, $post, $version) : amanah_publish_post($post, session_id() . ':' . $submission);
                } catch (Throwable $error) {
                    if ($photo !== '') { $file = dirname(__DIR__) . '/' . $photo; if (is_file($file)) { unlink($file); } }
                    throw $error;
                }
                $_SESSION['published'][$operation] = $id;
                if (count($_SESSION['published']) > 100) { $_SESSION['published'] = array_slice($_SESSION['published'], -100, null, true); }
            }
            $_SESSION['flash'] = ['id' => $id, 'updated' => $editing];
            header('Location: /admin/', true, 303); exit;
        } else {
            http_response_code(400); $message = 'Tindakan tidak dikenal.';
        }
    }
} catch (InvalidArgumentException $error) {
    http_response_code(400); $message = 'Nomor tulisan tidak valid. Pilih tulisan dari daftar di bawah.'; $editorAvailable = false;
} catch (AmanahPostNotFound $error) {
    http_response_code(404); $message = 'Tulisan tidak ditemukan. Pilih tulisan lain dari daftar di bawah.'; $editorAvailable = false;
} catch (AmanahPostConflict $error) {
    http_response_code(409); $message = 'Tulisan ini sudah diubah dari tab atau sesi lain. Salin isianmu, lalu muat versi terbaru sebelum menyimpan lagi.'; $conflict = true;
} catch (AdminValidation $error) {
    http_response_code(422); $errors = $error->errors; $message = 'Periksa isian yang ditandai. Tulisan belum tersimpan.';
} catch (Throwable $error) {
    http_response_code(503);
    $message = $config === null ? 'Panel admin belum siap. Hubungi pengelola website untuk mengaktifkannya.' : 'Tulisan belum tersimpan. Ada kendala penyimpanan; isi form tetap ditampilkan di bawah.';
    error_log('[Amanah Admin] Request unavailable: ' . get_class($error));
}
if ($authenticated) {
    $flash = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    try { $posts = amanah_read_file_content()['posts']; }
    catch (Throwable $error) { http_response_code(503); $message = 'Penyimpanan konten belum dapat dibaca. Jangan tutup halaman jika masih ada tulisan yang belum tersimpan.'; }
}
$escape = static fn($value) => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
if ($editPost && !isset($schools[$editPost['school']])) { $schools[$editPost['school']] = $editPost['school'] . ' (label asli)'; }
$attributes = static fn($name) => isset($errors[$name]) ? ' aria-invalid="true" aria-describedby="' . $name . '-error"' : '';
$fieldError = static function ($name) use ($errors, $escape): void { if (isset($errors[$name])) { echo '<p class="field-error" id="' . $name . '-error">' . $escape($errors[$name]) . '</p>'; } };
$csrf = $escape($_SESSION['csrf']);
$submission = bin2hex(random_bytes(16));
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= $authenticated ? ($editing ? 'Edit tulisan' : 'Tulis berita') : 'Masuk admin' ?> · Sekolah Amanah</title>
  <link rel="icon" href="/assets/logo-amanah.png">
  <link rel="stylesheet" href="/admin/admin.css?v=2">
  <script src="/admin/admin.js?v=2" defer></script>
</head>
<body>
  <a class="skip" href="#main">Lewati ke konten</a>
  <header class="admin-header">
    <a class="brand" href="/"><img src="/assets/logo-amanah.png" alt="" width="44" height="44"><span>Sekolah Amanah<small>Panel admin</small></span></a>
    <nav aria-label="Navigasi admin"><a href="/" target="_blank" rel="noopener">Lihat website</a><?php if ($authenticated): ?><form method="post"><input type="hidden" name="action" value="logout"><input type="hidden" name="csrf" value="<?= $csrf ?>"><button class="quiet" type="submit">Keluar</button></form><?php endif; ?></nav>
  </header>
  <main id="main" class="<?= $authenticated ? 'dashboard' : 'login-layout' ?>">
  <?php if ($message): ?><div class="notice error" role="alert"><strong><?= $escape($message) ?></strong><?php if ($errors): ?><ul><?php foreach ($errors as $key => $error): ?><li><?php if ($key !== 'form'): ?><a href="#<?= $escape($key) ?>"><?= $escape($error) ?></a><?php else: ?><?= $escape($error) ?><?php endif; ?></li><?php endforeach; ?></ul><?php endif; ?></div><?php endif; ?>
  <?php if (!$authenticated): ?>
    <section class="login-card" aria-labelledby="login-title">
      <p class="kicker">ADMIN SEKOLAH</p>
      <h1 id="login-title">Masuk admin</h1>
      <p class="intro">Tulis kabar, bagikan kegiatan, dan terbitkan artikel Sekolah Amanah.</p>
      <form method="post" class="login-form">
        <input type="hidden" name="action" value="login"><input type="hidden" name="csrf" value="<?= $csrf ?>">
        <div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="120" value="<?= $escape(admin_text($_POST, 'username')) ?>" autocapitalize="none" spellcheck="false"></div>
        <div class="field"><label for="password">Password</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button type="button" class="password-toggle" data-password-toggle aria-controls="password" aria-pressed="false" hidden>Tampilkan</button></div></div>
        <button class="primary" type="submit"<?= $config === null ? ' disabled' : '' ?>>Masuk admin</button>
      </form>
      <a class="back-link" href="/">Kembali ke website Amanah</a>
    </section>
  <?php else: ?>
    <div class="page-heading"><div><p class="kicker">KABAR AMANAH</p><h1>Kelola tulisan</h1><p>Kabar sekolah dan artikel untuk keluarga Amanah.</p></div><span class="signed-in">Masuk sebagai <?= $escape($config['username']) ?></span></div>
    <?php if ($flash): ?><div class="notice success" role="status"><strong><?= !empty($flash['updated']) ? 'Tulisan berhasil diperbarui.' : 'Tulisan berhasil diterbitkan.' ?></strong><a href="/?berita=<?= (int) $flash['id'] ?>#kabar" target="_blank" rel="noopener">Buka tulisan di website</a></div><?php endif; ?>
    <?php if ($conflict): ?><p class="reload-link"><a class="quiet" href="/admin/?edit=<?= $editId ?>">Muat versi terbaru</a></p><?php endif; ?>
    <?php if ($editorAvailable): ?>
    <section class="editor" aria-labelledby="editor-title">
      <div class="editor-heading"><h2 id="editor-title"><?= $editing ? 'Edit tulisan' : 'Buat tulisan baru' ?></h2><p>Isian bertanda <span aria-hidden="true">*</span> wajib diisi.</p></div>
      <form method="post" enctype="multipart/form-data" id="publish-form">
        <input type="hidden" name="action" value="<?= $editing ? 'update' : 'publish' ?>"><?php if ($editing): ?><input type="hidden" name="post_id" value="<?= $editId ?>"><input type="hidden" name="version" value="<?= $escape($version) ?>"><?php endif; ?><input type="hidden" name="csrf" value="<?= $csrf ?>"><input type="hidden" name="submission" value="<?= $submission ?>">
        <div class="field"><label for="title">Judul <span aria-hidden="true">*</span></label><input id="title" name="title" required minlength="5" maxlength="200" value="<?= $escape($values['title']) ?>" placeholder="Contoh: Kegiatan Literasi Siswa SMP Amanah"<?= $attributes('title') ?>><?php $fieldError('title'); ?></div>
        <div class="form-grid">
          <div class="field"><label for="category">Jenis tulisan <span aria-hidden="true">*</span></label><select id="category" name="category" required<?= $attributes('category') ?>><?php foreach ($categories as $key => $label): ?><option value="<?= $key ?>"<?= $values['category'] === $key ? ' selected' : '' ?>><?= $label ?></option><?php endforeach; ?></select><?php $fieldError('category'); ?></div>
          <div class="field"><label for="school">Jenjang sekolah <span aria-hidden="true">*</span></label><select id="school" name="school" required<?= $attributes('school') ?>><?php foreach ($schools as $key => $label): ?><option value="<?= $key ?>"<?= $values['school'] === $key ? ' selected' : '' ?>><?= $label ?></option><?php endforeach; ?></select><?php $fieldError('school'); ?></div>
          <div class="field"><label for="date">Tanggal tulisan <span aria-hidden="true">*</span></label><input type="date" id="date" name="date" required max="<?= date('Y-m-d') ?>" value="<?= $escape($values['date']) ?>"<?= $attributes('date') ?>><?php $fieldError('date'); ?></div>
        </div>
        <?php if ($editing && $editPost && $editPost['image'] !== ''): ?><div class="current-photo"><p>Foto saat ini</p><img src="<?= $escape(str_starts_with($editPost['image'], 'assets/') ? '/' . $editPost['image'] : $editPost['image']) ?>" alt="Foto utama tulisan saat ini" width="640" height="400"><label class="checkbox-label"><input type="checkbox" name="remove_photo" value="1" form="publish-form"<?= admin_text($_POST, 'remove_photo') === '1' ? ' checked' : '' ?>>Hapus foto saat ini</label></div><?php endif; ?>
        <?php if ($editing): ?><p class="help">Biarkan pilihan foto kosong untuk tetap memakai foto saat ini. Foto baru akan menggantikannya.</p><?php endif; ?>
        <div class="field"><label for="photo">Foto utama <span class="optional">opsional</span></label><p class="help" id="photo-help">JPEG, PNG, atau WebP. Maksimal 8 MB. Pilih foto dari galeri atau kamera.</p><input type="file" id="photo" name="photo" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help<?= isset($errors['photo']) ? ' photo-error' : '' ?>"<?= isset($errors['photo']) ? ' aria-invalid="true"' : '' ?>><?php $fieldError('photo'); ?><div class="photo-preview" id="photo-preview" hidden><img id="preview-image" alt="Pratinjau foto utama" width="640" height="400"><button type="button" class="quiet" id="remove-photo">Batalkan pilihan foto</button></div><p class="help" id="photo-status" aria-live="polite"></p></div>
        <div class="field"><label for="body">Isi tulisan <span aria-hidden="true">*</span></label><p class="help" id="body-help">Pisahkan paragraf dengan baris kosong. Untuk judul bagian, awali dengan #; subjudul dengan ##. Untuk daftar, awali dengan -.</p><textarea id="body" name="body" rows="14" required minlength="20" maxlength="100000" aria-describedby="body-help<?= isset($errors['body']) ? ' body-error' : '' ?>"<?= isset($errors['body']) ? ' aria-invalid="true"' : '' ?> placeholder="Tulis kegiatan, informasi, atau cerita sekolah di sini..."><?= $escape($values['body']) ?></textarea><?php $fieldError('body'); ?></div>
        <div class="publish-bar"><p><?= $editing ? 'Perubahan langsung tampil pada tulisan yang sama.' : 'Tulisan langsung tampil di website setelah diterbitkan.' ?></p><div class="editor-actions"><?php if ($editing): ?><a class="quiet" href="/admin/#recent-title">Batal edit</a><?php endif; ?><button class="primary" type="submit" id="publish-button"><?= $editing ? 'Simpan perubahan' : 'Terbitkan tulisan' ?></button></div></div>
      </form>
    </section>
    <?php endif; ?>
    <section class="recent" aria-labelledby="recent-title"><div class="recent-heading"><h2 id="recent-title">Semua tulisan</h2><span><?= count($posts) ?> tulisan terbit</span></div>
      <?php if (!$posts): ?><p class="empty">Belum ada tulisan. Mulai dari form di atas.</p><?php else: ?><ol class="post-list"><?php foreach ($posts as $post): ?><li><div><span class="post-kind"><?= $escape($categories[$post['category']] ?? $post['category']) ?></span><h3><a href="/?berita=<?= (int) $post['id'] ?>#kabar" target="_blank" rel="noopener"><?= $escape($post['title']) ?></a></h3><p><?= $escape($schools[$post['school']] ?? $post['school']) ?> · <time datetime="<?= $escape($post['date']) ?>"><?= $escape(substr($post['date'], 0, 10)) ?></time></p></div><div class="post-actions"><a class="quiet" href="/admin/?edit=<?= (int) $post['id'] ?>" aria-label="Edit <?= $escape($post['title']) ?>">Edit</a><a class="read-link" href="/?berita=<?= (int) $post['id'] ?>#kabar" target="_blank" rel="noopener" aria-label="Baca <?= $escape($post['title']) ?>">Baca tulisan</a></div></li><?php endforeach; ?></ol><?php endif; ?>
    </section>
  <?php endif; ?>
  </main>
  <footer class="admin-footer">Sekolah Amanah · Panel pengelolaan berita &amp; artikel</footer>
</body>
</html>
