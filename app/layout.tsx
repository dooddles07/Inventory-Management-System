import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";

// Archivo carries a width axis, which is where the display type gets its character.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

// Reserved for SKUs, bin addresses and every number on screen.
const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-martian",
});

export const metadata: Metadata = {
  title: {
    default: "Stockroom - inventory tracking for small warehouses",
    template: "%s - Stockroom",
  },
  description:
    "Give every part a bin number, see what is running low, and find anything on the floor map.",
};

export const viewport: Viewport = {
  themeColor: "#0d47a1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${martian.variable}`}>
      <body>{children}</body>
    </html>
  );
}
