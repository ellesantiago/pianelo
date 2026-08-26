import type { MetadataRoute } from "next";

const SITE_URL = "https://pianelo.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/admin", "/api", "/payments"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
