import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientRoot from "./ClientRoot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatQXT · QXT-AI v1",
  description:
    "ChatQXT – conversational interface powered by the OpenQCore engine (QXT-AI).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable}
          antialiased
          bg-[#020712]
          text-emerald-50
        `}
      >
        <ClientRoot>
          <div className="min-h-screen">
            {children}
          </div>
        </ClientRoot>
      </body>
    </html>
  );
}