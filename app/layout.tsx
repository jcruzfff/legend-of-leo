import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GameProvider } from "@/lib/contexts/GameContext";
import "./globals.css";
import WalletProvider from "@/components/wallet/WalletProvider";
import WalletListener from "@/components/wallet/WalletListener";
import ConnectedWalletDisplay from "@/components/wallet/ConnectedWalletDisplay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legend of Leo - Aleo Blockchain Learning Game",
  description: "Learn Aleo blockchain concepts through an interactive RPG experience",
  keywords: ["Aleo", "blockchain", "game", "RPG", "education", "crypto", "Web3"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          <WalletListener />
          <ConnectedWalletDisplay />
          <GameProvider>{children}</GameProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
