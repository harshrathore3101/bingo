import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

// Orbitron gives the UI a futuristic "gaming" feel; exposed as a CSS var so
// Tailwind's `font-display` utility can reference it.
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Neon Bingo",
  description: "A glowing, modern BINGO game built with Next.js + Framer Motion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={orbitron.variable}>
      <body className="font-display">{children}</body>
    </html>
  );
}
