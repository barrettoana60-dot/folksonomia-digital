import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Sistema Folksonomia Digital",
  description: "Plataforma avançada de folksonomia, validação e interoperabilidade semântica para acervos museológicos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased min-h-screen">
        <Header />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}
