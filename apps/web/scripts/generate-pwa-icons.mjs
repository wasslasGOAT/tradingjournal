// Génère les icônes PWA (W-7, ADR-023/024) en PNG bruts, sans dépendance
// (zlib est natif à Node) : encodeur PNG minimal (8 bits, RGBA, sans
// entrelacement) + un tracé vectoriel à la main (fond + repère graphique
// stylisé, générique — ne reprend ni le nom, ni le logo, ni les textes de
// TradeX, cf. CLAUDE.md).
//
// Régénération : `node apps/web/scripts/generate-pwa-icons.mjs` depuis la
// racine du dépôt (ou `pnpm --filter @repo/web generate:icons`). Les PNG
// produits sont commités dans `apps/web/public/icons/` (pas régénérés au
// build) pour rester reproductibles sans dépendre de ce script à chaque CI.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// Tokens sombres (source : `@repo/ui/tokens-data`, `src/tokens.data.cjs`)
// recopiés en dur ici : ce script tourne hors du graphe de modules Vite/TS de
// l'app (simple script Node autonome), et ces trois couleurs ne changent pas
// sans repasser par un ADR de toute façon (ADR-012).
const BACKGROUND = '#000000';
const SURFACE = '#0E0E11';
const ACCENT = '#5081FC';

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

/** Encodeur PNG minimal : RGBA 8 bits, une seule passe (pas d'entrelacement). */
function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBuffer = Buffer.from(type, 'ascii');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuffer, data]);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Chaque ligne préfixée d'un octet de filtre (0 = aucun filtre).
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idatData = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let crcTable = null;
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
function crc32(buffer) {
  if (!crcTable) crcTable = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Dessine le repère : trois barres ascendantes (mini graphique en barres),
 * motif générique de journal de trading, dans un carré `size`×`size`.
 * `padRatio` = marge autour du motif (zone de sécurité pour les icônes
 * maskable, cf. spec W3C : contenu important dans le cercle central ~40 %
 * de rayon → on prend une marge large et une forme compacte et centrée).
 */
function drawIcon({ size, padRatio, bg, withBackdrop }) {
  const [bgR, bgG, bgB] = hexToRgb(bg);
  const [accentR, accentG, accentB] = hexToRgb(ACCENT);
  const [surfaceR, surfaceG, surfaceB] = hexToRgb(SURFACE);
  const pixels = Buffer.alloc(size * size * 4);

  const pad = Math.round(size * padRatio);
  const contentSize = size - pad * 2;
  const barCount = 3;
  const gap = Math.round(contentSize * 0.12);
  const barWidth = Math.round((contentSize - gap * (barCount - 1)) / barCount);
  const heights = [0.42, 0.72, 1.0].map((h) => Math.round(contentSize * h));
  const baseY = size - pad;
  const radius = Math.max(2, Math.round(barWidth * 0.28));

  function setPixel(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = r;
    pixels[i + 1] = g;
    pixels[i + 2] = b;
    pixels[i + 3] = a;
  }

  // Fond plein (aucune transparence — sûr pour maskable et apple-touch-icon).
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      setPixel(x, y, bgR, bgG, bgB, 255);
    }
  }

  // Disque discret « surface » derrière le motif, purement décoratif — reste
  // bien dans la zone de sécurité maskable.
  if (withBackdrop) {
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.42;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          setPixel(x, y, surfaceR, surfaceG, surfaceB, 255);
        }
      }
    }
  }

  // Barres ascendantes, coins légèrement arrondis (test de distance simple).
  let x0 = pad + Math.round((contentSize - (barWidth * barCount + gap * (barCount - 1))) / 2);
  for (let b = 0; b < barCount; b += 1) {
    const h = heights[b];
    const barX0 = x0;
    const barX1 = x0 + barWidth;
    const barY0 = baseY - h;
    const barY1 = baseY;
    for (let y = barY0; y < barY1; y += 1) {
      for (let x = barX0; x < barX1; x += 1) {
        // Coins arrondis uniquement en haut de la barre.
        const nearTop = y - barY0 < radius;
        if (nearTop) {
          const cornerLeft = x - barX0 < radius;
          const cornerRight = barX1 - x < radius;
          if (cornerLeft) {
            const dx = radius - (x - barX0);
            const dy = radius - (y - barY0);
            if (dx * dx + dy * dy > radius * radius) continue;
          } else if (cornerRight) {
            const dx = radius - (barX1 - x);
            const dy = radius - (y - barY0);
            if (dx * dx + dy * dy > radius * radius) continue;
          }
        }
        setPixel(x, y, accentR, accentG, accentB, 255);
      }
    }
    x0 += barWidth + gap;
  }

  return encodePng(size, size, pixels);
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192, padRatio: 0.24, bg: BACKGROUND, withBackdrop: true },
  { file: 'icon-512.png', size: 512, padRatio: 0.24, bg: BACKGROUND, withBackdrop: true },
  // Maskable : marge plus large pour rester dans le cercle de sécurité (~40 % de rayon).
  { file: 'icon-maskable-192.png', size: 192, padRatio: 0.32, bg: BACKGROUND, withBackdrop: true },
  { file: 'icon-maskable-512.png', size: 512, padRatio: 0.32, bg: BACKGROUND, withBackdrop: true },
  // apple-touch-icon : iOS arrondit lui-même les coins et ignore la
  // transparence (rendue en noir) — fond plein requis, pas de canal alpha utile.
  { file: 'apple-touch-icon.png', size: 180, padRatio: 0.26, bg: BACKGROUND, withBackdrop: true },
];

for (const target of targets) {
  const png = drawIcon(target);
  writeFileSync(resolve(outDir, target.file), png);
  console.log(`Écrit : icons/${target.file} (${target.size}×${target.size})`);
}
