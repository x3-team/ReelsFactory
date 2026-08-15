import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#14110f",
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
