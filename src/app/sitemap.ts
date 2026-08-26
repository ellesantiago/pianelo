import type { MetadataRoute } from "next";

const SITE_URL = "https://pianelo.online";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/pricing", "/recordings", "/login", "/signup", "/terms", "/privacy"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
