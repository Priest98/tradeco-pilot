import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeCo-Pilot | Personal Global Intelligence System",
  description: "Unified multi-domain situational awareness, deterministic statistical anomaly detection, Cesium 3D temporal replay, and 7-stage calibrated AI reasoning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://cesium.com/downloads/cesiumjs/releases/1.120/Build/Cesium/Widgets/widgets.css" />
        <script src="https://cesium.com/downloads/cesiumjs/releases/1.120/Build/Cesium/Cesium.js"></script>
      </head>
      <body className="antialiased select-none bg-[#06090e] text-slate-100 overflow-hidden h-screen w-screen">
        {children}
      </body>
    </html>
  );
}
