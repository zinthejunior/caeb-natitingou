function parseRGB(input) {
  const m = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === void 0 ? 1 : +m[4] };
}
function luminanceFromRgb({ r, g, b }) {
  const srgb = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
function getEffectiveBackgroundColor(el) {
  let node = el;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const bgImg = style.backgroundImage;
    const bgColor = style.backgroundColor;
    if (bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)") {
      return bgColor;
    }
    if (bgImg && bgImg !== "none" && bgColor && bgColor !== "transparent" && bgColor !== "rgba(0, 0, 0, 0)") {
      return bgColor;
    }
    node = node.parentElement;
  }
  const bodyStyle = window.getComputedStyle(document.body);
  return bodyStyle.backgroundColor || null;
}
function setAdaptiveForElement(container) {
  const bg = getEffectiveBackgroundColor(container);
  if (!bg) return;
  const rgb = parseRGB(bg);
  if (!rgb) return;
  if (rgb.a < 1 && rgb.a <= 0.01) return;
  const lum = luminanceFromRgb(rgb);
  const isDark = lum < 0.5;
  container.classList.toggle("adaptive-fg--dark", isDark);
  container.classList.toggle("adaptive-fg--light", !isDark);
}
function scanAll() {
  const els = Array.from(document.querySelectorAll(".adaptive-fg"));
  els.forEach((el) => setAdaptiveForElement(el));
}
function observe() {
  const ro = new ResizeObserver(() => scanAll());
  document.querySelectorAll(".adaptive-fg").forEach((el) => ro.observe(el));
  const mo = new MutationObserver((mutations) => {
    let should = false;
    for (const m of mutations) {
      if (m.type === "attributes" && (m.attributeName === "class" || m.attributeName === "style" || m.attributeName === "data-theme")) {
        should = true;
        break;
      }
      if (m.addedNodes && m.addedNodes.length) {
        should = true;
        break;
      }
    }
    if (should) scanAll();
  });
  mo.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    childList: true,
    attributeFilter: ["class", "style", "data-theme"]
  });
}
export function initAdaptiveFg() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => scanAll());
  observe();
}
initAdaptiveFg();
