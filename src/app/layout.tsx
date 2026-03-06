import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market Intelligence Agent",
  description: "Real-time stock & crypto dashboard with AI-powered analysis",
};

export const viewport: Viewport = {
  themeColor: "#0c0c14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="font-mono bg-bg text-[#e0e0f0] min-h-screen">{children}</body>
    </html>
  );
}
