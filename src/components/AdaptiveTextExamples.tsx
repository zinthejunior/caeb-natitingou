/**
 * Example: Adaptive Text Color Components
 * 
 * These components demonstrate how to use the dynamic text color adaptation system
 * to ensure optimal readability across all backgrounds and themes.
 */

import { getOptimalTextColor, getContrastRatio, meetsWCAGAA } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'

/**
 * Example 1: Card with Adaptive Text
 * 
 * This card automatically selects the best text color based on its background
 * and the current theme, ensuring WCAG AA compliance.
 */
export function AdaptiveCard({
  bgColor = '#FFFFFF',
  title,
  subtitle,
  content,
}: {
  bgColor?: string
  title: string
  subtitle?: string
  content: string
}) {
  const { isDark } = useTheme()
  
  const titleColor = getOptimalTextColor(bgColor, isDark)
  // Slightly lighter for subtitle
  const subtitleColor = getOptimalTextColor(bgColor, isDark)
  
  // Verify WCAG compliance
  const contrast = getContrastRatio(bgColor, titleColor)
  const meetsWCAG = meetsWCAGAA(bgColor, titleColor)

  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: '1.5rem',
        borderRadius: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h3
        style={{
          color: titleColor,
          fontSize: '1.25rem',
          fontWeight: 700,
          margin: 0,
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h3>

      {subtitle && (
        <p
          style={{
            color: subtitleColor,
            fontSize: '0.875rem',
            opacity: 0.8,
            margin: 0,
            marginBottom: '1rem',
          }}
        >
          {subtitle}
        </p>
      )}

      <p
        style={{
          color: titleColor,
          fontSize: '0.95rem',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {content}
      </p>

      {/* Accessibility indicator (remove in production) */}
      <small
        style={{
          display: 'block',
          marginTop: '0.75rem',
          color: subtitleColor,
          fontSize: '0.75rem',
          opacity: 0.6,
        }}
      >
        Contrast: {contrast.toFixed(2)}:1 {meetsWCAG ? '✓ WCAG AA' : '✗ Below WCAG'}
      </small>
    </div>
  )
}

/**
 * Example 2: Adaptive Button
 * 
 * A button that intelligently chooses text color based on background
 */
export function AdaptiveButton({
  bgColor = '#0052CC',
  label,
  onClick,
}: {
  bgColor?: string
  label: string
  onClick?: () => void
}) {
  const { isDark } = useTheme()
  const textColor = getOptimalTextColor(bgColor, isDark, true)

  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: 600,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        ;(e.target as HTMLButtonElement).style.opacity = '0.9'
      }}
      onMouseLeave={(e) => {
        ;(e.target as HTMLButtonElement).style.opacity = '1'
      }}
    >
      {label}
    </button>
  )
}

/**
 * Example 3: Multi-Surface Adaptive Component
 * 
 * A component that handles multiple background colors and adapts accordingly
 */
export function AdaptiveSurface({
  surfaces = [
    { bgColor: '#FFFFFF', label: 'White' },
    { bgColor: '#F0F4F9', label: 'Light Blue' },
    { bgColor: '#0052CC', label: 'Primary Blue' },
  ],
}: {
  surfaces?: Array<{ bgColor: string; label: string }>
}) {
  const { isDark } = useTheme()

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {surfaces.map(({ bgColor, label }) => {
        const textColor = getOptimalTextColor(bgColor, isDark)
        const contrast = getContrastRatio(bgColor, textColor)

        return (
          <div
            key={bgColor}
            style={{
              backgroundColor: bgColor,
              padding: '1rem',
              borderRadius: '0.5rem',
              color: textColor,
            }}
          >
            <strong>{label}</strong>
            <div style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '0.5rem' }}>
              Text: {textColor} | Contrast: {contrast.toFixed(2)}:1
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Example 4: Accessibility-Focused Text Component
 * 
 * A text component that declares its background and automatically adjusts
 */
export function AccessibleText({
  bgColor,
  size = 'normal',
  children,
}: {
  bgColor: string
  size?: 'small' | 'normal' | 'large'
  children: React.ReactNode
}) {
  const { isDark } = useTheme()
  const textColor = getOptimalTextColor(bgColor, isDark)
  const contrast = getContrastRatio(bgColor, textColor)

  const sizeMap = {
    small: '0.875rem', // Needs 4.5:1 (normal text)
    normal: '0.95rem', // Needs 4.5:1 (normal text)
    large: '1.25rem', // Needs 3:1 (large text)
  }

  const meetsLargeText = size === 'large' ? contrast >= 3 : contrast >= 4.5

  return (
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontSize: sizeMap[size],
        padding: '1rem',
        borderRadius: '0.5rem',
        borderLeft: meetsLargeText ? '4px solid #22c55e' : '4px solid #ef4444',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Example 5: Color Contrast Checker Component
 * 
 * Educational component showing how contrast is calculated
 */
export function ContrastChecker({
  bgColor = '#FFFFFF',
}: {
  bgColor?: string
}) {
  const { isDark } = useTheme()
  const optimalColor = getOptimalTextColor(bgColor, isDark)
  const ratio = getContrastRatio(bgColor, optimalColor)
  const passes = meetsWCAGAA(bgColor, optimalColor)

  return (
    <div
      style={{
        backgroundColor: bgColor,
        padding: '1.5rem',
        borderRadius: '0.75rem',
        color: optimalColor,
        border: passes ? '2px solid #22c55e' : '2px solid #ef4444',
      }}
    >
      <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>
        Contrast Ratio: {ratio.toFixed(2)}:1
      </h4>
      <p style={{ margin: 0, marginBottom: '0.5rem', opacity: 0.8 }}>
        Background: {bgColor}
      </p>
      <p style={{ margin: 0, marginBottom: '0.5rem', opacity: 0.8 }}>
        Text Color: {optimalColor}
      </p>
      <p style={{ margin: 0, fontWeight: 700 }}>
        {passes ? '✓ Passes WCAG AA' : '✗ Below WCAG AA'}
      </p>
    </div>
  )
}
