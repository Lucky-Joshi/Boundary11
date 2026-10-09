import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireRole } from '../../middleware/auth.js';
import {
  productInputSchema,
  couponInputSchema,
  inventoryAdjustmentSchema,
  orderStatusUpdateSchema,
  catalogQuerySchema,
  PRODUCT_STATUS,
} from '@boundary11/shared';
import { getProvider } from '../../providers/index.js';
import * as products from '../products/products.service.js';
import * as inventory from '../inventory/inventory.service.js';
import { listOrders, getOrder } from '../orders/orders.service.js';
import { serializeProduct } from '../products/products.service.js';

const router = Router();

// Every admin route requires a staff role. Writes are admin-only where noted.
router.use(requireRole('admin', 'support'));
const adminOnly = requireRole('admin');

const statusSchema = z.object({ status: z.enum(Object.values(PRODUCT_STATUS)) });
const listQuerySchema = catalogQuerySchema.extend({ includeArchived: z.coerce.boolean().optional() });
const ordersQuerySchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().max(80).optional(),
});

// ----- Analytics ----------------------------------------------------------
router.get('/analytics', asyncHandler((_req, res) => {
  res.json(getProvider().getAnalytics());
}));

// ----- Products -----------------------------------------------------------
router.get(
  '/products',
  validate({ query: listQuerySchema }),
  asyncHandler((req, res) => {
    res.json(
      products.listProducts(req.query, {
        includeUnpublished: true,
      }),
    );
  }),
);

router.get('/products/:id', asyncHandler((req, res) => {
  const product = getProvider().getProductById(req.params.id);
  if (!product) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Product not found.' } });
    return;
  }
  res.json(serializeProduct(product, new Map()));
}));

router.post(
  '/products',
  adminOnly,
  validate({ body: productInputSchema }),
  asyncHandler((req, res) => {
    res.status(201).json(products.createProduct(req.body, req.user.email));
  }),
);

router.patch(
  '/products/:id',
  adminOnly,
  validate({ body: productInputSchema.partial() }),
  asyncHandler((req, res) => {
    res.json(products.updateProduct(req.params.id, req.body, req.user.email));
  }),
);

router.patch(
  '/products/:id/status',
  adminOnly,
  validate({ body: statusSchema }),
  asyncHandler((req, res) => {
    res.json(products.setProductStatus(req.params.id, req.body.status, req.user.email));
  }),
);

router.delete('/products/:id', adminOnly, asyncHandler((req, res) => {
  res.json(products.archiveProduct(req.params.id, req.user.email));
}));

// ----- Orders -------------------------------------------------------------
router.get(
  '/orders',
  validate({ query: ordersQuerySchema }),
  asyncHandler((req, res) => {
    res.json(listOrders({ ...req, user: req.user, query: req.query }));
  }),
);

router.get('/orders/:id', asyncHandler((req, res) => {
  res.json(getOrder(req));
}));

router.patch(
  '/orders/:id/status',
  validate({ body: orderStatusUpdateSchema }),
  asyncHandler((req, res) => {
    const updated = getProvider().updateOrderStatus(
      req.params.id,
      req.body.status,
      req.body.note,
      req.user.email,
    );
    res.json(updated);
  }),
);

// ----- Inventory ----------------------------------------------------------
router.get('/inventory', asyncHandler((req, res) => {
  res.json(inventory.listInventory(req.query));
}));

router.get('/inventory/movements', asyncHandler((req, res) => {
  res.json(inventory.listMovements({ variantId: req.query.variantId }));
}));

router.post(
  '/inventory/adjustments',
  adminOnly,
  validate({ body: inventoryAdjustmentSchema }),
  asyncHandler((req, res) => {
    res.status(201).json(inventory.adjustInventory(req.body, req.user.email));
  }),
);

// ----- Customers ----------------------------------------------------------
router.get('/customers', asyncHandler((_req, res) => {
  res.json({ items: getProvider().listCustomers() });
}));

// ----- Discounts ----------------------------------------------------------
router.get('/discounts', asyncHandler((_req, res) => {
  res.json({ items: getProvider().listCoupons() });
}));

router.post(
  '/discounts',
  adminOnly,
  validate({ body: couponInputSchema }),
  asyncHandler((req, res) => {
    res.status(201).json(getProvider().createCoupon(req.body, req.user.email));
  }),
);

// ----- Content (banners) --------------------------------------------------
router.get('/content/banners', asyncHandler((_req, res) => {
  res.json({ items: getProvider().listBanners({ includeInactive: true }) });
}));

// ----- Settings -----------------------------------------------------------
router.get('/settings', asyncHandler((_req, res) => {
  res.json(getProvider().getSettings());
}));

// ----- Audit log ----------------------------------------------------------
router.get('/audit-logs', adminOnly, asyncHandler((_req, res) => {
  res.json({ items: getProvider().listAuditLogs() });
}));

// ----- Staff --------------------------------------------------------------
router.get('/staff', adminOnly, asyncHandler((_req, res) => {
  res.json({ items: getProvider().listCustomers().filter((c) => c.role && c.role !== 'customer') });
}));

export default router;
