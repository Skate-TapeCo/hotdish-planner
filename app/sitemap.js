// Next.js App Router sitemap generator
export default function sitemap() {
  const base = 'https://hotdish-planner.vercel.app';
  return [
    {
      url: `${base}/`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ];
}
