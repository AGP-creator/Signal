import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Signal | Thirdbase",
  description: "Thesis-ranked deal intelligence for Thirdbase partners.",
};

const themeInit = `
(function () {
  try {
    var stored = localStorage.getItem("signal-theme");
    var dark = stored !== "light";
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${body.variable} ${mono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
