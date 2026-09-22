import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";
import { event } from "@/lib/config";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `${event.artist} na Flecha de Fogo — Ingressos`,
  description: `${event.tagline}. ${event.dateLabel}, ${event.timeLabel} — ${event.venueName}.`,
  openGraph: {
    title: `${event.artist} na Flecha de Fogo`,
    description: `${event.tagline}. ${event.dateLabel}, ${event.timeLabel}.`,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${anton.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="rainbow-bar" />
        {children}
      </body>
    </html>
  );
}
