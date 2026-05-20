import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const badgesDir = join(import.meta.dirname, "..", "public", "badges");
mkdirSync(badgesDir, { recursive: true });

// ── Title badges (16×16) ──

const titles = {
  // Star/chevron in gold
  "badge-captain": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="#1a0f06"/>
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="none" stroke="#ffd76b" stroke-width="0.5"/>
    <polygon points="8,2 9.5,6 13.5,6 10.2,8.5 11.5,12.5 8,10 4.5,12.5 5.8,8.5 2.5,6 6.5,6" fill="#ffd76b"/>
  </svg>`,

  // Crossed swords in red
  "badge-raider": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="#1a0f06"/>
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="none" stroke="#ff6241" stroke-width="0.5"/>
    <line x1="5" y1="3" x2="11" y2="13" stroke="#ff6241" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="11" y1="3" x2="5" y2="13" stroke="#ff6241" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="8" x2="13" y2="8" stroke="#ff6241" stroke-width="0.8"/>
  </svg>`,

  // Gear/cog in steel blue
  "badge-engineer": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="#1a0f06"/>
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="none" stroke="#6897c8" stroke-width="0.5"/>
    <circle cx="8" cy="8" r="2.5" fill="none" stroke="#6897c8" stroke-width="1.2"/>
    <circle cx="8" cy="8" r="1" fill="#6897c8"/>
    <rect x="7" y="2.5" width="2" height="3" rx="0.5" fill="#6897c8"/>
    <rect x="7" y="10.5" width="2" height="3" rx="0.5" fill="#6897c8"/>
    <rect x="2.5" y="7" width="3" height="2" rx="0.5" fill="#6897c8"/>
    <rect x="10.5" y="7" width="3" height="2" rx="0.5" fill="#6897c8"/>
  </svg>`,

  // Eye/crystal ball in purple
  "badge-oracle": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="#1a0f06"/>
    <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill="none" stroke="#9b7cff" stroke-width="0.5"/>
    <circle cx="8" cy="7" r="4" fill="none" stroke="#9b7cff" stroke-width="1"/>
    <circle cx="8" cy="7" r="1.2" fill="#9b7cff"/>
    <path d="M8 11 Q6 12 8 13 Q10 12 8 11" fill="#9b7cff"/>
  </svg>`,
};

// ── Accent badges (12×12 gem shapes) ──

const accents = {
  // Sky blue gem
  "accent-sky": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
    <polygon points="6,1 10,6 6,11 2,6" fill="#62c3ff" stroke="#3a8bc7" stroke-width="0.5"/>
    <polygon points="6,2 9,6 6,10 3,6" fill="#62c3ff" opacity="0.6"/>
    <polygon points="6,3 7.5,6 6,9 4.5,6" fill="#a0dfff" opacity="0.4"/>
  </svg>`,

  // Coral pink gem
  "accent-coral": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
    <polygon points="6,1 10,6 6,11 2,6" fill="#ff8f72" stroke="#d4604a" stroke-width="0.5"/>
    <polygon points="6,2 9,6 6,10 3,6" fill="#ff8f72" opacity="0.6"/>
    <polygon points="6,3 7.5,6 6,9 4.5,6" fill="#ffbbaa" opacity="0.4"/>
  </svg>`,

  // Mint green gem
  "accent-mint": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
    <polygon points="6,1 10,6 6,11 2,6" fill="#71dfb0" stroke="#3fa87b" stroke-width="0.5"/>
    <polygon points="6,2 9,6 6,10 3,6" fill="#71dfb0" opacity="0.6"/>
    <polygon points="6,3 7.5,6 6,9 4.5,6" fill="#a8f0d4" opacity="0.4"/>
  </svg>`,

  // Gold gem
  "accent-gold": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
    <polygon points="6,1 10,6 6,11 2,6" fill="#ffd36d" stroke="#c49a30" stroke-width="0.5"/>
    <polygon points="6,2 9,6 6,10 3,6" fill="#ffd36d" opacity="0.6"/>
    <polygon points="6,3 7.5,6 6,9 4.5,6" fill="#ffe8a8" opacity="0.4"/>
  </svg>`,
};

for (const [name, svg] of Object.entries(titles)) {
  writeFileSync(join(badgesDir, `${name}.svg`), svg.trim(), "utf-8");
  console.log(`✓ badges/${name}.svg`);
}
for (const [name, svg] of Object.entries(accents)) {
  writeFileSync(join(badgesDir, `${name}.svg`), svg.trim(), "utf-8");
  console.log(`✓ badges/${name}.svg`);
}

console.log(`\nDone — ${Object.keys(titles).length + Object.keys(accents).length} badges written`);
