import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Toaster } from "sonner";
import SessionWrapper from "@/lib/sessionWrapper";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickSplit",
  description:
    "A simple and efficient way to split expenses with friends and family.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${inter.variable} font-sans antialiased bg-surface text-on-surface`}
      >
        <SessionWrapper>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </SessionWrapper>
      </body>
    </html>
  );
}
