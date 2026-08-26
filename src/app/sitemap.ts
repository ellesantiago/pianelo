import type { MetadataRoute } from "next";

const SITE_URL = "https://pianelo.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/pricing", "/recordings", "/login", "/signup", "/terms", "/privacy"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
