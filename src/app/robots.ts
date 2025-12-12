import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",            // homepage
          "/store/",       // public store pages
          "/checkout",     // checkout entry (optional)
        ],
        disallow: [
          "/admin",
          "/owner",
          "/dashboard",
          "/api",
          "/sign-in",
          "/sign-up",
        ],
      },
    ],
    sitemap: "https://www.kasiflavors.co.za/sitemap.xml",
  };
}
