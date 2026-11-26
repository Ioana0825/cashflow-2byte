/*
 * Decorative flowing gold lines, like the "silk" curves in our mockups.
 *
 * It's one SVG with a bundle of thin curves. Each curve is the same Bezier
 * path shifted a little, which creates the ribbon effect. The lines fade in
 * and out thanks to a gradient on the stroke.
 *
 * Purely decorative: aria-hidden hides it from screen readers, and
 * pointer-events: none (in CSS) lets clicks pass through it.
 */

import { useId } from 'react'

// How many lines make up the ribbon
const STRANDS = 14

export default function GoldLines({ className = '', flip = false }) {
  // Every copy needs its own gradient id. If two SVGs shared one id and the
  // first was hidden (display: none, like the sidebar on phones), the
  // second one would lose its gradient. useId() gives a unique id.
  const gradientId = `gold-fade-${useId().replace(/:/g, '')}`
  // Array.from({length: 14}, (_, i) => i) gives [0, 1, 2, ... 13]
  const strands = Array.from({ length: STRANDS }, (_, i) => i)

  return (
    <svg
      className={className}
      viewBox="0 0 600 400"
      preserveAspectRatio="none"
      aria-hidden="true"
      // scale(-1, 1) mirrors the drawing horizontally
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d4ae6a" stopOpacity="0" />
          <stop offset="0.45" stopColor="#f0d7a2" stopOpacity="0.9" />
          <stop offset="1" stopColor="#d4ae6a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {strands.map((i) => (
        <path
          key={i}
          // Each strand starts and ends a bit lower and bends a bit more
          d={`M -20 ${330 - i * 4} C 160 ${360 - i * 9}, 260 ${120 + i * 6}, 620 ${40 + i * 7}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={i === 0 ? 1.4 : 0.6}
          opacity={1 - i / STRANDS}
        />
      ))}
    </svg>
  )
}
