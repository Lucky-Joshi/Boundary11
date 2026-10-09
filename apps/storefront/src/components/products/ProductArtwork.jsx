function darken(hex, amount = 30) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean, 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * A brand-safe, generated product visual. Used because the prototype ships no
 * licensed photography. It is decorative and carries no third-party marks.
 */
export function ProductArtwork({ product, label }) {
  const accent = product?.accent || '#1d2b53';
  return (
    <div
      className="artwork"
      style={{ background: `linear-gradient(150deg, ${accent} 0%, ${darken(accent, 34)} 100%)` }}
      role="img"
      aria-label={`${product?.name || 'Product'} illustration`}
    >
      <div className="weave" />
      <div className="stripe" />
      <div className="monogram">{initials(product?.name || 'B11')}</div>
      <div className="tag">{label || product?.categoryName || 'Boundary11'}</div>
    </div>
  );
}
