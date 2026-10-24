# Model Steve dan Alex

Model bersumber dari arsip yang diberikan pengguna:

- `steve-minecraft.zip`: `source/Sketchfab_2021_08_19_21_43_21.blend` dan `textures/steve.png`.
- `minecraft-alex.zip`: `source/Minecraft alex.blend` dan tekstur PNG dalam folder `textures/`.

`steve.glb` dan `alex.glb` mempertahankan geometri serta UV asli, dengan tekstur asli ditanam dalam GLB. Masing-masing berisi enam bagian tubuh. Model dinormalisasi ukuran dan arah hadapnya, lalu lengan dipisahkan pada pivot bahu untuk gerakan dadah. Rig Alex dibekukan pada rest pose sebelum pemisahan bagian; geometri asli tetap dipakai. Bukan model blok pengganti yang dibuat ulang.

Konversi memakai Blender 4.5 LTS dan `convert-greeters.py`. File Blender dibuka dengan `use_scripts=False` dan CLI `--disable-autoexec`. Sumber ZIP/Blender disimpan terpisah dari aset publik.

Struktur input konverter: `<source-dir>/steve/source/*.blend`, `<source-dir>/steve/textures/*.png`, dan struktur serupa untuk `alex`.

```sh
blender --background --factory-startup --disable-autoexec --python convert-greeters.py -- --source-dir /path/to/extracted-models --output-dir assets/models --preview assets/banner-greeters.png
```

PNG cadangan dirender dari GLB hasil konversi dengan pose yang sama. Animasi browser menggunakan `banner-greeters.js` dan GLTFLoader yang sesuai dengan Three.js r128.
