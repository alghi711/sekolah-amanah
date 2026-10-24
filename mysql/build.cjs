const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const state = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'content.js'),'utf8'),state);
const content = state.window.AMANAH_CONTENT;
const text = value => 'CONVERT(0x' + Buffer.from(String(value),'utf8').toString('hex') + ' USING utf8mb4)';
let sql = `-- Sekolah Amanah Pixel: MySQL 5.7+ / MariaDB 10.2+\n-- Import into the database selected in phpMyAdmin. Existing rows are preserved.\nSET NAMES utf8mb4;\n
CREATE TABLE IF NOT EXISTS amanah_posts (
  id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  post_date DATETIME NOT NULL,
  title TEXT NOT NULL,
  school VARCHAR(120) NOT NULL,
  category VARCHAR(32) NOT NULL,
  url TEXT NOT NULL,
  image TEXT NOT NULL,
  blocks JSON NOT NULL,
  INDEX amanah_posts_date (post_date, id),
  INDEX amanah_posts_school (school)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS amanah_settings (
  name VARCHAR(64) NOT NULL PRIMARY KEY,
  value JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;\n`;
for (const post of content.posts) {
  const values = [post.id,...[post.date.replace('T',' '),post.title,post.school,post.category,post.url,post.image,JSON.stringify(post.blocks)].map(text)];
  sql += 'INSERT INTO amanah_posts (id,post_date,title,school,category,url,image,blocks) VALUES (' + values.join(',') + ') ON DUPLICATE KEY UPDATE id=id;\n';
}
for (const [name,value] of Object.entries(content)) {
  if (name !== 'posts') sql += 'INSERT INTO amanah_settings (name,value) VALUES (' + text(name) + ',' + text(JSON.stringify(value)) + ') ON DUPLICATE KEY UPDATE name=name;\n';
}
sql += 'COMMIT;\n';
fs.writeFileSync(path.join(__dirname,'amanah.sql'),sql);
execFileSync(process.execPath,[path.join(root,'prepare-deploy.cjs')],{cwd:root,stdio:'inherit'});
const output = path.resolve(root,'../exports/sekolah-amanah-hostinger-mysql');
const publicRoot = path.join(output,'public_html');
fs.mkdirSync(publicRoot,{recursive:true});
fs.cpSync(path.join(root,'dist'),publicRoot,{recursive:true});
fs.cpSync(path.join(root,'api'),path.join(publicRoot,'api'),{recursive:true});
fs.copyFileSync(path.join(root,'hosting/hostinger.htaccess'),path.join(publicRoot,'.htaccess'));
fs.mkdirSync(path.join(output,'mysql'),{recursive:true});
fs.copyFileSync(path.join(__dirname,'amanah.sql'),path.join(output,'mysql/amanah.sql'));
fs.mkdirSync(path.join(output,'amanah-private'),{recursive:true});
fs.copyFileSync(path.join(__dirname,'database.example.php'),path.join(output,'amanah-private/database.example.php'));
fs.copyFileSync(path.join(__dirname,'PANDUAN-HOSTINGER.md'),path.join(output,'PANDUAN-HOSTINGER.md'));
console.log(`MySQL package: ${output}; ${content.posts.length} articles, ${content.partners.length} partners, ${Object.keys(content).length-1} settings.`);
