import { getProvider } from '../../providers/index.js';

export async function listInventory({ lowOnly } = {}) {
  const rows = await getProvider().listInventory({ lowOnly: lowOnly === true || lowOnly === 'true' });
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

export async function listMovements({ variantId } = {}) {
  return { items: await getProvider().listMovements({ variantId }) };
}

export async function adjustInventory(input, actor) {
  return getProvider().adjustInventory(input, actor);
}
