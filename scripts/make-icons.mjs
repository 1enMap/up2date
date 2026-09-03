/**
 * Builds the app icon set from a single source image (the Up2Date globe mark on a
 * dark rounded square, on a white page).
 *
 *   node scripts/make-icons.mjs <source.png>
 *
 * Produces, in assets/:
 *   icon.png                    1024 full-bleed square (iOS applies its own mask)
 *   android-icon-foreground.png 1024 globe on transparent, inside the safe zone
 *   android-icon-background.png 1024 solid brand background
 *   android-icon-monochrome.png 1024 white silhouette on transparent
 *   splash-icon.png              512 globe on transparent
 *   favicon.png                   64 full-bleed square
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SOURCE = process.argv[2];
const OUT = path.join(process.cwd(), 'assets');
const BRAND_BG = [14, 18, 28];

if (!SOURCE || !fs.existsSync(SOURCE)) {
  console.error('Usage: node scripts/make-icons.mjs <source.png>');
  process.exit(1);
}

const src = PNG.sync.read(fs.readFileSync(SOURCE));
const at = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};

/**
 * Bounding box of the dark icon card. Keyed on darkness rather than
 * "not white" so the soft drop shadow under the card is excluded.
 */
function contentBox(img) {
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const [r, g, b, a] = at(img, x, y);
      if (a < 8 || r + g + b > 260) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function crop(img, box) {
  const out = new PNG({ width: box.w, height: box.h });
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const s = (img.width * (y + box.y) + (x + box.x)) << 2;
      const d = (out.width * y + x) << 2;
      out.data[d] = img.data[s];
      out.data[d + 1] = img.data[s + 1];
      out.data[d + 2] = img.data[s + 2];
      out.data[d + 3] = img.data[s + 3];
    }
  }
  return out;
}

/** Bilinear resample — good enough for downscaling a flat vector-style mark. */
function resize(img, w, h) {
  const out = new PNG({ width: w, height: h });
  const sx = img.width / w;
  const sy = img.height / h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Box-average the source pixels this destination pixel covers.
      const x0 = Math.floor(x * sx);
      const y0 = Math.floor(y * sy);
      const x1 = Math.min(img.width, Math.max(x0 + 1, Math.ceil((x + 1) * sx)));
      const y1 = Math.min(img.height, Math.max(y0 + 1, Math.ceil((y + 1) * sy)));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const [pr, pg, pb, pa] = at(img, xx, yy);
          // Weight colour by alpha so transparent pixels do not darken the edges.
          r += pr * pa;
          g += pg * pa;
          b += pb * pa;
          a += pa;
          n++;
        }
      }
      const d = (out.width * y + x) << 2;
      out.data[d] = a ? Math.round(r / a) : 0;
      out.data[d + 1] = a ? Math.round(g / a) : 0;
      out.data[d + 2] = a ? Math.round(b / a) : 0;
      out.data[d + 3] = Math.round(a / n);
    }
  }
  return out;
}

function fill(w, h, [r, g, b], alpha = 255) {
  const out = new PNG({ width: w, height: h });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    out.data[i + 3] = alpha;
  }
  return out;
}

function composite(base, layer, ox, oy) {
  for (let y = 0; y < layer.height; y++) {
    for (let x = 0; x < layer.width; x++) {
      const dx = x + ox;
      const dy = y + oy;
      if (dx < 0 || dy < 0 || dx >= base.width || dy >= base.height) continue;
      const s = (layer.width * y + x) << 2;
      const d = (base.width * dy + dx) << 2;
      const a = layer.data[s + 3] / 255;
      if (!a) continue;
      for (let c = 0; c < 3; c++) {
        base.data[d + c] = Math.round(layer.data[s + c] * a + base.data[d + c] * (1 - a));
      }
      base.data[d + 3] = Math.max(base.data[d + 3], layer.data[s + 3]);
    }
  }
  return base;
}

/**
 * The card is a near-uniform dark; dropping it leaves the coloured globe.
 * Light pixels go too — they are the antialiased edge of the card against the page.
 */
function dropCard(img, card) {
  const out = new PNG({ width: img.width, height: img.height });
  img.data.copy(out.data);
  for (let i = 0; i < out.data.length; i += 4) {
    const [r, g, b] = [out.data[i], out.data[i + 1], out.data[i + 2]];
    const nearCard = Math.abs(r - card[0]) + Math.abs(g - card[1]) + Math.abs(b - card[2]) < 90;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    // The mark is strongly coloured; everything else on the card is not.
    if (nearCard || saturation < 40) out.data[i + 3] = 0;
  }
  return out;
}

function boxOfVisible(img) {
  let minX = img.width;
  let minY = img.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (at(img, x, y)[3] < 24) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function silhouette(img) {
  const out = new PNG({ width: img.width, height: img.height });
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = 255;
    out.data[i + 2] = 255;
    out.data[i + 3] = img.data[i + 3];
  }
  return out;
}

/** Centres a transparent-background mark on a square canvas at `scale` of its width. */
function onCanvas(mark, size, scale, background) {
  const side = Math.round(size * scale);
  const ratio = mark.width / mark.height;
  const w = ratio >= 1 ? side : Math.round(side * ratio);
  const h = ratio >= 1 ? Math.round(side / ratio) : side;
  const canvas = background ? fill(size, size, background) : new PNG({ width: size, height: size });
  return composite(canvas, resize(mark, w, h), Math.round((size - w) / 2), Math.round((size - h) / 2));
}

const write = (name, png) => {
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
  console.log(`  ${name}  ${png.width}x${png.height}`);
};

// 1. The icon card, without the white page around it.
const card = crop(src, contentBox(src));
// Sample the card's own dark from a point just inside its top edge, away from the mark.
const cardColor = at(card, Math.round(card.width * 0.5), Math.round(card.height * 0.06)).slice(0, 3);

// 2. Full-bleed square. The card's rounded corners are antialiased against the white
// page, so those pale, unsaturated pixels are repainted in the card's own colour
// rather than composited — otherwise the icon keeps a white halo.
const squared = (() => {
  const out = new PNG({ width: card.width, height: card.height });
  card.data.copy(out.data);
  const cardLuma = cardColor[0] + cardColor[1] + cardColor[2];
  for (let i = 0; i < out.data.length; i += 4) {
    const [r, g, b] = [out.data[i], out.data[i + 1], out.data[i + 2]];
    const flat = Math.max(r, g, b) - Math.min(r, g, b) < 40;
    if (out.data[i + 3] < 250 || (flat && r + g + b > cardLuma + 60)) {
      out.data[i] = cardColor[0];
      out.data[i + 1] = cardColor[1];
      out.data[i + 2] = cardColor[2];
    }
    out.data[i + 3] = 255;
  }
  return out;
})();

// 3. The globe on its own.
const bare = dropCard(card, cardColor);
const mark = crop(bare, boxOfVisible(bare));

console.log(`source ${src.width}x${src.height} → card ${card.width}x${card.height}, mark ${mark.width}x${mark.height}`);
console.log(`card colour rgb(${cardColor.join(', ')})`);

fs.mkdirSync(OUT, { recursive: true });
write('icon.png', resize(squared, 1024, 1024));
write('favicon.png', resize(squared, 64, 64));
// Android masks the foreground hard; 62% keeps the mark inside the safe zone.
write('android-icon-foreground.png', onCanvas(mark, 1024, 0.62));
write('android-icon-background.png', fill(1024, 1024, BRAND_BG));
write('android-icon-monochrome.png', onCanvas(silhouette(mark), 1024, 0.62));
write('splash-icon.png', onCanvas(mark, 512, 0.8));
