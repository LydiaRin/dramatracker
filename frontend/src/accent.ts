import type { CSSProperties } from 'react'

// Every drama brings its own colour (computed from its poster by the backend).
// Pages set it as the --accent CSS variable, so buttons, glows and progress bars follow the drama on screen.
export const DEFAULT_ACCENT = '#E0262E'

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function accentStyle(accent: string | null | undefined): CSSProperties {
  const color = accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : DEFAULT_ACCENT
  // Text drawn on the accent (button labels) is black on light colours, white on dark ones
  const on = luminance(color) > 0.3 ? '#08080A' : '#F7F3EA'
  return { '--accent': color, '--on-accent': on } as CSSProperties
}

// Episode numbers written the way the posters do it: 第二十一集
const DIGITS = '零一二三四五六七八九'
export function zhNumber(n: number): string {
  if (n <= 0) return '零'
  if (n < 10) return DIGITS[n]
  if (n < 100) {
    const tens = Math.floor(n / 10)
    const ones = n % 10
    return (tens === 1 ? '' : DIGITS[tens]) + '十' + (ones ? DIGITS[ones] : '')
  }
  return String(n)
    .split('')
    .map((d) => DIGITS[Number(d)])
    .join('')
}
