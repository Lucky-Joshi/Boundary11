import { MinusIcon, PlusIcon } from '../ui/Icons.jsx';

export function QuantityStepper({ value, onChange, min = 1, max = 10, disabled = false }) {
  return (
    <div className="qty" role="group" aria-label="Quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
      >
        <MinusIcon size={15} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
      >
        <PlusIcon size={15} />
      </button>
    </div>
  );
}
