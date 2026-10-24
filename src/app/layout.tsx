import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PRAKRITI | Earth Observation Platform",
    template: "%s | PRAKRITI",
  },
  description:
    "PRAKRITI is an AI-powered Earth observation platform for satellite-based vegetation analysis, environmental change monitoring, and PDF reporting.",
  applicationName: "PRAKRITI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
