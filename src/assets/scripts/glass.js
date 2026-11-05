// Liquid glass for a rounded panel, built for its exact size and corner radius: a rim light for every browser and, in
// Chromium, a refraction map behind the panel's own SVG filter, which its backdrop-filter takes through --glass-lens
const built = new Map();
const LIGHT = { x: -0.6, y: -0.8 };
const SVG = "http://www.w3.org/2000/svg";
let lenses = 0;

function maps(w, h, r, bezel, dpr) {
  const key = `${w}x${h}x${r}x${dpr}`;
  if (built.has(key)) return built.get(key);
  const lens = document.createElement("canvas");
  lens.width = w;
  lens.height = h;
  const rim = document.createElement("canvas");
  rim.width = w * dpr;
  rim.height = h * dpr;
  const lensData = lens.getContext("2d").createImageData(w, h);
  const rimData = rim.getContext("2d").createImageData(rim.width, rim.height);

  // signed distance to the rounded rectangle's edge (positive inside) and the outward normal there
  const shape = (x, y) => {
    const px = x - w / 2;
    const py = y - h / 2;
    const qx = Math.abs(px) - (w / 2 - r);
    const qy = Math.abs(py) - (h / 2 - r);
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    const corner = Math.hypot(ox, oy);
    const inside = -(corner + Math.min(Math.max(qx, qy), 0) - r);
    if (qx > 0 && qy > 0) return { d: inside, nx: (Math.sign(px) * ox) / corner, ny: (Math.sign(py) * oy) / corner };
    return qx > qy ? { d: inside, nx: Math.sign(px), ny: 0 } : { d: inside, nx: 0, ny: Math.sign(py) };
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { d, nx, ny } = shape(x + 0.5, y + 0.5);
      const i = (y * w + x) * 4;
      // the rim bends like a convex bevel: strongest at the edge, gone where the glass turns flat
      const t = d > 0 && d < bezel ? 1 - d / bezel : 0;
      const m = t * t;
      lensData.data[i] = 128 - nx * m * 127;
      lensData.data[i + 1] = 128 - ny * m * 127;
      lensData.data[i + 2] = 128;
      lensData.data[i + 3] = 255;
    }
  }
  for (let y = 0; y < rim.height; y++) {
    for (let x = 0; x < rim.width; x++) {
      const { d, nx, ny } = shape((x + 0.5) / dpr, (y + 0.5) / dpr);
      if (d <= 0 || d > 3) continue;
      // light catches the edge facing the top left, and its opposite corner more faintly
      const facing = nx * LIGHT.x + ny * LIGHT.y;
      const strength = facing > 0 ? facing : -facing * 0.55;
      const fade = d < 1 ? d : 1 - (d - 1) / 2;
      const i = (y * rim.width + x) * 4;
      rimData.data[i] = rimData.data[i + 1] = rimData.data[i + 2] = 255;
      rimData.data[i + 3] = Math.round(255 * Math.min(1, 0.25 + strength ** 1.6) * fade);
    }
  }
  lens.getContext("2d").putImageData(lensData, 0, 0);
  rim.getContext("2d").putImageData(rimData, 0, 0);
  const result = { lens: lens.toDataURL(), rim: rim.toDataURL() };
  built.set(key, result);
  return result;
}

function lensFor(panel) {
  panel.dataset.glassLens ||= `glass-lens-${++lenses}`;
  const id = panel.dataset.glassLens;
  const existing = document.getElementById(id);
  if (existing) return existing;
  const defs = document.querySelector(".svg-defs");
  if (!defs) return null;
  const filter = document.createElementNS(SVG, "filter");
  filter.id = id;
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const image = document.createElementNS(SVG, "feImage");
  image.setAttribute("result", "map");
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("preserveAspectRatio", "none");
  const bend = document.createElementNS(SVG, "feDisplacementMap");
  bend.setAttribute("in", "SourceGraphic");
  bend.setAttribute("in2", "map");
  bend.setAttribute("scale", "28");
  bend.setAttribute("xChannelSelector", "R");
  bend.setAttribute("yChannelSelector", "G");
  filter.append(image, bend);
  defs.append(filter);
  return filter;
}

// shade: an optional sibling that carries the panel's drop shadow, as an unfolding clip would cut a shadow of its own; it takes
// the panel's width and, as --glass-height, the height its own CSS grows to
export function liquidGlass(panel, shade, bezel = 16) {
  const w = panel.offsetWidth;
  const h = panel.offsetHeight;
  if (!w || !h) return;
  if (shade) {
    shade.style.width = `${w}px`;
    shade.style.setProperty("--glass-height", `${h}px`);
  }
  const r = Math.min(parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0, w / 2, h / 2);
  const { lens, rim } = maps(w, h, r, Math.min(bezel, r + 4, w / 2, h / 2), Math.min(2, Math.ceil(window.devicePixelRatio || 1)));
  panel.style.setProperty("--glass-rim", `url("${rim}")`);
  if (!document.documentElement.classList.contains("has-glass-lens")) return;
  const filter = lensFor(panel);
  const image = filter?.querySelector("feImage");
  if (!image) return;
  filter.setAttribute("width", w);
  filter.setAttribute("height", h);
  image.setAttribute("width", w);
  image.setAttribute("height", h);
  image.setAttribute("href", lens);
  panel.style.setProperty("--glass-lens", `url("#${filter.id}")`);
}
