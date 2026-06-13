import type { Metadata } from "next";
import { Archivo, Archivo_Black, Yellowtail } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["500","600","700","800"] });
const archivoBlack = Archivo_Black({ variable: "--font-archivo-black", subsets: ["latin"], weight: "400" });
const yellowtail = Yellowtail({ variable: "--font-yellowtail", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "onions.lol — trade the one future America banned",
  description:
    "Onion futures have been illegal in the US since 1958. Trade them here — cash-settled against the real USDA onion price.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${yellowtail.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
