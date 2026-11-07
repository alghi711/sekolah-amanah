# Edit berita dan artikel admin

**Tujuan:** Admin dapat memilih tulisan yang sudah terbit, mengubah judul/isi/jenis/jenjang/tanggal, mengganti atau mengosongkan foto, lalu menyimpan perubahan langsung ke website.

**Pendekatan:** Pakai sesi, CSRF, form, penyimpanan JSON privat dan cadangan yang sudah ada. `/admin/?edit=ID` memuat form. Penyimpanan mempertahankan ID, URL, foto bila tidak diganti, waktu tanggal bila hari tidak diubah, serta blok isi asli bila textarea tidak diubah. Hash versi tulisan diperiksa di dalam lock untuk menolak edit basi (HTTP 409). Semua tulisan tampil dengan tautan Edit agar berita lama juga terjangkau. Tidak ada perubahan akun/kredensial atau pengunggahan ulang data live.

**Tampilan:** Ikuti gaya admin Amanah sebelumnya, dengan tombol Edit dan Simpan perubahan, tautan Batal edit, foto saat ini dan pesan konflik yang memberi tautan muat versi terbaru. Mode antislop during dipilih pengguna pada sesi ini; ENERGY 1 / RHYTHM 2 / MOTION 0.

- [x] Tes HTTP untuk prefill, edit tanpa foto baru, ganti/hapus foto, validasi, otorisasi/CSRF, ID tidak ditemukan, no-op dan konflik.
- [x] Implementasikan update atomik dengan validasi dan cadangan; perubahan hanya pada tulisan yang dipilih.
- [x] Tambahkan mode edit pada form dan semua daftar tulisan, serta status sukses/error dan cancel.
- [x] Jalankan seluruh tes, review, dan cek form lokal; perbarui dokumentasi/paket.
- [x] Unggah kode yang berubah saja ke Hostinger, pertahankan seluruh tulisan live dan konfigurasi privat, lalu verifikasi form edit live tanpa menerbitkan data contoh.

Verifikasi 2 November 2026: 19 tes HTTP admin lulus, pemeriksaan situs dan paket PHP lulus. Lima berkas kode dipasang melalui File Manager Hostinger. CSS dan JavaScript live sama dengan sumber. JSON publik sebelum dan sesudah pemasangan sama; 31 tulisan tetap tersedia. Tombol Edit pada berita FIN SUPER LEAGUE dibuka di Safari dan menampilkan judul, isi, foto lama serta tombol Simpan perubahan.
