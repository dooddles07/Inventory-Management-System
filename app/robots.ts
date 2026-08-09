import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    // The app runs entirely on one browser's own data, so there is nothing in /app to index.
    rules: [{ userAgent: "*", allow: "/", disallow: "/app" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
