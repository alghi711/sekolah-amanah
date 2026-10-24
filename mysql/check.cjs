const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const output=path.resolve(root,'../exports/sekolah-amanah-hostinger-mysql/public_html');
const php=process.env.PHP_BINARY || 'D:/Rapot/.tools/php-cli/php.exe';
const extensions=process.env.PHP_EXTENSION_DIR || 'D:/Rapot/.tools/php-cli/ext';
const state={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'content.js'),'utf8'),state);
const content=JSON.parse(JSON.stringify(state.window.AMANAH_CONTENT));
const sql=fs.readFileSync(path.join(__dirname,'amanah.sql'),'utf8');
assert(!/\b(DROP|DELETE|TRUNCATE|REPLACE INTO)\b/i.test(sql));
assert.equal((sql.match(/INSERT INTO amanah_posts /g)||[]).length,content.posts.length);
assert.equal((sql.match(/INSERT INTO amanah_settings /g)||[]).length,Object.keys(content).length-1);
assert(sql.includes('utf8mb4_unicode_ci'));
assert(sql.includes('ON DUPLICATE KEY UPDATE id=id'));
const decodeHex = line => [...line.matchAll(/CONVERT\(0x([a-f0-9]+) USING utf8mb4\)/g)].map(match=>Buffer.from(match[1],'hex').toString('utf8'));
for (const line of sql.split('\n').filter(line=>line.startsWith('INSERT INTO amanah_posts '))) {
  const id=Number(line.match(/VALUES \((\d+),/)[1]);
  const post=content.posts.find(post=>post.id===id);
  assert(post);
  const values=decodeHex(line);
  assert.deepEqual(values,[post.date.replace('T',' '),post.title,post.school,post.category,post.url,post.image,JSON.stringify(post.blocks)]);
}
for (const line of sql.split('\n').filter(line=>line.startsWith('INSERT INTO amanah_settings '))) {
  const [key,value]=decodeHex(line);assert.deepEqual(JSON.parse(value),content[key]);
}
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const file of ['index.html','tk.html','sd.html','smp.html','smk.html','styles.css','pixel-reference.css','profiles.css','app.js','content.js','banner-greeters.js','portal-chase.js'])assert.equal(sha(path.join(root,file)),sha(path.join(output,file)),file);
for(const file of ['api/database.php','api/content.php','api/profile.php','mysql/database.example.php','hosting/router.php'])execFileSync(php,['-l',path.join(root,file)]);
assert(!fs.existsSync(path.join(output,'amanah.sql')));
assert(!fs.existsSync(path.join(output,'database.php')));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'amanah-mysql-'));
fs.writeFileSync(path.join(temp,'content.json'),JSON.stringify(content));
const phpPath=value=>value.replaceAll('\\','/').replaceAll("'","\\'");
fs.writeFileSync(path.join(temp,'read.php'),`<?php
define('AMANAH_API',true);require '${phpPath(path.join(root,'api/database.php'))}';
$data=json_decode(file_get_contents(__DIR__.'/content.json'),true,512,JSON_THROW_ON_ERROR);
$db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
$db->exec('CREATE TABLE amanah_settings (name TEXT PRIMARY KEY,value TEXT NOT NULL)');
$db->exec('CREATE TABLE amanah_posts (id INTEGER PRIMARY KEY,post_date TEXT,title TEXT,school TEXT,category TEXT,url TEXT,image TEXT,blocks TEXT)');
$setting=$db->prepare('INSERT INTO amanah_settings VALUES (?,?)');
foreach($data as $name=>$value){if($name!=='posts')$setting->execute([$name,json_encode($value)]);}
$post=$db->prepare('INSERT INTO amanah_posts VALUES (?,?,?,?,?,?,?,?)');
foreach($data['posts'] as $row){$post->execute([$row['id'],str_replace('T',' ',$row['date']),$row['title'],$row['school'],$row['category'],$row['url'],$row['image'],json_encode($row['blocks'])]);}
$result=amanah_read_content($db);
foreach(['javascript:alert(1)','assets/../../private','//example.com/evil','assets/a\\\\b.png'] as $bad){try{amanah_public_url($bad);throw new LogicException('Unsafe URL accepted');}catch(UnexpectedValueException $expected){}}
$db->exec("UPDATE amanah_posts SET blocks='broken-json' WHERE id=1191");
try{amanah_read_content($db);throw new LogicException('Corrupt JSON accepted');}catch(JsonException $expected){}
echo json_encode($result,JSON_THROW_ON_ERROR);
`);
const actual=JSON.parse(execFileSync(php,['-d','extension_dir='+extensions,'-d','extension=pdo_sqlite',path.join(temp,'read.php')],{encoding:'utf8'}));
content.posts.sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
assert.deepEqual(actual,content);
console.log('PASS: non-destructive MySQL seed, unchanged design files, PHP syntax, PDO fixture round-trip of all articles/settings, invalid URLs and corrupt JSON.');
(async()=>{
  const port=4278,base='http://127.0.0.1:'+port;
  const child=spawn(php,['-S','127.0.0.1:'+port,'-t',output,path.join(root,'hosting/router.php')],{env:{...process.env,AMANAH_DB_CONFIG:path.join(temp,'missing-config.php')},stdio:['ignore','pipe','pipe']});
  let ready=false;
  try{
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('PHP startup timeout')),10000);child.on('error',reject);child.on('exit',code=>{if(!ready)reject(Error('PHP server exit '+code));});child.stderr.on('data',data=>{if(data.toString().includes('Development Server')){ready=true;clearTimeout(timer);resolve();}});});
    const json=await fetch(base+'/api/content.php');assert.equal(json.status,503);const body=await json.text();assert(body.includes('Database belum tersedia'));assert(!body.includes('password')&&!body.includes(temp));
    const script=await fetch(base+'/content.js');assert.equal(script.status,200);assert.equal(script.headers.get('X-Amanah-Data'),'fallback');assert.equal(await script.text(),fs.readFileSync(path.join(root,'content.js'),'utf8'));
    assert.equal(script.headers.get('Cache-Control'),'no-store');
    const head=await fetch(base+'/content.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
    assert.equal((await fetch(base+'/api/content.php',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/api/database.php')).status,404);
    assert.equal((await fetch(base+'/api/profile.php?school=../../private')).status,404);
    for(const key of ['tk','sd','smp','smk']){const page=await fetch(base+'/'+key+'.html');assert.equal(page.status,200);assert.equal(page.headers.get('X-Amanah-Data'),'fallback');assert.equal(await page.text(),fs.readFileSync(path.join(root,key+'.html'),'utf8'));}
    console.log('PASS: JSON outage reports 503, browser fallback preserves content/design, GET/HEAD/405, private helper isolation and all profile routes.');
  }finally{child.kill();fs.rmSync(temp,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
