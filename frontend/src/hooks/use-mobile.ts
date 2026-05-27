// Hook personnalisé pour détecter si l'appareil est en mode mobile
import * as React from "react"

// Point de rupture (breakpoint) pour déterminer si c'est un mobile (768px)
const MOBILE_BREAKPOINT = 768

/**
 * Hook pour déterminer si l'écran actuel est en mode mobile
 * Surveille les changements de taille d'écran en temps réel
 * @returns true si l'écran est mobile (< 768px), false sinon
 */
export function useIsMobile() {
  // État pour tracker si l'appareil est mobile
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Crée une requête média pour surveiller les changements de taille d'écran
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Callback qui se déclenche quand la taille de l'écran change
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Enregistre l'écouteur d'événement pour les changements de breakpoint
    mql.addEventListener("change", onChange)
    
    // Vérifie la taille initiale au montage
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Nettoie l'écouteur lors du démontage du composant
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Retourne true ou false (!! convertit undefined en false)
  return !!isMobile
}
