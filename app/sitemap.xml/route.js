export async function GET() {
  const urls = ['https://hotdish-planner.vercel.app/'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url><loc>${u}</loc></url>`).join('')}
</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}

export async function HEAD() {
  return new Response(null, { headers: { 'Content-Type': 'application/xml' } });
}
