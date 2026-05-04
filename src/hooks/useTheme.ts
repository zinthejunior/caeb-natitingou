import { useEffect, useState } from 'react'

/**
 * Hook pour détecter le thème actuel (mode clair ou sombre).
 * Surveille les changements de la classe `dark` sur l'élément racine du document.
 *
 * @returns { isDark: boolean, theme: 'light' | 'dark', mounted: boolean }
 */
export function useTheme() {
  // true = mode sombre actif, false = mode clair
  const [estSombre, setEstSombre] = useState(false)
  // Passe à true une fois le composant monté (pour éviter les erreurs côté serveur)
  const [estMonte, setEstMonte] = useState(false)

  useEffect(() => {
    // Vérifie l'état initial : est-ce que la classe "dark" est déjà présente ?
    const modeSombreInitial = document.documentElement.classList.contains('dark')
    setEstSombre(modeSombreInitial)
    setEstMonte(true)

    // Observateur qui surveille les changements d'attributs sur <html>
    const observateur = new MutationObserver((changements) => {
      changements.forEach((changement) => {
        if (changement.attributeName === 'class') {
          // Relit la classe après chaque changement pour mettre l'état à jour
          const modeSombreActuel = document.documentElement.classList.contains('dark')
          setEstSombre(modeSombreActuel)
        }
      })
    })

    // On observe uniquement l'attribut "class" de <html>
    observateur.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Nettoyage : arrêt de l'observateur quand le composant est démonté
    return () => observateur.disconnect()
  }, [])

  return {
    isDark: estSombre,                        // true si le mode sombre est activé
    theme: estSombre ? 'dark' : 'light',      // chaîne de caractères du thème
    mounted: estMonte,                        // true une fois l'initialisation terminée
  }
}

/**
 * Hook pour lire la valeur d'une variable CSS selon le thème actuel.
 * Retourne la valeur calculée de la variable CSS demandée.
 *
 * @param nomVariable - Nom de la variable CSS (ex : '--library-primary')
 * @returns La valeur calculée de la variable CSS sous forme de chaîne
 */
export function useThemedVariable(nomVariable: string): string {
  const [valeur, setValeur] = useState('')
  const { mounted: estMonte } = useTheme()

  useEffect(() => {
    // On attend que le composant soit monté avant de lire les styles calculés
    if (!estMonte) return

    const valeurCalculee = getComputedStyle(document.documentElement)
      .getPropertyValue(nomVariable)
      .trim()

    setValeur(valeurCalculee)
  }, [nomVariable, estMonte])

  return valeur
}
