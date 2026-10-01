import localFont from "next/font/local";
import "./globals.css";

const hand = localFont({ src: "./fonts/ArchitectsDaughter-Regular.woff2", variable: "--font-hand", display: "swap" });
const display = localFont({
  src: [
    { path: "./fonts/CabinSketch-Regular.woff2", weight: "400" },
    { path: "./fonts/CabinSketch-Bold.woff2", weight: "700" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "History of Rock",
  description: "An interactive, explorable version of the History of Rock chalkboard from School of Rock.",
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1f5a44" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${hand.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
