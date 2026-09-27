import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: "PokeFinance — Track Your Spending, Train Your Pokémon",
  description:
    "A gamified finance tracker where every purchase levels up your Pokémon. Track spending across apps, earn EXP, watch your team evolve. Powered by real Pokémon mechanics.",
  keywords: ["finance tracker", "pokemon", "gamified", "spending", "budget", "expense tracker"],
  authors: [{ name: "PokeFinance" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/pokeball-icon.svg",
    apple: "/pokeball-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
