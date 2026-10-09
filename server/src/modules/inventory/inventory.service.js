import { getProvider } from '../../providers/index.js';

export function listInventory({ lowOnly } = {}) {
  const rows = getProvider().listInventory({ lowOnly: lowOnly === true || lowOnly === 'true' });
  return {
    items: rows,
    summary: {
      totalVariants: rows.length,
      lowStock: rows.filter((r) => r.lowStock).length,
      outOfStock: rows.filter((r) => r.outOfStock).length,
      totalUnits: rows.reduce((sum, r) => sum + r.stock, 0),
    },
  };
}

export function listMovements({ variantId } = {}) {
  return { items: getProvider().listMovements({ variantId }) };
}

export function adjustInventory(input, actor) {
  return getProvider().adjustInventory(input, actor);
}
