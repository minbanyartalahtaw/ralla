import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RALLA — Order & Delivery Admin",
    short_name: "RALLA",
    description: "Internal admin for tracking RALLA orders and delivery status.",
    start_url: "/user/dashboard",
    display: "standalone",
    background_color: "#fbf8f9",
    theme_color: "#a53860",
    icons: [
      { src: "/logo/icon-circle-72.png", sizes: "72x72", type: "image/png" },
      { src: "/logo/icon-circle-96.png", sizes: "96x96", type: "image/png" },
      { src: "/logo/icon-circle-128.png", sizes: "128x128", type: "image/png" },
      { src: "/logo/icon-circle-144.png", sizes: "144x144", type: "image/png" },
      { src: "/logo/icon-circle-152.png", sizes: "152x152", type: "image/png" },
      { src: "/logo/icon-circle-192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo/icon-circle-384.png", sizes: "384x384", type: "image/png" },
      { src: "/logo/icon-circle-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
