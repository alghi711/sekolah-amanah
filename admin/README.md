# Admin berita dan artikel

Alamat panel: `https://sekolahamanah.sch.id/admin/`. Tautan **Login admin** tersedia pada footer beranda.

Admin dapat menambah berita kegiatan, berita prestasi, atau artikel; memilih jenjang dan tanggal; menulis isi; dan mengunggah satu foto utama. Tombol **Terbitkan tulisan** langsung menayangkan konten di Kabar Amanah dan, untuk jenjang tertentu, kartu berita pada halaman profil.

Untuk mengubah tulisan, cari pada **Semua tulisan**, pilih **Edit**, lalu **Simpan perubahan**. Judul, isi, jenis, jenjang, tanggal dan foto dapat diubah. Biarkan unggahan kosong untuk mempertahankan foto, pilih foto baru untuk menggantinya, atau centang **Hapus foto saat ini** untuk mengosongkannya. Tautan tulisan tetap sama. **Batal edit** kembali ke daftar tanpa menyimpan. Bila tulisan sudah diubah dari tab lain, form menolak perubahan lama dan menyediakan tautan **Muat versi terbaru**; salin isian sebelum memuat ulang. Setiap penyimpanan membuat cadangan privat; foto lama tetap tersedia untuk pemulihan. Penghapusan tulisan dan pengelolaan banyak akun belum termasuk panel ini.

## Persyaratan Hostinger

- PHP 8.0+ dengan `session`, `mbstring`, `fileinfo`, dan `gd` (JPEG/PNG/WebP).
- HTTPS aktif. Cookie login `HttpOnly`, `SameSite=Strict`, dan `Secure` pada HTTPS.
- `upload_max_filesize` minimal `8M`, `post_max_size` minimal `12M`, disarankan `memory_limit` minimal `256M`.
- Proses PHP dapat menulis ke `amanah-private/` dan `public_html/assets/uploads/`.

## Pemasangan pertama

1. Cadangkan website. Jalankan `node mysql/build.cjs` untuk menyiapkan paket Hostinger terbaru.
2. Unggah file publik dari paket, termasuk folder `admin/`, `api/`, `assets/uploads/.htaccess`, dan `.htaccess` root. Aturan PHP tetap menangani `content.js` serta empat halaman profil. Bila sudah ada aturan khusus di hosting, gabungkan sebelum menggantinya.
3. Buat folder `amanah-private` sejajar dengan `public_html`, bukan di dalamnya.
4. Salin `content.initial.json` dari paket ke folder privat lalu namai `content.json`. Ini hanya untuk pemasangan pertama. Pada hosting yang sudah mempunyai konten aktif, migrasikan data aktif dan jangan timpa dengan snapshot lama.
5. Salin `admin-config.example.php` ke folder privat sebagai `admin-config.php`. Isi username dan hash password yang dibuat dengan `password_hash($password, PASSWORD_DEFAULT)` pada PHP lokal tepercaya. Password asli tidak boleh dimasukkan ke repository, JavaScript, atau alat hash online.
6. Folder privat disarankan memiliki izin `0700`; file konfigurasi dan konten `0600`, dengan pemilik yang sama dengan proses PHP. Unggahan publik `0644` dan foldernya `0755`.
7. Buka `/api/content.php`: harus HTTP 200 dan header `X-Amanah-Data: file`. Periksa 30 tulisan awal sebelum mulai menambah konten.
8. Buka `/admin/`, login, dan periksa panel. Jangan memublikasikan tulisan contoh ke website sekolah yang aktif.

```text
domain/
  amanah-private/
    admin-config.php       # username dan hash; bukan password asli
    content.json           # sumber konten aktif
    content.lock           # dibuat saat menulis
    login-attempts/        # pembatasan percobaan login
    backups/               # salinan sebelum setiap penerbitan
  public_html/
    .htaccess
    admin/
    api/
    assets/uploads/
```

## Menulis dan mengunggah

- Judul 5–200 karakter, isi 20–100.000 karakter, tanggal maksimal hari ini (Asia/Jakarta).
- Pisahkan paragraf dengan baris kosong. Awali subjudul dengan `## ` dan butir daftar dengan `- `.
- Foto opsional: JPEG, PNG, WebP, maksimal 8 MB, 30 megapiksel, sisi maksimal 12.000 piksel. Foto ditulis ulang sebagai gambar, namanya diacak, orientasi JPEG disesuaikan, dan sisi terpanjang diperkecil hingga 2048 piksel. Metadata berkas tidak disalin.
- Sesi berakhir setelah tidak aktif satu jam atau setelah delapan jam. Lima login gagal dari satu alamat IP membatasi login selama 15 menit.
- Setiap penerbitan memerlukan token CSRF. Permintaan ulang tidak membuat duplikat. Penulisan memakai lock dan penggantian atomik; batas penyimpanan konten 32 MB diperiksa sebelum penggantian.

## Pembaruan dan cadangan

Saat memperbarui kode, unggah file aplikasi yang berubah saja. **Jangan unggah ulang `content.json` atau `admin-config.php` ke instalasi aktif.** `content.initial.json` hanyalah data awal, tidak dibaca otomatis oleh aplikasi.

Sebelum migrasi, cadangkan `amanah-private/` secara privat dan `assets/uploads/`. Cadangan per penerbitan berada di `amanah-private/backups/`. Pemulihan dilakukan saat tidak ada penulisan aktif: salin cadangan yang telah diperiksa sebagai `content.json`, lalu verifikasi endpoint publik.

Jika JSON privat belum terpasang, endpoint memakai jalur MySQL lama atau salinan statis saat MySQL tidak tersedia. Jika konten privat rusak, penerbitan ditolak dan data tidak ditimpa; hubungi pengelola untuk memulihkan cadangan.

## Pemeriksaan lokal

```sh
node check.cjs
PHP_BINARY=/path/to/php python3 admin/check.py
```

Tes membuat folder dan akun contoh sementara, lalu memeriksa login, CSRF, sesi kedaluwarsa, pembatasan login, foto palsu/berukuran besar, publikasi tanpa duplikat, penulisan bersamaan, JSON rusak, batas ukuran, dan keberadaan berita lama. Tidak menulis ke website publik.

Untuk pratinjau, gunakan server PHP dengan root folder paket `public_html` dan router `hosting/router.php`. `server.cjs` hanya melayani versi statis dan tidak menjalankan PHP.
