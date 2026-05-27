export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}
export function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
export function getContrastRatio(rgb1, rgb2) {
  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}
export function meetsWCAG_AA(contrastRatio, isLargeText = false) {
  return isLargeText ? contrastRatio >= 3 : contrastRatio >= 4.5;
}
export function meetsWCAG_AAA(contrastRatio, isLargeText = false) {
  return isLargeText ? contrastRatio >= 4.5 : contrastRatio >= 7;
}
export function parseColor(color) {
  if (color.startsWith("#")) {
    return hexToRgb(color);
  }
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  return [255, 255, 255];
}
export function getAdaptiveTextColor(backgroundColor, isDarkMode) {
  const bgRgb = parseColor(backgroundColor);
  if (!bgRgb) return isDarkMode ? "#FFFAF5" : "#0052CC";
  const luminance = getRelativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
  if (isDarkMode) {
    if (luminance > 0.5) {
      return "#3D2817";
    } else {
      return "#FFFAF5";
    }
  } else {
    if (luminance > 0.5) {
      return "#0052CC";
    } else {
      return "#FFFFFF";
    }
  }
}
export function getAdaptiveTextColorWithContrast(backgroundColor, isDarkMode, isLargeText = false) {
  const textColor = getAdaptiveTextColor(backgroundColor, isDarkMode);
  const bgRgb = parseColor(backgroundColor);
  const textRgb = parseColor(textColor);
  if (!bgRgb || !textRgb) {
    return {
      color: textColor,
      contrastRatio: 0,
      meetsWCAG: false
    };
  }
  const contrastRatio = getContrastRatio(bgRgb, textRgb);
  const meetsWCAG = meetsWCAG_AA(contrastRatio, isLargeText);
  return {
    color: textColor,
    contrastRatio: parseFloat(contrastRatio.toFixed(2)),
    meetsWCAG
  };
}
export function getColorInfo(backgroundColor, isDarkMode) {
  const result = getAdaptiveTextColorWithContrast(backgroundColor, isDarkMode);
  const bgRgb = parseColor(backgroundColor);
  return {
    backgroundColor,
    isDarkMode,
    theme: isDarkMode ? "dark" : "light",
    ...result,
    backgroundLuminance: bgRgb ? parseFloat(getRelativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]).toFixed(3)) : null
  };
}
