import { SITE } from '../lib/data';

export function GET() {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
