// sitemap.xml: the page(s), each with <lastmod> and hreflang alternates.
import { SITE, languages } from '../lib/data';

const lastmod = new Date().toISOString().slice(0, 10);

export function GET() {
  const pages = languages.map((l) => {
    const alts = languages.length > 1
      ? languages.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${SITE}${a.path}"/>`).join('\n') +
        `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/"/>`
      : '';
    return `  <url>\n    <loc>${SITE}${l.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n${alts}\n  </url>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.join('\n')}
</urlset>
`;
  return new Response(body.replace(/\n\n/g, '\n'), { headers: { 'Content-Type': 'application/xml' } });
}
