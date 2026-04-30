/**
 * Système de couleur de texte adaptative
 * 
 * Ce module fournit une fonctionnalité qui ajuste automatiquement la couleur du texte
 * en fonction de la luminance de la couleur de fond.
 * 
 * Utilisation:
 * 1. Ajoutez la classe CSS `adaptive-fg` à un conteneur
 * 2. Ajoutez l'attribut `data-adaptive` à tous les enfants qui doivent adapter leur couleur
 * 3. Cette script calcule la couleur de fond effective et applique soit `adaptive-fg--dark` soit `adaptive-fg--light`
 */

/**
 * Convertit une chaîne RGB ou RGBA en objet avec les valeurs r, g, b, a
 * @param input Chaîne au format "rgb(r, g, b)" ou "rgba(r, g, b, a)"
 * @returns Objet {r, g, b, a} ou null si le format n'est pas valide
 */
function parseRGB(input: string) {
  const m = input.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
}

/**
 * Calcule la luminance relative d'une couleur RGB
 * Utilise la formule WCAG pour convertir sRGB en luminance
 * @param r, g, b Valeurs de couleur RGB (0-255)
 * @returns Luminance (0-1) où 0 = noir, 1 = blanc
 */
function luminanceFromRgb({ r, g, b }: { r: number; g: number; b: number }) {
  // Convertit sRGB en valeurs linéaires
  const srgb = [r / 255, g / 255, b / 255].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  // Applique les pondérations WCAG
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Récupère la couleur de fond effective d'un élément
 * Remonte l'arborescence du DOM si la couleur est transparente
 * @param el Élément DOM à analyser
 * @returns Couleur de fond effective en format RGB/RGBA ou null
 */
function getEffectiveBackgroundColor(el: Element | null): string | null {
  let node: Element | null = el as Element | null;
  
  // Remonte l'arborescence jusqu'à trouver une couleur de fond non-transparente
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node as Element);
    const bgImg = style.backgroundImage;
    const bgColor = style.backgroundColor;
    
    // Préfère une couleur de fond explicite non-transparente
    if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      return bgColor;
    }
    
    // Si une image de fond existe (gradient), mais également une couleur
    if (bgImg && bgImg !== 'none' && bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
      return bgColor;
    }
    
    // Continue vers le parent
    node = node.parentElement;
  }
  
  // Fallback final: couleur de fond du body
  const bodyStyle = window.getComputedStyle(document.body);
  return bodyStyle.backgroundColor || null;
}

/**
 * Applique les classes CSS adaptatives à un élément en fonction de sa couleur de fond
 * @param container Élément conteneur auquel appliquer le style adaptatif
 */
function setAdaptiveForElement(container: Element) {
  // Récupère la couleur de fond effective
  const bg = getEffectiveBackgroundColor(container);
  if (!bg) return;
  
  // Parse la valeur RGB
  const rgb = parseRGB(bg);
  if (!rgb) return;
  
  // Ignore les couleurs très transparentes (alpha <= 0.01)
  if (rgb.a < 1 && rgb.a <= 0.01) return;
  
  // Calcule la luminance
  const lum = luminanceFromRgb(rgb);
  
  // Si luminance < 0.5, fond sombre => texte clair
  const isDark = lum < 0.5;
  
  // Applique les classes CSS correspondantes
  (container as HTMLElement).classList.toggle('adaptive-fg--dark', isDark);
  (container as HTMLElement).classList.toggle('adaptive-fg--light', !isDark);
}

/**
 * Scanne tous les éléments avec la classe `adaptive-fg` et applique les styles adaptatifs
 */
function scanAll() {
  const els = Array.from(document.querySelectorAll('.adaptive-fg'));
  els.forEach((el) => setAdaptiveForElement(el));
}

/**
 * Configure les observateurs pour mettre à jour les styles
 * réactifs aux changements de taille et de DOM
 */
function observe() {
  // Réappliquer le style lors de redimensionnement
  const ro = new ResizeObserver(() => scanAll());
  document.querySelectorAll('.adaptive-fg').forEach((el) => ro.observe(el));

  // Réappliquer le style lors de changements du DOM ou du thème
  const mo = new MutationObserver((mutations) => {
    let should = false;
    for (const m of mutations) {
      // Vérifie si les attributs pertinents ont changé (class, style, data-theme)
      if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'style' || m.attributeName === 'data-theme')) {
        should = true; 
        break;
      }
      // Vérifie si de nouveaux éléments ont été ajoutés
      if (m.addedNodes && m.addedNodes.length) { 
        should = true; 
        break; 
      }
    }
    if (should) scanAll();
  });
  
  // Observe les changements du DOM root
  mo.observe(document.documentElement, { 
    attributes: true, 
    subtree: true, 
    childList: true, 
    attributeFilter: ['class', 'style', 'data-theme'] 
  });
}

/**
 * Initialise le système de couleur adaptative
 * Appelé automatiquement au chargement du module
 */
export function initAdaptiveFg() {
  if (typeof window === 'undefined') return;
  
  // Scan initial après le rendu du navigateur
  window.requestAnimationFrame(() => scanAll());
  
  // Configure les observateurs pour les mises à jour réactives
  observe();
}

// Auto-initialisation au moment de l'import
initAdaptiveFg();
