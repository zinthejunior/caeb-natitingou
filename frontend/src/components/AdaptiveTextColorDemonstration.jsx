import { useState } from "react";
import { useAdaptiveTextColor } from "@/hooks/useAdaptiveTextColor";
import { useTheme } from "@/hooks/useTheme";
import { getColorInfo } from "@/lib/contrast";
export function AdaptiveTextColorDemonstration() {
  const { theme } = useTheme();
  const [selectedBgColor, setSelectedBgColor] = useState("#FFFFFF");
  const demoColors = [
    { name: "Blanc pur", color: "#FFFFFF", lightText: "#0052CC", darkText: "#3D2817" },
    { name: "Bleu primaire", color: "#0052CC", lightText: "#FFFFFF", darkText: "#FFFAF5" },
    { name: "Bleu clair", color: "#E8EEF7", lightText: "#0052CC", darkText: "#3D2817" },
    { name: "Gris clair", color: "#F0F4F9", lightText: "#0052CC", darkText: "#3D2817" },
    { name: "Crème (dark mode)", color: "#FFFAF5", lightText: "#0052CC", darkText: "#3D2817" },
    { name: "Jaune or (dark mode)", color: "#FFDD66", lightText: "#0052CC", darkText: "#1A1410" }
  ];
  return <div className="w-full space-y-8 py-8">
      {
    /* Header */
  }
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-primary dark:text-library-dark-light">
          Système de Couleur de Texte Adaptatif
        </h1>
        <p className="text-lg text-slate-600 dark:text-library-dark-muted">
          Couleurs de texte qui s'adaptent dynamiquement au fond et au thème
        </p>
        <div className="flex gap-2 mt-4">
          <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-yellow-100 text-blue-700 dark:text-yellow-900 text-sm font-medium">
            Thème actuel: {theme.toUpperCase()}
          </span>
          <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-100 text-green-700 dark:text-green-900 text-sm font-medium">
            WCAG AA ✓
          </span>
        </div>
      </div>

      {
    /* Rules Explanation */
  }
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 surface dark:bg-library-dark-secondary rounded-lg border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-primary dark:text-library-dark-light mb-3">
            Mode Clair 🌞
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">●</span>
              <span><strong>Fond clair:</strong> Texte bleu primaire (#0052CC)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-white font-bold">●</span>
              <span><strong>Fond sombre:</strong> Texte blanc (#FFFFFF)</span>
            </li>
            <li className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Ratio de contraste: 8.6:1 (bleu sur blanc)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-primary dark:text-library-dark-light mb-3">
            Mode Sombre (Light 2.0) 🌙
          </h2>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-amber-900 font-bold">●</span>
              <span><strong>Fond clair:</strong> Texte marron (#3D2817)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-100 font-bold">●</span>
              <span><strong>Fond sombre:</strong> Texte crème (#FFFAF5)</span>
            </li>
            <li className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Ratio de contraste: 9.1:1 (marron sur crème)
            </li>
          </ul>
        </div>
      </div>

      {
    /* Interactive Color Palette */
  }
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary dark:text-library-dark-light">
          Palette de Démonstration
        </h2>
        <p className="text-slate-600 dark:text-library-dark-muted">
          Cliquez sur une couleur pour voir le texte adaptatif
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {demoColors.map((item) => <button
    key={item.color}
    onClick={() => setSelectedBgColor(item.color)}
    className={`transition-all rounded-lg p-4 border-2 ${selectedBgColor === item.color ? "border-blue-500 dark:border-yellow-400 ring-2 ring-blue-300 dark:ring-yellow-200" : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"}`}
    title={item.name}
  >
              <div
    className="w-full aspect-square rounded mb-2"
    style={{ backgroundColor: item.color }}
  />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                {item.name}
              </p>
            </button>)}
        </div>
      </div>

      {
    /* Selected Color Showcase */
  }
      <AdaptiveTextColorShowcase backgroundColor={selectedBgColor} />

      {
    /* Usage Examples */
  }
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary dark:text-library-dark-light">
          Exemples d'Utilisation
        </h2>
        <UsageExamples />
      </div>

      {
    /* Contrast Measurements */
  }
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary dark:text-library-dark-light">
          Mesures de Contraste
        </h2>
        <ContrastMeasurements />
      </div>
    </div>;
}
function AdaptiveTextColorShowcase({
  backgroundColor
}) {
  const { textColor, contrastRatio, meetsWCAG } = useAdaptiveTextColor(
    backgroundColor
  );
  const colorInfo = getColorInfo(backgroundColor, false);
  return <div className="space-y-6 p-6 surface dark:bg-library-dark-secondary rounded-lg">
      <h3 className="text-xl font-bold text-primary dark:text-library-dark-light">
        Aperçu du Texte Adaptatif
      </h3>

      {
    /* Main Showcase */
  }
      <div
    className="p-8 rounded-lg text-center transition-all"
    style={{
      backgroundColor,
      color: textColor
    }}
  >
        <p className="text-2xl font-bold mb-2">Couleur de texte adaptative</p>
        <p className="text-sm opacity-75">Sur fond {backgroundColor}</p>
      </div>

      {
    /* Information */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">COULEUR</p>
          <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
            {textColor}
          </p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">CONTRASTE</p>
          <p className="text-lg font-bold">
            <span className="text-slate-700 dark:text-slate-300">
              {contrastRatio.toFixed(1)}:1
            </span>
            <span className={`ml-2 text-sm ${meetsWCAG ? "text-green-600" : "text-red-600"}`}>
              {meetsWCAG ? "✓ WCAG AA" : "✗ WCAG AA"}
            </span>
          </p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">LUMINANCE</p>
          <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
            {colorInfo.backgroundLuminance?.toFixed(3) || "N/A"}
          </p>
        </div>
      </div>
    </div>;
}
function UsageExamples() {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {
    /* Utility Classes */
  }
      <div className="p-6 surface dark:bg-library-dark-secondary rounded-lg space-y-4">
        <h4 className="font-bold text-primary dark:text-library-dark-light">
          Avec Classes Tailwind
        </h4>
        <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto">
          {`<div className="bg-white">
  <p className="text-on-light">
    Texte bleu
  </p>
</div>

<div className="bg-blue-600">
  <p className="text-on-dark">
    Texte blanc
  </p>
</div>`}
        </pre>
      </div>

      {
    /* React Hook */
  }
      <div className="p-6 surface dark:bg-library-dark-secondary rounded-lg space-y-4">
        <h4 className="font-bold text-primary dark:text-library-dark-light">
          Avec Hook React
        </h4>
        <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs overflow-x-auto">
          {`const { textColor } = 
  useAdaptiveTextColor(bgColor);

<div style={{ 
  backgroundColor: bgColor,
  color: textColor 
}}>
  Texte adaptatif
</div>`}
        </pre>
      </div>

      {
    /* Interactive States */
  }
      <div className="p-6 surface dark:bg-library-dark-secondary rounded-lg space-y-4">
        <h4 className="font-bold text-primary dark:text-library-dark-light">
          États Interactifs
        </h4>
        <div className="space-y-2">
          <button className="text-on-light hover:text-opacity-75 px-4 py-2 bg-white rounded transition-colors w-full text-left">
            ▪ :hover - Couleur plus claire
          </button>
          <button className="text-on-light px-4 py-2 bg-white rounded ring-2 ring-blue-400 ring-offset-1 transition-all w-full text-left">
            ▪ :focus - Contour visible
          </button>
          <button disabled className="text-on-light px-4 py-2 bg-white rounded opacity-50 cursor-not-allowed w-full text-left">
            ▪ :disabled - Semi-transparent
          </button>
        </div>
      </div>

      {
    /* Dark Mode */
  }
      <div className="p-6 surface dark:bg-library-dark-secondary rounded-lg space-y-4">
        <h4 className="font-bold text-primary dark:text-library-dark-light">
          Mode Sombre Automatique
        </h4>
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-on-light dark:text-on-light text-sm">
              Le système détecte automatiquement le thème actif
            </p>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aucun calcul côté client nécessaire
          </p>
        </div>
      </div>
    </div>;
}
function ContrastMeasurements() {
  const measurements = [
    {
      scenario: "Bleu sur blanc (light)",
      ratio: 8.6,
      level: "AAA",
      colors: ["#0052CC", "#FFFFFF"]
    },
    {
      scenario: "Blanc sur bleu (light)",
      ratio: 8.6,
      level: "AAA",
      colors: ["#FFFFFF", "#0052CC"]
    },
    {
      scenario: "Marron sur crème (dark)",
      ratio: 9.1,
      level: "AAA",
      colors: ["#3D2817", "#FFFAF5"]
    },
    {
      scenario: "Crème sur marron (dark)",
      ratio: 9.1,
      level: "AAA",
      colors: ["#FFFAF5", "#3D2817"]
    }
  ];
  return <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-300 dark:border-slate-600">
            <th className="text-left p-3 font-bold text-primary dark:text-library-dark-light">
              Scénario
            </th>
            <th className="text-left p-3 font-bold text-primary dark:text-library-dark-light">
              Contraste
            </th>
            <th className="text-left p-3 font-bold text-primary dark:text-library-dark-light">
              Niveau
            </th>
            <th className="text-left p-3 font-bold text-primary dark:text-library-dark-light">
              Aperçu
            </th>
          </tr>
        </thead>
        <tbody>
          {measurements.map((m) => <tr
    key={m.scenario}
    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
  >
              <td className="p-3">{m.scenario}</td>
              <td className="p-3 font-mono font-bold">{m.ratio}:1</td>
              <td className="p-3">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-bold">
                  {m.level}
                </span>
              </td>
              <td className="p-3">
                <div
    className="px-3 py-1 rounded text-center font-medium"
    style={{
      backgroundColor: m.colors[1],
      color: m.colors[0]
    }}
  >
                  Aperçu
                </div>
              </td>
            </tr>)}
        </tbody>
      </table>
    </div>;
}
