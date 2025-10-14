export async function GET() {
  const body = `User-agent: *
Allow: /
Sitemap: https://hotdish-planner.vercel.app/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
