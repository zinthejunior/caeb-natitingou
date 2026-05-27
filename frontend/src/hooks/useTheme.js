import { useEffect, useState } from "react";
export function useTheme() {
  const [estSombre, setEstSombre] = useState(false);
  const [estMonte, setEstMonte] = useState(false);
  useEffect(() => {
    const modeSombreInitial = document.documentElement.classList.contains("dark");
    setEstSombre(modeSombreInitial);
    setEstMonte(true);
    const observateur = new MutationObserver((changements) => {
      changements.forEach((changement) => {
        if (changement.attributeName === "class") {
          const modeSombreActuel = document.documentElement.classList.contains("dark");
          setEstSombre(modeSombreActuel);
        }
      });
    });
    observateur.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    return () => observateur.disconnect();
  }, []);
  return {
    isDark: estSombre,
    // true si le mode sombre est activé
    theme: estSombre ? "dark" : "light",
    // chaîne de caractères du thème
    mounted: estMonte
    // true une fois l'initialisation terminée
  };
}
export function useThemedVariable(nomVariable) {
  const [valeur, setValeur] = useState("");
  const { mounted: estMonte } = useTheme();
  useEffect(() => {
    if (!estMonte) return;
    const valeurCalculee = getComputedStyle(document.documentElement).getPropertyValue(nomVariable).trim();
    setValeur(valeurCalculee);
  }, [nomVariable, estMonte]);
  return valeur;
}
