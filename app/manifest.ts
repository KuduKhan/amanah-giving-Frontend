import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amanah Giving",
    short_name: "Amanah",
    description: "Give with Amanah. See the impact.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfcfa",
    theme_color: "#071a2c",
    lang: "en",
    icons: [
      {
        src: "/amanah-logo.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
