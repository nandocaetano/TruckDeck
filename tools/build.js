// Assembles the two shipping forms of the panel app from the same sources:
//   public/index.html  - full document served by the bridge (separate css/js files)
//   dist/preview.html  - single fragment for a hosted preview (demo mode); it loads the panel
//                        pictures from skins/ next to it, so dist/skins is a copy of public/skins
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');
const read = (f) => fs.readFileSync(path.join(pub, f), 'utf8');
const args = process.argv.slice(2);
const publicOnly = args.includes('--public-only');
const outAt = args.indexOf('--out');
if (outAt !== -1 && !args[outAt + 1]) throw new Error('--out requires a path');
// Keep the live bridge entry point untouched unless the caller explicitly chooses it with --out.
const indexOut = outAt === -1 ? path.join(root, '_work', 'build', 'index.generated.html') : path.resolve(args[outAt + 1]);

// Shown as the browser/app window title. The Windows helper recognises the panel's own
// window by the words "Truck Sim Button Box" in this title (PanelTitleMarker), so keep them.
const TITLE = 'Truck Deck - Truck Sim Button Box';
// Build stamp: appended to every asset URL so a tablet can never keep running an old
// script after an update, and shown in the menu so the running version is visible.
const VERSION = new Date().toISOString().slice(0, 16).replace('T', ' ');
const tag = encodeURIComponent(VERSION);
const FONTS = '';
const body = read('body.html');
const scripts = ['catalog.js', 'skins.js', 'frames.js', 'frames_sov.js', 'frames_scania.js', 'frames_scania25.js', 'presets.js', 'keyboxes.js', 'app.js'];

fs.mkdirSync(path.dirname(indexOut), { recursive: true });
fs.writeFileSync(indexOut, [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  // user-scalable=no: a double tap on a button must press twice, not zoom the page
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black">',
  '<meta name="theme-color" content="#181b1f">',
  '<title>' + TITLE + '</title>',
  FONTS,
  '<link rel="stylesheet" href="app.css?v=' + tag + '">',
  '</head>',
  '<body>',
  body.trim(),
  '<script>window.TRUCKDECK_VERSION = ' + JSON.stringify(VERSION) + ';</script>',
  scripts.map((s) => '<script src="' + s + '?v=' + tag + '"></script>').join('\n'),
  '</body>',
  '</html>',
  '',
].join('\n'));

console.log('built ' + path.relative(root, indexOut));
// Recursive, idempotent copy: mkdir is safe on an existing dir and copyFileSync overwrites,
// so this never crashes on a dir that already has files (unlike fs.cpSync on some filesystems)
// and correctly descends into subfolders like skins/sov (the old flat loop crashed on those).
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s2 = path.join(src, e.name), d2 = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s2, d2); else fs.copyFileSync(s2, d2);
  }
}
// dist/preview.html is only the hosted web-demo build; a failure here must never block the
// index.html the bridge serves to the tablet, so it is isolated.
if (!publicOnly) try {
const dist = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'preview.html'), [
  '<title>' + TITLE + '</title>',
  FONTS,
  '<style>\n' + read('app.css') + '</style>',
  body.trim(),
  '<script>window.TRUCKDECK_VERSION = ' + JSON.stringify(VERSION) + ';</script>',
  scripts.map((s) => '<script>\n' + read(s) + '</script>').join('\n'),
  '',
].join('\n'));
// the preview needs the pictures beside it (skins/ now has subfolders, so copy recursively)
copyDir(path.join(pub, 'skins'), path.join(dist, 'skins'));
// ...and the segment-display font
copyDir(path.join(pub, 'fonts'), path.join(dist, 'fonts'));
console.log('built dist/preview.html');
} catch (e) { console.warn('skipped dist/preview build (web demo only):', e.message); }
