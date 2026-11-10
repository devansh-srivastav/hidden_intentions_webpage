// Validates every JSON-LD block in the built site: it must parse, and every @type and
// property must exist in the official schema.org vocabulary
// (scripts/schemaorg-current-https.jsonld), with each property allowed on its type
// (domainIncludes, following the subclass chain). Exit code 1 on any error.
import fs from 'node:fs';
import path from 'node:path';

const dist = process.argv[2] || 'dist';
const vocab = JSON.parse(fs.readFileSync(new URL('./schemaorg-current-https.jsonld', import.meta.url)));
const strip = (id) => String(id).replace(/^schema:/, '');
const arr = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

const classes = new Map(); // name -> [parent names]
const props = new Map();   // name -> Set(domain class names)
for (const n of vocab['@graph']) {
  const types = arr(n['@type']).map(strip);
  const name = strip(n['@id']);
  if (types.includes('rdfs:Class')) classes.set(name, arr(n['rdfs:subClassOf']).map((s) => strip(s['@id'])));
  if (types.includes('rdf:Property')) props.set(name, new Set(arr(n['schema:domainIncludes']).map((d) => strip(d['@id']))));
}
const ancestors = (c, seen = new Set()) => {
  if (seen.has(c)) return seen;
  seen.add(c);
  for (const p of classes.get(c) ?? []) ancestors(p, seen);
  return seen;
};

const errors = [];
const walk = (node, where) => {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${where}[${i}]`));
  if (!node || typeof node !== 'object') return;
  const types = arr(node['@type']);
  for (const t of types) if (!classes.has(t)) errors.push(`${where}: unknown @type "${t}"`);
  const allowed = new Set(types.flatMap((t) => [...ancestors(t)]));
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('@')) continue;
    if (!props.has(k)) { errors.push(`${where}: unknown property "${k}"`); continue; }
    if (types.length && ![...props.get(k)].some((d) => allowed.has(d)))
      errors.push(`${where}: property "${k}" not expected on ${types.join('/')}`);
    walk(v, `${where}.${k}`);
  }
};

const files = [];
const find = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) find(p); else if (e.name.endsWith('.html')) files.push(p);
});
find(dist);

let blocks = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    blocks++;
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { errors.push(`${f}: invalid JSON (${e.message})`); continue; }
    if (data['@context'] !== 'https://schema.org') errors.push(`${f}: unexpected @context ${data['@context']}`);
    walk(data, `${path.relative(dist, f)} ${arr(data['@type']).join('/')}`);
  }
}
console.log(`Checked ${blocks} JSON-LD block(s) in ${files.length} HTML file(s) against schema.org (${classes.size} types, ${props.size} properties).`);
if (errors.length) { console.log(`${errors.length} error(s):`); errors.forEach((e) => console.log('  ' + e)); process.exit(1); }
console.log('0 errors.');
