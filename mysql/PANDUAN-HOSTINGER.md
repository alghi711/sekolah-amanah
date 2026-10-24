# Website pixel + MySQL di Hostinger

Paket ini untuk **website pixel asli, bukan tema WordPress**. Tampilan HTML, CSS, gambar, font, dan model 3D sama. PHP membaca konten dari MySQL; Node.js tidak diperlukan saat website berjalan di Hostinger.

## Isi paket

- `public_html/`: website dan endpoint PHP, termasuk `.htaccess`.
- `mysql/amanah.sql`: skema dan data awal 29 berita serta pengaturan partner/aset/konten.
- `amanah-private/database.example.php`: contoh konfigurasi, tanpa kredensial asli.

## Pemasangan

1. Buat backup file dan database website lama. Uji paket ini di staging atau subdomain dahulu. Jangan menimpa `public_html` WordPress yang sedang aktif sebelum siap menggantinya.
2. Di hPanel Hostinger buka **Database → Management/Pengelolaan**, lalu buat database MySQL dan pengguna khusus website pixel. Catat nama lengkap database dan pengguna, termasuk awalan akun Hostinger.
3. Buka database itu melalui phpMyAdmin, pilih **Import**, dan unggah `mysql/amanah.sql`. SQL tidak membuat database baru, tidak menghapus tabel, dan tidak menimpa baris yang sudah ada.
4. Upload isi `public_html/` dari paket ke folder website yang dituju. Pastikan `.htaccess` ikut terunggah. Untuk pemasangan baru, gunakan `.htaccess` paket ini. Jika folder sudah memiliki aturan sendiri, gabungkan dengan hati-hati; aturan WordPress lama tidak dipakai untuk website pixel.
5. Di folder **sejajar dengan public_html**, buat folder `amanah-private`. Salin `database.example.php` ke sana dan ubah namanya menjadi `database.php`.
6. Edit `database.php`: isi `database`, `username`, dan `password` dari Hostinger. Koneksi lokal menggunakan `host => localhost` dan `port => 3306`, kecuali Hostinger memberikan nilai berbeda. Simpan kredensial langsung di File Manager, tidak perlu mengirim password lewat chat.
7. Contoh susunan folder:

   ```text
   domains/sekolahamanah.sch.id/
     amanah-private/
       database.php
     public_html/
       .htaccess
       index.html
       content.js
       api/
       assets/
   ```

8. Pastikan PHP 8.0+ dan ekstensi `pdo_mysql` aktif. Buka `https://DOMAIN/api/content.php`. Koneksi benar jika status HTTP 200 dan muncul data JSON dengan 29 berita. Header respons `X-Amanah-Data: mysql` menandakan data berasal dari MySQL.
9. Periksa beranda dan empat profil. `.htaccess` mengarahkan `content.js` serta halaman profil ke PHP, tanpa mengubah tautan atau desain. Bersihkan cache hosting setelah pemasangan dan kecualikan `content.js`, `api/`, serta halaman profil dari cache statis/CDN yang mengabaikan `Cache-Control: no-store`.

## Apa yang memakai MySQL

- `amanah_posts`: berita, tanggal, jenjang, kategori, gambar dan blok isi artikel.
- `amanah_settings`: data partner, referensi aset dan metadata/salinan narasi profil dari snapshot konten.
- Beranda membaca berita dan partner dari database. Kartu berita pada profil TK/SD/SMP/SMK juga membaca database, dan membuka berita melalui dialog beranda yang sama.
- Layout, teks program, banner, alamat, dan narasi profil yang sudah ada tetap berada di HTML; memasang database tidak mengubahnya. Belum ada dashboard edit khusus. Pengelolaan data database dilakukan lewat phpMyAdmin.
- Formulir pendaftaran tetap Google Forms. Jawaban pendaftaran tidak disalin ke database ini.

## Saat database belum tersambung

Website masih menampilkan salinan `content.js` dan HTML profil sebagai cadangan, dengan header `X-Amanah-Data: fallback`. Endpoint JSON `/api/content.php` tetap mengembalikan HTTP 503 agar kegagalan koneksi tidak dianggap berhasil. Respons publik dan log aplikasi tidak menampilkan password atau detail koneksi.

Munculnya website saja **belum membuktikan MySQL aktif**. Periksa endpoint dan header pada langkah 8.

## Pengembangan

- `node mysql/build.cjs`: buat ulang SQL dan folder paket Hostinger dari project terbaru.
- `node mysql/check.cjs`: pemeriksaan data, PHP dan endpoint lokal. Uji pembaca SQL menggunakan PDO SQLite hanya untuk fixture lokal; bukan bukti impor berhasil pada server MySQL Hostinger.
- Mode statis yang sudah tayang di Wasmer dan `node server.cjs` tetap memakai file lokal. Paket Hostinger ini memakai PHP + MySQL. Hosting statis Wasmer yang lama belum diubah atau dihubungkan ke MySQL.
- Konfigurasi privat bisa ditempatkan di lokasi lain dengan variabel server `AMANAH_DB_CONFIG` yang berisi path absolut file konfigurasi.

Kredensial dan akses hosting belum tersedia pada saat paket dibuat; koneksi MySQL Hostinger dan konfigurasi rewrite LiteSpeed/Apache perlu diperiksa setelah pemasangan. Uji endpoint, pencarian, artikel, dan profil sebelum mengganti website utama.

Referensi resmi: [buat database Hostinger](https://www.hostinger.com/support/1583542-how-to-create-a-new-mysql-database-in-hostinger/), [impor melalui phpMyAdmin](https://support.hostinger.com/en/articles/1864324-how-to-upload-and-set-up-your-database-at-hostinger), [PDO MySQL](https://www.php.net/manual/en/ref.pdo-mysql.php).
