import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import AppShell from "@/components/app-shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TASQYN AI — мониторинг подтоплений Павлодара",
    template: "%s · TASQYN AI",
  },
  description:
    "Intelligent Urban Flood Monitoring & Risk Intelligence Platform. Интерактивная карта подтоплений, AI-анализ сообщений жителей и индекс риска для города Павлодар.",
};

export const viewport: Viewport = {
  themeColor: "#f6f8fb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        <Suspense fallback={<div className="min-h-dvh" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
