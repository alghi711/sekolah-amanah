const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = __dirname;
const destination = path.resolve(root, 'dist');
assert.equal(path.dirname(destination), root, 'Deployment output must stay inside this project');
if (fs.existsSync(destination)) {
  assert(!fs.lstatSync(destination).isSymbolicLink(), 'Deployment output must not be a symlink');
  fs.rmSync(destination, {recursive: true});
}
fs.mkdirSync(destination);
const files = [
  'index.html', 'tk.html', 'sd.html', 'smp.html', 'smk.html',
  'styles.css', 'pixel-reference.css', 'profiles.css',
  'app.js', 'banner.js', 'banner-greeters.js', 'campus.js', 'content.js', 'intro.js',
  'locations.js', 'motion.js', 'profile.js'
];
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(destination, file));
fs.cpSync(path.join(root, 'assets'), path.join(destination, 'assets'), {
  recursive: true,
  filter: source => !source.endsWith('.md')
});
for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(destination, file), 'utf8');
  for (const [, reference] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^https?:/.test(reference)) continue;
    const target = reference.split(/[?#]/)[0];
    assert(fs.existsSync(path.join(destination, target)), `Missing deployed asset: ${target}`);
  }
}
assert(!fs.existsSync(path.join(destination, 'app.yaml')));
assert(!fs.existsSync(path.join(destination, 'server.cjs')));
console.log('Deployment ready: five pages and public assets in dist/.');
