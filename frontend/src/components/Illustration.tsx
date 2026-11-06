// The app's logo: a market stall with an awning and a UPI-style check. Original SVG artwork.

/** Small mark for the sidebar and top bar: a shop front with a check. */
export function LogoMark({ size = 34, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="UPI Safety Check">
      <rect width="40" height="40" rx="11" fill={onDark ? '#fff' : 'var(--brand)'} />
      <path d="M8 16 L10.5 9.5 H29.5 L32 16 Z" fill={onDark ? 'var(--brand)' : '#fff'} />
      <path d="M8 16 q3 3.2 6 0 q3 3.2 6 0 q3 3.2 6 0 q3 3.2 6 0" fill={onDark ? 'var(--brand)' : '#fff'} opacity="0.85" />
      <rect x="10.5" y="19.5" width="19" height="11" rx="1.5" fill={onDark ? 'var(--brand)' : '#fff'} opacity="0.22" />
      <path d="M15.5 25.2 l3.2 3.2 l6-6.4" fill="none" stroke={onDark ? 'var(--brand)' : '#fff'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
