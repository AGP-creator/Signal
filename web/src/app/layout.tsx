import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Signal · Thirdbase",
  description:
    "Deal intelligence OS for Thirdbase — thesis-ranked pipeline, sector calls, digests, and partner chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${sourceSans.variable} ${plexMono.variable} antialiased`}>
        <div className="noise" aria-hidden />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
