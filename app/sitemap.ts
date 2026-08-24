import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  return ["/", "/privacy", "/terms", "/login", "/signup"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
