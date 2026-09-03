import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const mono = IBM_Plex_Mono({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-ibm-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Desafio Nivvo',
  description: 'Uma experiência rápida de decisões financeiras.',
  openGraph: { title: 'Desafio Nivvo', description: 'Uma experiência rápida de decisões financeiras.' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0B1F1A' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${manrope.variable} ${mono.variable}`}><body>{children}</body></html>;
}
