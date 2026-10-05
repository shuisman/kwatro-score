// Post-build: prerenders static routes to HTML, writes the SPA fallback (404.html), sitemap, robots
// and the service worker with a precache list of every file in dist/.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const BASE = '/kwatro-score/';
const SITE = 'https://shuisman.github.io/kwatro-score/';

const ssr = await import(pathToFileURL(join(process.cwd(), 'dist-ssr', 'entry-server.js')).href);
const { render, staticRoutes, href, metaFor, switchLang } = ssr;

const template = await readFile(join(DIST, 'index.html'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const abs = (path) => SITE + path.slice(BASE.length);

function page({ lang, title, description, head = '', app = '' }) {
  return template
    .replace('<!--lang-->', lang)
    .replace('<!--title-->', esc(title))
    .replace('<!--head-->', `<meta name="description" content="${esc(description)}" />\n    ${head}`)
    .replace('<!--app-->', app);
}

async function write(path, html) {
  const file = join(DIST, path.slice(BASE.length), path.endsWith('/') ? 'index.html' : '');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

const sitemap = [];
const routes = staticRoutes();
for (const route of routes) {
  const path = href(route);
  const meta = metaFor(route);
  const alt = ['nl', 'en']
    .map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(href(switchLang(route, l)))}" />`)
    .join('\n    ');
  const head = [
    `<link rel="canonical" href="${abs(path)}" />`,
    alt,
    `<link rel="alternate" hreflang="x-default" href="${abs(href(switchLang(route, 'nl')))}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${abs(path)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:image" content="${SITE}icon-512.png" />`,
  ].join('\n    ');
  await write(path, page({ lang: route.lang, title: meta.title, description: meta.description, head, app: await render(path) }));
  if (route.key !== 'new') sitemap.push(abs(path));
  console.log('prerendered', path);
}

// Root: send visitors to their language before anything renders.
const rootRedirect = `<script>
      (function () {
        var l = null;
        try { l = localStorage.getItem('kwatro.lang'); } catch (e) {}
        if (l !== 'nl' && l !== 'en') {
          var langs = navigator.languages || [navigator.language || ''];
          l = langs.some(function (x) { return (x || '').toLowerCase().indexOf('nl') === 0; }) ? 'nl' : 'en';
        }
        location.replace('${BASE}' + l + '/' + location.search);
      })();
    </script>
    <link rel="alternate" hreflang="nl" href="${SITE}nl/" />
    <link rel="alternate" hreflang="en" href="${SITE}en/" />`;
const homeNl = metaFor({ key: 'home', lang: 'nl' });
await writeFile(
  join(DIST, 'index.html'),
  page({
    lang: 'nl',
    title: homeNl.title,
    description: homeNl.description,
    head: rootRedirect,
    app: `<p style="padding:2rem;text-align:center"><a href="${BASE}nl/">Nederlands</a> · <a href="${BASE}en/">English</a></p>`,
  }),
);

// SPA fallback for dynamic routes (/nl/spelen/spel/<id>/): GitHub Pages serves 404.html for unknown paths.
await writeFile(
  join(DIST, '404.html'),
  page({ lang: 'nl', title: 'Kwatro Score', description: homeNl.description, head: '<meta name="robots" content="noindex" />' }),
);

await writeFile(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((u) => `  <url><loc>${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);

// Service worker: precache every file; the version is a hash of all contents.
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const files = (await walk(DIST))
  .map((f) => relative(DIST, f).split('\\').join('/'))
  .filter((f) => f !== 'sw.js' && !f.endsWith('.map') && f !== 'sitemap.xml' && f !== 'robots.txt')
  .sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(join(DIST, f)));
const version = hash.digest('hex').slice(0, 12);
const precache = files.map((f) => {
  if (f === 'index.html') return BASE;
  if (f.endsWith('/index.html')) return BASE + f.slice(0, -'index.html'.length);
  return BASE + f;
});
const sw = (await readFile('scripts/sw-template.js', 'utf8'))
  .replace('__VERSION__', version)
  .replace('__BASE__', BASE)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
await writeFile(join(DIST, 'sw.js'), sw);
console.log(`service worker ${version}: ${precache.length} files`);

await rm('dist-ssr', { recursive: true, force: true });
