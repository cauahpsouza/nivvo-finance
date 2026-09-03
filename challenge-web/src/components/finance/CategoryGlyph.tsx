import React from 'react';
import { Category } from '../../types';

export type FinanceGlyphCategory = Category
  | 'Casa'
  | 'Compromisso'
  | 'Educação'
  | 'Tecnologia'
  | 'Meta'
  | 'Viagem'
  | 'Renda'
  | 'Planejamento'
  | 'Imprevisto'
  | 'Compra necessária';

export function CategoryGlyph({ category, size = 20 }: { category: FinanceGlyphCategory; size?: number }) {
  const props = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  let glyph: React.ReactNode;

  switch (category) {
    case 'Alimentação':
      glyph = <path d="M6 3v7m3-7v7M6 7h3m-1.5 3v11M16 3v18m0-18c3 2 3 7 0 9" {...props} />;
      break;
    case 'Delivery':
      glyph = <><path d="M5 19 19 5c2.5 4.5 1 10-2.5 13.5C13 22 8 22 5 19Z" {...props} /><path d="m9 15 2 2m3-7 2 2M8 18l10-10" {...props} /></>;
      break;
    case 'Transporte':
      glyph = <><circle cx="5" cy="18" r="2" {...props} /><circle cx="18" cy="6" r="2" {...props} /><path d="M7 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3m-4 2 3-3 3 3" {...props} /></>;
      break;
    case 'Mercado':
      glyph = <><path d="M4 8h16l-2 10H6L4 8Zm4 0 4-5 4 5" {...props} /><path d="M9 12v2m6-2v2" {...props} /></>;
      break;
    case 'Saúde':
      glyph = <><path d="M12 20s-8-4.5-8-10a4 4 0 0 1 7-2.6L12 9l1-1.6A4 4 0 0 1 20 10c0 5.5-8 10-8 10Z" {...props} /><path d="M9 13h2l1-2 1 4 1-2h2" {...props} /></>;
      break;
    case 'Lazer':
      glyph = <><path d="M7 8h10a4 4 0 0 1 3.8 5.3l-1.4 4.1a2.3 2.3 0 0 1-3.8.9L13.8 16h-3.6l-1.8 2.3a2.3 2.3 0 0 1-3.8-.9l-1.4-4.1A4 4 0 0 1 7 8Z" {...props} /><path d="M8 11v4m-2-2h4m6-1h.01m2 2h.01" {...props} /></>;
      break;
    case 'Contas':
    case 'Compromisso':
      glyph = <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" {...props} /><path d="M9 8h6m-6 4h6m-6 4h3" {...props} /></>;
      break;
    case 'Casa':
      glyph = <><path d="m3 11 9-7 9 7v9H3v-9Z" {...props} /><path d="M9 20v-6h6v6" {...props} /></>;
      break;
    case 'Educação':
      glyph = <path d="M4 5.5A3.5 3.5 0 0 1 7.5 4H11v15H7.5A3.5 3.5 0 0 0 4 20.5v-15Zm16 0A3.5 3.5 0 0 0 16.5 4H13v15h3.5a3.5 3.5 0 0 1 3.5 1.5v-15Z" {...props} />;
      break;
    case 'Tecnologia':
      glyph = <><path d="M3 5h18v12H3zM8 21h8m-4-4v4" {...props} /><path d="m7 13 3-3 2 2 4-4" {...props} /></>;
      break;
    case 'Meta':
      glyph = <><circle cx="11" cy="13" r="7" {...props} /><circle cx="11" cy="13" r="3" {...props} /><path d="m14 10 7-7m0 0v5m0-5h-5" {...props} /></>;
      break;
    case 'Viagem':
      glyph = <><path d="m3 14 18-8-6 15-3-6-9-1Z" {...props} /><path d="m12 15 4-4" {...props} /></>;
      break;
    case 'Renda':
      glyph = <><path d="M3 7h18v13H3zM3 10h18" {...props} /><path d="m9 6 3-3 3 3m-3-3v11" {...props} /></>;
      break;
    case 'Planejamento':
      glyph = <><path d="M6 4h12v17H6zM9 2v4m6-4v4M9 10h6" {...props} /><path d="m9 15 2 2 4-4" {...props} /></>;
      break;
    case 'Imprevisto':
    case 'Compra necessária':
      glyph = <><path d="M12 3 3.5 19h17L12 3Z" {...props} /><path d="M12 9v4m0 3h.01" {...props} /></>;
      break;
    case 'Outros':
    default:
      glyph = <><path d="M12 5v14M5 12h14" {...props} /><path d="M4 4h16v16H4z" {...props} /></>;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {glyph}
    </svg>
  );
}
