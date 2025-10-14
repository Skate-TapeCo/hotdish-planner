// Next.js App Router robots.txt generator
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: 'https://hotdish-planner.vercel.app/sitemap.xml',
    host: 'hotdish-planner.vercel.app',
  };
}
