import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const flagsDir = join(import.meta.dirname, "..", "public", "flags");
mkdirSync(flagsDir, { recursive: true });

const viewBox = "0 0 20 14";

const flags = {

  // ── Horizontal stripes ──

  de: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#000"/>
    <rect y="4.67" width="20" height="4.66" fill="#dd0000"/>
    <rect y="9.33" width="20" height="4.67" fill="#ffce00"/>
  </svg>`,

  nl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#ae1c28"/>
    <rect y="4.67" width="20" height="4.66" fill="#fff"/>
    <rect y="9.33" width="20" height="4.67" fill="#21468b"/>
  </svg>`,

  ru: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <rect y="4.67" width="20" height="4.66" fill="#0039a6"/>
    <rect y="9.33" width="20" height="4.67" fill="#d52b1e"/>
  </svg>`,

  fr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#002395"/>
    <rect x="6.67" width="6.66" height="14" fill="#fff"/>
    <rect x="13.33" width="6.67" height="14" fill="#ed2939"/>
  </svg>`,

  it: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#009246"/>
    <rect x="6.67" width="6.66" height="14" fill="#fff"/>
    <rect x="13.33" width="6.67" height="14" fill="#ce2b37"/>
  </svg>`,

  pl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <rect y="7" width="20" height="7" fill="#dc143c"/>
  </svg>`,

  id: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <rect y="7" width="20" height="7" fill="#ce1126"/>
  </svg>`,

  // ── Vertical stripes ──

  pe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#d91023"/>
    <rect x="6.67" width="6.66" height="14" fill="#fff"/>
    <rect x="13.33" width="6.67" height="14" fill="#d91023"/>
  </svg>`,

  es: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#c60b1e"/>
    <rect y="3.5" width="20" height="7" fill="#ffc400"/>
    <rect y="3.5" x="6.15" width="7.7" height="7" fill="#c60b1e" rx="1"/>
  </svg>`,

  mx: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#006341"/>
    <rect x="6.67" width="6.66" height="14" fill="#fff"/>
    <rect x="13.33" width="6.67" height="14" fill="#ce1126"/>
    <circle cx="10" cy="7" r="2.5" fill="#8b4513"/>
  </svg>`,

  // ── Cross / Scandinavian ──

  se: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#005baa"/>
    <rect x="5.5" width="2.5" height="14" fill="#fecc00"/>
    <rect y="5.5" width="20" height="2.5" fill="#fecc00"/>
  </svg>`,

  // ── Diagonal / special ──

  cl: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <rect y="7" width="20" height="7" fill="#d52b1e"/>
    <rect width="6.67" height="7" fill="#0039a6"/>
    <circle cx="3.33" cy="3.5" r="1.8" fill="#fff"/>
  </svg>`,

  ar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#74acdf"/>
    <rect y="4.67" width="20" height="4.66" fill="#fff"/>
    <circle cx="10" cy="7" r="2.2" fill="#ffd700" opacity="0.6"/>
  </svg>`,

  // ── Simple emblem flags ──

  jp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <circle cx="10" cy="7" r="3.5" fill="#bc002d"/>
  </svg>`,

  kr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <rect x="5.5" y="2.5" width="9" height="9" rx="2" fill="#003478" opacity="0.15"/>
    <circle cx="10" cy="7" r="3.5" fill="#fff" stroke="#000" stroke-width="0.3"/>
    <path d="M10 3.5 A3.5 3.5 0 0 1 10 10.5" fill="#e60000" opacity="0.8"/>
    <path d="M10 3.5 A3.5 3.5 0 0 0 10 10.5" fill="#0039a6" opacity="0.8"/>
    <line x1="6.5" y1="3.5" x2="13.5" y2="3.5" stroke="#000" stroke-width="0.3"/>
    <line x1="6.5" y1="10.5" x2="13.5" y2="10.5" stroke="#000" stroke-width="0.3"/>
  </svg>`,

  tr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#e30a17"/>
    <circle cx="9.5" cy="7" r="3.5" fill="#fff"/>
    <circle cx="10.5" cy="7" r="2.8" fill="#e30a17"/>
    <polygon points="11.5,7 10,5.5 10,8.5" fill="#fff"/>
  </svg>`,

  // ── Tricolor with seal ──

  tw: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fe0000"/>
    <rect width="10" height="7" fill="#000095"/>
    <circle cx="5" cy="3.5" r="2" fill="#fff"/>
    <polygon points="5,1.5 5.5,3 7,3 5.8,4 6.2,5.5 5,4.5 3.8,5.5 4.2,4 3,3 4.5,3" fill="#fff"/>
    <circle cx="5" cy="3.5" r="0.6" fill="#000095"/>
  </svg>`,

  // ── Complex: blue with stars ──

  au: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#00008b"/>
    <rect x="0.5" y="0.5" width="6" height="7" fill="#fff"/>
    <line x1="3.5" y1="0" x2="3.5" y2="8" stroke="#00008b" stroke-width="0.3"/>
    <line x1="0" y1="4" x2="7" y2="4" stroke="#00008b" stroke-width="0.3"/>
    <line x1="0" y1="0" x2="7" y2="8" stroke="#00008b" stroke-width="0.6"/>
    <line x1="7" y1="0" x2="0" y2="8" stroke="#00008b" stroke-width="0.6"/>
    <circle cx="15" cy="2" r="1" fill="#fff"/>
    <circle cx="17.5" cy="4" r="0.7" fill="#fff"/>
    <circle cx="13" cy="5.5" r="0.7" fill="#fff"/>
    <circle cx="16" cy="7" r="0.7" fill="#fff"/>
    <circle cx="18.5" cy="9" r="0.7" fill="#fff"/>
    <circle cx="14" cy="10.5" r="0.7" fill="#fff"/>
  </svg>`,

  // ── Canada ──

  ca: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#d52b1e"/>
    <rect x="5" width="10" height="14" fill="#fff"/>
    <rect x="5" width="10" height="14" fill="#d52b1e"/>
    <rect x="6.5" width="7" height="14" fill="#fff"/>
    <path d="M10 2 L10.8 4.5 L13 4 L11.5 5.5 L13.5 6.5 L11.5 7 L13 9 L10.8 8.5 L10 11 L9.2 8.5 L7 9 L8.5 7 L6.5 6.5 L8.5 5.5 L7 4 L9.2 4.5 Z" fill="#d52b1e"/>
  </svg>`,

  // ── US ──

  us: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#fff"/>
    <rect y="1.08" width="20" height="1.08" fill="#bf0a30"/>
    <rect y="3.23" width="20" height="1.08" fill="#bf0a30"/>
    <rect y="5.38" width="20" height="1.08" fill="#bf0a30"/>
    <rect y="7.54" width="20" height="1.08" fill="#bf0a30"/>
    <rect y="9.69" width="20" height="1.08" fill="#bf0a30"/>
    <rect y="11.85" width="20" height="1.08" fill="#bf0a30"/>
    <rect width="8" height="7.54" fill="#002868"/>
    <circle cx="2.2" cy="1.1" r="0.25" fill="#fff"/>
    <circle cx="4.2" cy="1.1" r="0.25" fill="#fff"/>
    <circle cx="6.2" cy="1.1" r="0.25" fill="#fff"/>
    <circle cx="3.2" cy="2.3" r="0.25" fill="#fff"/>
    <circle cx="5.2" cy="2.3" r="0.25" fill="#fff"/>
    <circle cx="7.2" cy="2.3" r="0.25" fill="#fff"/>
    <circle cx="2.2" cy="3.5" r="0.25" fill="#fff"/>
    <circle cx="4.2" cy="3.5" r="0.25" fill="#fff"/>
    <circle cx="6.2" cy="3.5" r="0.25" fill="#fff"/>
    <circle cx="3.2" cy="4.7" r="0.25" fill="#fff"/>
    <circle cx="5.2" cy="4.7" r="0.25" fill="#fff"/>
    <circle cx="7.2" cy="4.7" r="0.25" fill="#fff"/>
    <circle cx="2.2" cy="5.9" r="0.25" fill="#fff"/>
    <circle cx="4.2" cy="5.9" r="0.25" fill="#fff"/>
    <circle cx="6.2" cy="5.9" r="0.25" fill="#fff"/>
    <circle cx="3.2" cy="7.1" r="0.25" fill="#fff"/>
    <circle cx="5.2" cy="7.1" r="0.25" fill="#fff"/>
  </svg>`,

  // ── Brazil ──

  br: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#009b3a"/>
    <polygon points="10,1 18,7 10,13 2,7" fill="#ffdf00"/>
    <circle cx="10" cy="7" r="3.2" fill="#002776"/>
    <polygon points="10,5.5 10.8,6.8 12.3,7 11.2,8 11.5,9.5 10,8.8 8.5,9.5 8.8,8 7.7,7 9.2,6.8" fill="#fff"/>
  </svg>`,

  // ── Philippines ──

  ph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#0038a8"/>
    <rect y="7" width="20" height="7" fill="#ce1126"/>
    <polygon points="0,7 8,0 8,14" fill="#fff"/>
    <circle cx="4" cy="7" r="1.8" fill="#fcd116"/>
    <polygon points="4,5.5 4.5,6.3 5.4,6.3 4.7,7 5,7.8 4,7.3 3,7.8 3.3,7 2.6,6.3 3.5,6.3" fill="#fcd116"/>
    <polygon points="4,4 4.3,4.5 4.8,4.5 4.4,4.9 4.6,5.3 4,5.1 3.4,5.3 3.6,4.9 3.2,4.5 3.7,4.5" fill="#fcd116"/>
    <polygon points="4,8.7 4.3,9.2 4.8,9.2 4.4,9.6 4.6,10 4,9.8 3.4,10 3.6,9.6 3.2,9.2 3.7,9.2" fill="#fcd116"/>
  </svg>`,

  // ── Thailand ──

  th: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#ed1c24"/>
    <rect y="2" width="20" height="3.33" fill="#fff"/>
    <rect y="5.33" width="20" height="3.34" fill="#241d4f"/>
    <rect y="8.67" width="20" height="3.33" fill="#fff"/>
  </svg>`,

  // ── China ──

  cn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#de2910"/>
    <polygon points="3,1.5 3.5,2.8 4.8,2.8 3.7,3.5 4,5 3,4.2 2,5 2.3,3.5 1.2,2.8 2.5,2.8" fill="#ffde00"/>
    <polygon points="6.5,1 6.7,1.5 7.2,1.5 6.8,1.8 7,2.3 6.5,2 6,2.3 6.2,1.8 5.8,1.5 6.3,1.5" fill="#ffde00"/>
    <polygon points="7.5,2.5 7.7,3 8.2,3 7.8,3.3 8,3.8 7.5,3.5 7,3.8 7.2,3.3 6.8,3 7.3,3" fill="#ffde00"/>
    <polygon points="7,4 7.2,4.5 7.7,4.5 7.3,4.8 7.5,5.3 7,5 6.5,5.3 6.7,4.8 6.3,4.5 6.8,4.5" fill="#ffde00"/>
    <polygon points="5.8,3.2 6,3.7 6.5,3.7 6.1,4 6.3,4.5 5.8,4.2 5.3,4.5 5.5,4 5.1,3.7 5.6,3.7" fill="#ffde00"/>
  </svg>`,

  // ── UK ──

  gb: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#012169"/>
    <rect x="8.5" width="3" height="14" fill="#fff"/>
    <rect y="5.5" width="20" height="3" fill="#fff"/>
    <rect x="9.5" width="1" height="14" fill="#c8102e"/>
    <rect y="6.5" width="20" height="1" fill="#c8102e"/>
    <line x1="0" y1="0" x2="20" y2="14" stroke="#fff" stroke-width="2.5"/>
    <line x1="20" y1="0" x2="0" y2="14" stroke="#fff" stroke-width="2.5"/>
    <line x1="0" y1="0" x2="20" y2="14" stroke="#c8102e" stroke-width="0.8"/>
    <line x1="20" y1="0" x2="0" y2="14" stroke="#c8102e" stroke-width="0.8"/>
  </svg>`,

  // ── South Korea (simplified) ──

  my: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
    <rect width="20" height="14" fill="#cc0001"/>
    <rect y="7" width="20" height="7" fill="#fff"/>
    <rect x="6" y="3" width="1.5" height="8" fill="#0038a8"/>
    <rect x="12.5" y="3" width="1.5" height="8" fill="#fcd116"/>
    <rect x="6" y="6.5" width="8" height="1" fill="#0038a8"/>
  </svg>`,
};

for (const [code, svg] of Object.entries(flags)) {
  writeFileSync(join(flagsDir, `${code}.svg`), svg.trim(), "utf-8");
  console.log(`✓ flags/${code}.svg`);
}

console.log(`\nDone — ${Object.keys(flags).length} flags written`);
