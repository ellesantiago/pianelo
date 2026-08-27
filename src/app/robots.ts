import type { MetadataRoute } from "next";

const SITE_URL = "https://www.pianelo.online";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/admin", "/api", "/payments", "/reset-password"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
