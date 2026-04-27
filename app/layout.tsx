import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Wanderlist — Travel Timeline",
  description: "Plan Your Wanderlust!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            try {
              const stored = JSON.parse(localStorage.getItem('trip-planner-storage') || '{}');
              const theme = stored?.state?.theme || 'light';
              document.documentElement.setAttribute('data-theme', theme);
            } catch(e) {
              document.documentElement.setAttribute('data-theme', 'light');
            }
          `
        }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
