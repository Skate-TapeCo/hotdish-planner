export async function GET() {
  const body = `User-agent: *
Allow: /
Sitemap: https://hotdish-planner.vercel.app/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}

export async function HEAD() {
  return new Response(null, { headers: { 'Content-Type': 'text/plain' } });
}
