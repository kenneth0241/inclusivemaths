import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GameTemplatesSettingsCorner } from "./components/GameTemplatesSettingsLink";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inclusive Maths · Teacher studio",
  description:
    "Primary Grade 1 Inclusive Maths studio: textbook chat, learner profiles, lesson plans, worksheets and games.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        <GameTemplatesSettingsCorner />
        {children}
      </body>
    </html>
  );
}
