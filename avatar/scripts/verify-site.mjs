// Static checks for the marketing site. Catches the failures that only show up
// after deploy: a link to a page that does not exist, an unclosed tag, a missing
// canonical, a duplicate title.
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = resolve(process.argv[2] ?? fileURLToPath(new URL('../../site/', import.meta.url)));
const pages = (await readdir(site)).filter(name => name.endsWith('.html'));
assert.ok(pages.length >= 5, `expected at least 5 pages, found ${pages.length}`);

const problems = [];
const titles = new Map();
const canonicals = new Map();

/** Map a clean URL to the file Vercel would serve. */
async function resolveTarget(pathname) {
  const clean = pathname.split('#')[0].split('?')[0];
  const candidates = clean.endsWith('/')
    ? [join(site, clean, 'index.html')]
    : [join(site, clean), join(site, `${clean}.html`), join(site, clean, 'index.html')];
  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch { /* try the next candidate */ }
  }
  return null;
}

for (const page of pages) {
  const html = await readFile(join(site, page), 'utf8');

  // Title and canonical must exist and be unique across the site.
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert.ok(title, `${page} is missing a <title>`);
  if (titles.has(title)) problems.push(`${page} reuses the title from ${titles.get(title)}`);
  titles.set(title, page);
  if (title.length > 70) problems.push(`${page} title is ${title.length} chars, over 70`);

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(canonical, `${page} is missing a canonical link`);
  if (canonicals.has(canonical)) problems.push(`${page} reuses the canonical from ${canonicals.get(canonical)}`);
  canonicals.set(canonical, page);

  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  assert.ok(description, `${page} is missing a meta description`);
  if (description.length > 165) problems.push(`${page} description is ${description.length} chars, over 165`);

  // Rough tag balance for the elements that actually break layout.
  for (const tag of ['div', 'section', 'main', 'header', 'footer', 'article', 'ul', 'details']) {
    const open = (html.match(new RegExp(`<${tag}(\\s|>)`, 'g')) ?? []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
    if (open !== close) problems.push(`${page} has ${open} <${tag}> and ${close} </${tag}>`);
  }

  // Every internal link and asset must resolve to a real file.
  for (const [, href] of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    if (href.startsWith('//')) continue;
    const target = await resolveTarget(href);
    if (!target) problems.push(`${page} links to ${href}, which does not exist`);
  }

  // External links must be safe.
  for (const [, , attrs] of html.matchAll(/<a\s([^>]*)>/g)) {
    if (!/href="https?:/.test(attrs)) continue;
    if (!/rel="[^"]*noopener/.test(attrs)) problems.push(`${page} has an external link without rel="noopener"`);
  }
}

// Machine-readable files must exist and parse.
const sitemap = await readFile(join(site, 'sitemap.xml'), 'utf8');
for (const [, loc] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const pathname = new URL(loc).pathname;
  const target = await resolveTarget(pathname);
  if (!target) problems.push(`sitemap lists ${loc}, which does not exist`);
}
assert.ok((await readFile(join(site, 'robots.txt'), 'utf8')).includes('Sitemap:'), 'robots.txt must point at the sitemap');
JSON.parse(await readFile(join(site, 'vercel.json'), 'utf8'));
JSON.parse(await readFile(join(site, 'site.webmanifest'), 'utf8'));

// Structured data must parse and carry the expected types.
const home = await readFile(join(site, 'index.html'), 'utf8');
for (const [, json] of home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
  const parsed = JSON.parse(json);
  const types = (parsed['@graph'] ?? [parsed]).map(node => node['@type']);
  for (const required of ['Organization', 'Person', 'WebSite', 'SoftwareApplication', 'FAQPage']) {
    if (!types.includes(required)) problems.push(`homepage JSON-LD is missing ${required}`);
  }
}

if (problems.length) {
  console.error(problems.map(problem => ` - ${problem}`).join('\n'));
  throw new Error(`${problems.length} site problem(s)`);
}
console.log(`Site check passed: ${pages.length} pages, ${titles.size} unique titles, every link resolves.`);
