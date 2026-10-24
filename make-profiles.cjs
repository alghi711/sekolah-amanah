const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = __dirname;
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const snapshot = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'content.js'), 'utf8'), snapshot);
const content = snapshot.window.AMANAH_CONTENT;
const form = home.match(/<a id="spmb"[^>]*href="([^"]+)"/)[1];
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const profiles = [
  {
    key:'tk', name:'KB/RA–TK Amanah', short:'KB/TK', category:'PENDIDIKAN ANAK USIA DINI',
    lead:'Belajar sambil bermain, mengenal Al-Qur’an, dan membiasakan ibadah dalam suasana yang ramah anak.',
    about:'TK Amanah mengajak anak belajar melalui bermain dalam lingkungan yang ramah anak. Kegiatan disesuaikan dengan tahap perkembangan, sambil mengenalkan ibadah, doa sehari-hari, Al-Qur’an, dan perilaku baik. Anak mendapat kesempatan untuk berlatih mandiri, bersosialisasi, serta mengembangkan kemampuan sejak usia dini.',
    image:'assets/profiles/tk-gallery-1.jpeg', photo:'Kegiatan meronce di TK Amanah', tags:['Belajar sambil bermain','Nilai Islami','Kegiatan kreatif'], locations:[0,1,2,3],
    aboutPhoto:['assets/profiles/tk-gallery-2.jpeg','Kegiatan mengenal tanaman bersama TK Amanah'],
    programLead:'Belajar sambil bermain dan pembiasaan Islami.',
    points:['Belajar sesuai tahap perkembangan anak','Pembiasaan ibadah dan doa harian','Kemandirian dan akhlak sejak dini'],
    programs:[
      ['Belajar sambil bermain','Kegiatan belajar dirancang menyenangkan dan sesuai tahap usia anak.','blocks'],
      ['Pembiasaan ibadah','Anak mengenal doa harian dan kebiasaan ibadah dalam keseharian sekolah.','prayer'],
      ['Al-Qur’an & akhlak','Pengenalan Al-Qur’an berjalan bersama pembiasaan sikap baik dan kemandirian.','book']
    ],
    gallery:[
      ['assets/profiles/tk-gallery-1.jpeg','Meronce bersama teman'],
      ['assets/profiles/tk-gallery-2.jpeg','Mengenal tanaman di luar kelas'],
      ['assets/profiles/tk-gallery-3.jpg','Market Day TK Amanah'],
      ['assets/profiles/tk-gallery-4.jpeg','Bermain dan menyusun balok'],
      ['assets/profiles/tk-gallery-5.jpeg','Mengamati tanaman di kebun'],
      ['assets/profiles/tk-gallery-6.jpeg','Menghias kue bersama']
    ]
  },
  {
    key:'sd', name:'SD Amanah', short:'SD', category:'SEKOLAH DASAR',
    lead:'Pembelajaran sentra, pendidikan Islami, dan tahfidz Al-Qur’an menjadi bagian dari kegiatan belajar di SD Amanah.',
    about:'Di SD Amanah, siswa belajar lewat kegiatan sentra yang mendorong eksplorasi, kreativitas, dan pengalaman langsung. Nilai Islami diterapkan dalam rutinitas sekolah. Program tahfidz disusun secara terstruktur untuk membantu siswa membangun kedekatan dengan Al-Qur’an, sejalan dengan pembelajaran akademik dan pembentukan akhlak.',
    image:'assets/news-177.jpg', photo:'Pembelajaran sentra di SD Amanah', tags:['Pembelajaran sentra','Tahfidz Al-Qur’an','Pendidikan Islami'], locations:[0,3],
    aboutPhoto:['assets/news-638.png','Prestasi story telling siswa SD Amanah'],
    programLead:'Pembelajaran sentra, tahfidz, dan pendidikan Islami.',
    points:['Belajar aktif melalui pengalaman langsung','Tahfidz Al-Qur’an yang terstruktur','Pembiasaan nilai Islami sehari-hari'],
    programs:[
      ['Pembelajaran sentra','Siswa belajar melalui kegiatan eksplorasi dan kreasi dengan pendampingan guru.','blocks'],
      ['Tahfidz Al-Qur’an','Program terstruktur untuk menumbuhkan kecintaan siswa terhadap Al-Qur’an.','book'],
      ['Pendidikan Islami','Nilai Islami dibiasakan dalam kehidupan sehari-hari di sekolah.','prayer']
    ]
  },
  {
    key:'smp', name:'SMP Amanah', short:'SMP', category:'SEKOLAH MENENGAH PERTAMA',
    lead:'Pembelajaran akademik, field study, dan kegiatan kepemimpinan memberi siswa pengalaman belajar di dalam dan di luar kelas.',
    about:'Kegiatan di SMP Amanah mencakup pembelajaran akademik, field study, dan pembinaan kepemimpinan melalui LDKS. Siswa kelas IX juga mengikuti Tes Kemampuan Akademik (TKA) untuk memetakan kemampuan literasi dan numerasi sebelum melanjutkan pendidikan.',
    image:'assets/news-148.jpeg', photo:'Field study SMP Amanah ke Museum Tanah dan Pertanian', tags:['Field study','Kepemimpinan siswa','Literasi & numerasi'], locations:[3],
    aboutPhoto:['assets/news-164.jpg','Kegiatan LDKS di SMP Amanah'],
    programLead:'Kegiatan akademik, field study, dan kepemimpinan siswa.',
    points:['Pengamatan langsung di luar kelas','Komunikasi, disiplin, dan kerja sama','Persiapan melanjutkan pendidikan'],
    programs:[
      ['Field study','Kunjungan belajar ke Museum Tanah dan Pertanian, Museum Zoologi, serta Kebun Raya Bogor.','map'],
      ['Kepemimpinan siswa','LDKS melatih kedisiplinan, tanggung jawab, komunikasi, dan kerja sama.','people'],
      ['Literasi & numerasi','Kegiatan TKA kelas IX berfokus pada kemampuan Bahasa Indonesia dan Matematika.','study']
    ]
  },
  {
    key:'smk', name:'SMK Amanah', short:'SMK', category:'SEKOLAH MENENGAH KEJURUAN',
    lead:'Pembelajaran kejuruan melalui praktik, keterampilan, dan persoalan nyata untuk mengenalkan siswa pada kebutuhan dunia kerja.',
    about:'SMK Amanah memusatkan pendidikan kejuruan pada praktik dan pemecahan persoalan yang ditemui di dunia kerja. Bidang belajar meliputi Teknik Komputer dan Jaringan, Manajemen Perkantoran, serta Teknik Otomotif. Penggunaan teknologi menjadi bagian dari pembelajaran untuk mengembangkan keterampilan sesuai bidang siswa.',
    image:'assets/news-175.png', photo:'Praktik Manajemen Perkantoran SMK Amanah', tags:['Komputer & jaringan','Perkantoran','Otomotif'], locations:[3],
    aboutPhoto:['assets/news-161.png','Praktik Teknik Otomotif SMK Amanah'],
    programLead:'Tiga jurusan keahlian dan program pembinaan olahraga.',
    points:['Pembelajaran yang berfokus pada praktik','Kompetensi sesuai bidang kejuruan','Pemanfaatan teknologi dalam belajar'],
    programs:[
      ['Teknik Komputer & Jaringan','Pembelajaran kejuruan bidang komputer dan jaringan dengan penekanan pada keterampilan praktik.','computer'],
      ['Manajemen Perkantoran','Pembelajaran untuk mengenal pekerjaan administrasi dan pengelolaan perkantoran.','office'],
      ['Teknik Otomotif','Pembelajaran bidang otomotif melalui praktik dan keterampilan teknis.','tools'],
      ['Kelas Atlet','Pembinaan futsal dan bola voli melalui latihan yang terarah, disiplin, dan berkelanjutan.','trophy']
    ]
  }
];
const brand = home.match(/<a class="brand"[\s\S]*?<\/a>/)[0].replace('href="#beranda"', 'href="index.html"');
const footer = home.match(/<footer class="wrap">[\s\S]*?<\/footer>/)[0].replaceAll('href="#beranda"', 'href="index.html"');
function instagramLink(school) {
  const card = home.match(new RegExp(`<a class="instagram-card ${school.key}"[\\s\\S]*?<\\/a>`));
  if (!card) return '';
  const href = card[0].match(/href="([^"]+)"/)[1];
  const icon = card[0].match(/<svg[\s\S]*?<\/svg>/)[0];
  return `<a class="profile-instagram-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Instagram ${escape(school.name)}">${icon}<span>Instagram</span><span aria-hidden="true">&#8599;</span></a>`;
}
const motion = home.match(/<button id="motion-toggle"[\s\S]*?<\/button>/)[0];
const originalMap = home.match(/<section id="lokasi"[\s\S]*?<\/section>/)[0];
const locationButtons = [...originalMap.matchAll(/<button type="button" class="location-choice[^\"]*"[\s\S]*?<\/button>/g)].map(match => match[0]);
function locationSection(school) {
  const selected = school.locations.map((index, position) => locationButtons[index].replace(/class="location-choice[^\"]*"/, `class="location-choice${position === 0 ? ' is-active' : ''}"`).replace(/aria-pressed="[^\"]*"/, `aria-pressed="${position === 0}"`));
  const first = selected[0];
  const attribute = name => first.match(new RegExp(`data-${name}="([^\"]+)"`))[1];
  const name = first.match(/class="location-choice-name">([^<]+)</)[1];
  let map = originalMap.replace('class="section wrap"', 'class="section wrap profile-location"');
  map = map.replace(/<div class="location-choices"[^>]*>[\s\S]*?<\/div>/, `<div class="location-choices" role="group" aria-label="Pilih lokasi ${escape(school.name)}">${selected.join('\n')}</div>`);
  map = map.replace(/<h2 id="locations-heading">[\s\S]*?<\/h2>/, `<h2 id="locations-heading">Lokasi<br><span>${escape(school.name)}</span></h2>`);
  map = map.replace('Pilih lokasi di Jakarta Barat atau Tangerang untuk melihat peta, alamat, dan petunjuk arah.', 'Alamat sekolah dan petunjuk arah untuk merencanakan kunjungan.');
  map = map.replace(/id="location-map-name">[^<]+</, `id="location-map-name">${name}<`);
  map = map.replace(/<iframe id="school-map"[\s\S]*?<\/iframe>/, `<iframe id="school-map" title="Peta lokasi ${name}" src="${attribute('map-src')}" width="640" height="320" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`);
  map = map.replace(/id="location-map-address">[^<]+</, `id="location-map-address">${attribute('address')}<`);
  map = map.replace(/id="location-directions" href="[^\"]+"/, `id="location-directions" href="${attribute('directions')}"`);
  map = map.replace(/<noscript>[\s\S]*?<\/noscript>/, `<noscript><p>Alamat di Google Maps: ${selected.map(button => `<a href="${button.match(/data-directions="([^\"]+)"/)[1]}" target="_blank" rel="noopener noreferrer">${button.match(/class="location-choice-name">([^<]+)</)[1]}</a>`).join(' · ')}.</p></noscript>`);
  if (selected.length === 1) map = map.replace('class="locations-browser"', 'class="locations-browser single-location"');
  return map;
}
function readableTitle(title) {
  return title === title.toUpperCase() ? title.charAt(0) + title.slice(1).toLowerCase().replace(/\b(smk|smp|sd|tk|ldks|tka|tkj)\b/g, word => word.toUpperCase()) : title;
}
function programIcon(kind) {
  const paths = {
    blocks:'M8 28 20 22l12 6-12 6-12-6Zm0 0v14l12 6 12-6V28M20 34v14M30 13l11-6 12 6-12 6-11-6Zm0 0v14l11 6 12-6V13M41 19v14M30 42l11-6 12 6-12 6-11-6Zm0 0v13l11 6 12-6V42M41 48v13',
    prayer:'M14 54V28l18-15 18 15v26H14Zm11 0V39l7-6 7 6v15M8 28h48M8 54h48M43 8a6 6 0 0 0 8 8 6 6 0 1 1-8-8Z',
    book:'M7 16h16l9 6 9-6h16v35H41l-9 6-9-6H7V16Zm25 6v35M15 26h8m-8 8h8m-8 8h8m18-16h8m-8 8h8m-8 8h8',
    map:'M6 17 23 9l18 8 17-8v38l-17 8-18-8-17 8V17Zm17-8v38m18-30v38M34 20c0-8 16-8 16 0 0 6-8 13-8 13s-8-7-8-13Z',
    people:'M24 21h16v14H24V21Zm-2 20h20v17H22V41ZM7 12h12v12H7V12Zm38 0h12v12H45V12ZM5 30h14v18H5V30Zm40 0h14v18H45V30Z',
    study:'M14 7h27l10 10v40H14V7Zm27 0v10h10M22 28l4 4 7-9m-11 20 4 4 7-9m5-10h6m-6 15h6',
    computer:'M7 10h50v34H7V10Zm6 6h38v22H13V16Zm12 28v10m14-10v10M18 56h28M21 25h8m6 0h8m-17 7h12',
    office:'M13 8h38v48H13V8Zm0 16h38M13 40h38M26 16h12M26 32h12M26 48h12M8 56h48',
    tools:'m15 8 12 12-7 7L8 15v13l12 11 11-1 17 18 9-9-18-17 1-11L28 8H15Zm31 38 4 4',
    trophy:'M18 9h28v22l-8 9H26l-8-9V9Zm0 6H8v13l10 7m28-20h10v13l-10 7M32 40v12m-12 5h24m-20-5h16M27 19h10m-5-5v10'
  };
  return `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="miter" aria-hidden="true"><path d="${paths[kind]}"/></svg>`;
}
const programArt = '<svg class="profile-program-art" viewBox="0 0 240 150" fill="none" aria-hidden="true"><path d="m23 99 91-46 105 50-92 46-104-50Z" fill="#ffffff0d"/><path d="m43 82 77-35 83 40-77 37-83-42Z" fill="var(--profile-accent)"/><path d="m43 82 83 42v11L43 93V82Zm83 42 77-37v11l-77 37v-11Z" fill="#00000024"/><path d="m47 69 63-29 16 66-79-37Z" fill="#fff9e4"/><path d="m110 40 89 39-73 27-16-66Z" fill="#e8edcf"/><path d="m47 69 79 37v11L47 80V69Zm79 37 73-27v11l-73 27v-11Z" fill="#cad6b1"/><path d="m110 40 16 66M64 68l31-14m-22 24 26-12m-19 23 24-11m25-18 42 19m-35-6 27 12" stroke="#74936c" stroke-width="2"/><path d="m152 99 12-5v23l-6-3-6 8V99Z" fill="#caa34e"/><path d="m27 52 13-6 13 6-13 6-13-6Z" fill="var(--profile-accent)"/><path d="m27 52 13 6v16l-13-6V52Zm13 6 13-6v16l-13 6V58Z" fill="var(--profile-accent)" opacity=".65"/><path d="M188 32h6v8h8v6h-8v8h-6v-8h-8v-6h8v-8Z" fill="#d2e7ab"/></svg>';
for (const school of profiles) {
  const about = school.about;
  const posts = content.posts.filter(post => post.school === `${school.key.toUpperCase()} AMANAH`).slice(0, 3);
  const markup = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(school.name)} — Yayasan Amanah HZAA</title><meta name="description" content="${escape(school.lead)}"><meta name="theme-color" content="#1e4631"><link rel="icon" href="assets/logo-amanah.png"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="pixel-reference.css"><link rel="stylesheet" href="profiles.css"><script src="profile.js" defer></script><script src="locations.js" defer></script><script src="motion.js" defer></script></head>
<body class="profile-page profile-${school.key}"><a class="skip" href="#main">Lewati ke konten</a>
<header class="site-header">${brand}<button class="menu-toggle" aria-expanded="false" aria-controls="navigation">Menu <span aria-hidden="true">☰</span></button><nav id="navigation" aria-label="Navigasi utama"><a href="index.html">Beranda</a><a href="#tentang">Profil</a><a href="#program">Program</a><a href="#kegiatan">Kegiatan</a><a href="#lokasi">Lokasi</a><a class="button small" href="${form}" target="_blank" rel="noopener noreferrer">Daftar sekolah <span aria-hidden="true">↗</span></a></nav></header>
<main id="main">
<div class="hero-background"><section class="profile-hero wrap" aria-labelledby="profile-heading"><div class="profile-hero-copy"><a class="profile-back" href="index.html#jenjang">← Semua jenjang</a><p class="profile-kicker">${escape(school.category)}</p><h1 id="profile-heading">${escape(school.name)}</h1><p class="profile-lead">${escape(school.lead)}</p><ul class="profile-tags">${school.tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul><div class="hero-actions"><a class="button" href="${form}" target="_blank" rel="noopener noreferrer">Daftar ${escape(school.short)} <span aria-hidden="true">↗</span></a><a class="profile-text-link" href="#tentang">Kenali sekolah <span aria-hidden="true">↓</span></a>${instagramLink(school)}</div>${motion}</div><figure class="profile-hero-photo"><img src="${school.image}" width="768" height="1024" alt="${escape(school.photo)}" fetchpriority="high"><figcaption><span class="profile-level-token" aria-hidden="true">${escape(school.short)}</span><span>${escape(school.photo)}</span></figcaption></figure></section></div>
<nav class="profile-switcher wrap" aria-label="Jenjang pendidikan"><span>JENJANG PENDIDIKAN</span><div>${profiles.map(item => `<a href="${item.key}.html" class="profile-switch ${item.key}${item.key === school.key ? ' is-current' : ''}"${item.key === school.key ? ' aria-current="page"' : ''}>${escape(item.short)}<span aria-hidden="true">↗</span></a>`).join('')}</div></nav>
<section id="tentang" class="profile-section profile-about wrap" aria-labelledby="about-heading"><figure class="profile-about-photo"><img src="${school.aboutPhoto[0]}" alt="${escape(school.aboutPhoto[1])}" width="768" height="576" loading="lazy"><figcaption><span aria-hidden="true">✦</span>${escape(school.aboutPhoto[1])}</figcaption></figure><div class="profile-about-copy"><p class="profile-kicker">PROFIL SEKOLAH</p><h2 id="about-heading">Tentang <span>${escape(school.name)}</span></h2><p class="profile-about-text">${escape(about)}</p><a class="profile-text-link" href="#program">Lihat program belajar <span aria-hidden="true">↓</span></a></div><ul class="profile-highlights" aria-label="Pendekatan belajar ${escape(school.name)}">${school.points.map((point,index) => `<li><span aria-hidden="true">${String(index+1).padStart(2,'0')}</span><p>${escape(point)}</p></li>`).join('')}</ul></section>
<section id="program" class="profile-program-section" aria-labelledby="program-heading"><div class="wrap profile-program-layout"><div class="profile-program-intro"><div><p class="profile-kicker">${escape(school.name.toUpperCase())}</p><h2 id="program-heading">${school.key === 'smk' ? 'Jurusan<br>& program' : 'Program<br>belajar'}</h2><p>${escape(school.programLead)}</p></div>${programArt}<a class="profile-program-link" href="#kegiatan">Lihat kegiatan siswa <span aria-hidden="true">↗</span></a></div><div class="profile-program-list">${school.programs.map(([title,text,icon],index) => `<article class="profile-program"><span class="profile-program-icon">${programIcon(icon)}</span><div><span class="profile-program-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><h3>${escape(title)}</h3><p>${escape(text)}</p></div></article>`).join('')}</div></div></section>
${school.gallery ? `<section class="profile-section profile-gallery wrap" aria-labelledby="gallery-heading"><div class="profile-section-heading"><div><p class="profile-kicker">FOTO KEGIATAN</p><h2 id="gallery-heading">Keseharian di TK Amanah</h2></div><p>Klik foto untuk melihat ukuran penuh.</p></div><div class="profile-gallery-grid">${school.gallery.map(([src,caption])=>`<figure><a href="${src}" target="_blank" rel="noopener noreferrer" aria-label="Buka foto ${escape(caption)}, ukuran penuh"><img src="${src}" alt="${escape(caption)}" width="768" height="1024" loading="lazy"><span aria-hidden="true">↗</span></a><figcaption>${escape(caption)}</figcaption></figure>`).join('')}</div></section>` : ''}
<section id="kegiatan" class="profile-section wrap"><div class="profile-section-heading"><div><p class="profile-kicker">BERITA SEKOLAH</p><h2>Kegiatan & Prestasi<br>${escape(school.name)}</h2></div><a class="profile-text-link" href="index.html#kabar">Semua berita Amanah <span aria-hidden="true">↗</span></a></div><div class="profile-news-grid${posts.length === 1 ? ' single-story' : ''}">${posts.map(post => `<article class="profile-news-card"><a href="index.html?berita=${post.id}#kabar" class="profile-news-photo" tabindex="-1" aria-hidden="true"><img src="${post.image}" alt="" width="768" height="465" loading="lazy"></a><div class="profile-news-copy"><div class="profile-news-meta"><span>${post.category === 'prestasi' ? 'PRESTASI' : 'KEGIATAN'}</span><time datetime="${post.date}">${new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(post.date))}</time></div><h3><a href="index.html?berita=${post.id}#kabar">${escape(readableTitle(post.title))}</a></h3><a class="profile-text-link" href="index.html?berita=${post.id}#kabar" aria-label="Baca ${escape(readableTitle(post.title))}">Baca berita <span aria-hidden="true">↗</span></a></div></article>`).join('')}</div></section>
${locationSection(school)}
</main>${footer}</body></html>
`;
  fs.writeFileSync(path.join(root, `${school.key}.html`), markup);
  console.log(`Created ${school.key}.html (${posts.length} school stories, ${school.locations.length} locations)`);
}
