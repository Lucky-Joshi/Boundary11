import { SIZES } from '@boundary11/shared';
import { COLOR_OPTIONS } from '../../data/filters.js';

/**
 * Presentational catalog filter panel. All state is owned by the parent
 * (driven by the URL), so filters are shareable and bookmarkable.
 */
export function Filters({ categories = [], value, onToggleCategory, onToggleSize, onToggleColor, onPrice, onToggleStock, onClear }) {
  return (
    <div className="filters card card-pad">
      <div className="row-between" style={{ marginBottom: 4 }}>
        <h3 className="h3">Filters</h3>
        <button type="button" className="link-btn" onClick={onClear}>
          Clear all
        </button>
      </div>

      <div className="filter-group">
        <h4>Category</h4>
        {categories.map((category) => (
          <label key={category.slug} className="check">
            <input
              type="checkbox"
              checked={value.categories.includes(category.slug)}
              onChange={() => onToggleCategory(category.slug)}
            />
            <span>
              {category.name} <span className="muted">({category.productCount})</span>
            </span>
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h4>Size</h4>
        <div className="size-options">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`size-chip ${value.sizes.includes(size) ? 'active' : ''}`}
              aria-pressed={value.sizes.includes(size)}
              onClick={() => onToggleSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <h4>Colour</h4>
        {COLOR_OPTIONS.map((color) => (
          <label key={color.name} className="check">
            <input
              type="checkbox"
              checked={value.colors.includes(color.name)}
              onChange={() => onToggleColor(color.name)}
            />
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                background: color.hex,
                border: '1px solid var(--border-strong)',
              }}
              aria-hidden="true"
            />
            <span>{color.name}</span>
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h4>Price (₹)</h4>
        <div className="row" style={{ gap: 8 }}>
          <label className="sr-only" htmlFor="min-price">
            Minimum price
          </label>
          <input
            id="min-price"
            className="input"
            type="number"
            min="0"
            placeholder="Min"
            value={value.minPrice ?? ''}
            onChange={(event) => onPrice(event.target.value, value.maxPrice)}
          />
          <label className="sr-only" htmlFor="max-price">
            Maximum price
          </label>
          <input
            id="max-price"
            className="input"
            type="number"
            min="0"
            placeholder="Max"
            value={value.maxPrice ?? ''}
            onChange={(event) => onPrice(value.minPrice, event.target.value)}
          />
        </div>
      </div>

      <div className="filter-group" style={{ borderBottom: 'none' }}>
        <label className="check">
          <input type="checkbox" checked={value.inStock} onChange={onToggleStock} />
          <span>In stock only</span>
        </label>
      </div>
    </div>
  );
}
