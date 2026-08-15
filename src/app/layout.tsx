import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synapse Editor",
  description: "AI-Powered Notion Clone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={{ ...dark }}>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-zinc-950 text-zinc-100`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
