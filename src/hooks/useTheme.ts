import { useEffect, useState } from 'react'

/**
 * Hook to detect current theme (light or dark mode)
 * Watches for changes to the `dark` class on the document element
 * 
 * @returns { isDark: boolean, theme: 'light' | 'dark' }
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check initial state
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
    setMounted(true)

    // Watch for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDarkNow = document.documentElement.classList.contains('dark')
          setIsDark(isDarkNow)
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    mounted,
  }
}

/**
 * Hook to get theme-aware styling
 * Returns CSS variable values based on current theme
 * 
 * @param varName - CSS variable name (e.g., '--library-primary')
 * @returns The computed value of the CSS variable
 */
export function useThemedVariable(varName: string): string {
  const [value, setValue] = useState('')
  const { mounted } = useTheme()

  useEffect(() => {
    if (!mounted) return

    const computedValue = getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim()

    setValue(computedValue)
  }, [varName, mounted])

  return value
}
