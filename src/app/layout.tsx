import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { FinanceProvider } from "../context/FinanceContext";
import { Toaster } from "../components/ui/Toaster";
import { AppShell } from "../components/layout/AppShell";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  title: "Nivvo | Controle Financeiro",
  description: "Controle financeiro para gastos, metas e progresso.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${ibmPlexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans text-text-primary bg-background">
        <FinanceProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </FinanceProvider>
      </body>
    </html>
  );
}
