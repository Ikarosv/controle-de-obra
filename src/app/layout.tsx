// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Controle de Obra • Gestão Financeira, Notas Fiscais & Rateio",
  description:
    "Sistema privado para gerenciamento de materiais, notas fiscais, etapas construtivas e rateio item a item.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${plusJakarta.variable}`}
    >
      <body className="min-h-screen bg-[#FAF8F5] text-[#1C1917] antialiased selection:bg-[#292524] selection:text-[#FAF8F5]">
        {children}
      </body>
    </html>
  );
}
