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
  reviewModerationSchema,
  contactMessageUpdateSchema,
  PRODUCT_STATUS,
} from '@boundary11/shared';
import { getProvider } from '../../providers/index.js';
import * as products from '../products/products.service.js';
import * as inventory from '../inventory/inventory.service.js';
import { listOrders, getOrder } from '../orders/orders.service.js';
import { serializeProduct } from '../products/products.service.js';
import { toCsv } from '../../utils/csv.js';

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
router.get('/analytics', asyncHandler(async (_req, res) => {
  res.json(await getProvider().getAnalytics());
}));

// ----- Products -----------------------------------------------------------
router.get(
  '/products',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(
      await products.listProducts(req.query, {
        includeUnpublished: true,
      }),
    );
  }),
);

router.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await getProvider().getProductById(req.params.id);
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
  asyncHandler(async (req, res) => {
    res.status(201).json(await products.createProduct(req.body, req.user.email));
  }),
);

router.patch(
  '/products/:id',
  adminOnly,
  validate({ body: productInputSchema.partial() }),
  asyncHandler(async (req, res) => {
    res.json(await products.updateProduct(req.params.id, req.body, req.user.email));
  }),
);

router.patch(
  '/products/:id/status',
  adminOnly,
  validate({ body: statusSchema }),
  asyncHandler(async (req, res) => {
    res.json(await products.setProductStatus(req.params.id, req.body.status, req.user.email));
  }),
);

router.delete('/products/:id', adminOnly, asyncHandler(async (req, res) => {
  res.json(await products.archiveProduct(req.params.id, req.user.email));
}));

// ----- Orders -------------------------------------------------------------
router.get(
  '/orders',
  validate({ query: ordersQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await listOrders({ ...req, user: req.user, query: req.query }));
  }),
);

router.get('/orders/:id', asyncHandler(async (req, res) => {
  res.json(await getOrder(req));
}));

router.patch(
  '/orders/:id/status',
  validate({ body: orderStatusUpdateSchema }),
  asyncHandler(async (req, res) => {
    const updated = await getProvider().updateOrderStatus(
      req.params.id,
      req.body.status,
      req.body.note,
      req.user.email,
    );
    res.json(updated);
  }),
);

// ----- Inventory ----------------------------------------------------------
router.get('/inventory', asyncHandler(async (req, res) => {
  res.json(await inventory.listInventory(req.query));
}));

router.get('/inventory/movements', asyncHandler(async (req, res) => {
  res.json(await inventory.listMovements({ variantId: req.query.variantId }));
}));

router.post(
  '/inventory/adjustments',
  adminOnly,
  validate({ body: inventoryAdjustmentSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await inventory.adjustInventory(req.body, req.user.email));
  }),
);

// ----- Customers ----------------------------------------------------------
router.get('/customers', asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listCustomers() });
}));

// ----- Discounts ----------------------------------------------------------
router.get('/discounts', asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listCoupons() });
}));

router.post(
  '/discounts',
  adminOnly,
  validate({ body: couponInputSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await getProvider().createCoupon(req.body, req.user.email));
  }),
);

// ----- Content (banners) --------------------------------------------------
router.get('/content/banners', asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listBanners({ includeInactive: true }) });
}));

// ----- Settings -----------------------------------------------------------
router.get('/settings', asyncHandler(async (_req, res) => {
  res.json(await getProvider().getSettings());
}));

// ----- Audit log ----------------------------------------------------------
router.get('/audit-logs', adminOnly, asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listAuditLogs() });
}));

// ----- Staff --------------------------------------------------------------
router.get('/staff', adminOnly, asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listStaff() });
}));

// ----- Reviews (moderation) -----------------------------------------------
router.get('/reviews', asyncHandler(async (req, res) => {
  res.json({ items: await getProvider().listReviews({ status: req.query.status || undefined }) });
}));

router.patch(
  '/reviews/:id',
  adminOnly,
  validate({ body: reviewModerationSchema }),
  asyncHandler(async (req, res) => {
    const updated = await getProvider().setReviewStatus(req.params.id, req.body.status, req.user.email);
    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review not found.' } });
      return;
    }
    res.json(updated);
  }),
);

// ----- Contact messages + newsletter --------------------------------------
router.get('/messages', asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listContactMessages() });
}));

router.patch(
  '/messages/:id',
  validate({ body: contactMessageUpdateSchema }),
  asyncHandler(async (req, res) => {
    const updated = await getProvider().setContactMessageStatus(req.params.id, req.body.status);
    if (!updated) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Message not found.' } });
      return;
    }
    res.json(updated);
  }),
);

router.get('/subscribers', asyncHandler(async (_req, res) => {
  res.json({ items: await getProvider().listNewsletterSubscribers() });
}));

// ----- CSV exports --------------------------------------------------------
function sendCsv(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get('/exports/:kind', asyncHandler(async (req, res) => {
  const provider = getProvider();
  const { kind } = req.params;

  if (kind === 'orders') {
    const orders = await provider.listOrders({});
    sendCsv(
      res,
      'boundary11-orders.csv',
      toCsv(orders, [
        { label: 'Order', value: 'orderNumber' },
        { label: 'Placed', value: (o) => o.createdAt },
        { label: 'Customer', value: 'customerName' },
        { label: 'Email', value: 'contactEmail' },
        { label: 'Status', value: 'status' },
        { label: 'Payment', value: 'paymentStatus' },
        { label: 'Items', value: (o) => o.items.reduce((sum, i) => sum + i.quantity, 0) },
        { label: 'Subtotal (paise)', value: 'subtotalPaise' },
        { label: 'Discount (paise)', value: 'discountPaise' },
        { label: 'Shipping (paise)', value: 'shippingPaise' },
        { label: 'Total (paise)', value: 'totalPaise' },
      ]),
    );
    return;
  }

  if (kind === 'customers') {
    const customers = await provider.listCustomers();
    sendCsv(
      res,
      'boundary11-customers.csv',
      toCsv(customers, [
        { label: 'Name', value: 'name' },
        { label: 'Email', value: 'email' },
        { label: 'Role', value: (c) => c.role || 'guest' },
        { label: 'Status', value: (c) => c.status || '' },
        { label: 'Orders', value: 'orderCount' },
        { label: 'Total spent (paise)', value: 'totalSpentPaise' },
        { label: 'Last order', value: (c) => c.lastOrderAt || '' },
        { label: 'Registered', value: (c) => c.createdAt || '' },
      ]),
    );
    return;
  }

  if (kind === 'inventory') {
    const { items: rows } = await inventory.listInventory({});
    sendCsv(
      res,
      'boundary11-inventory.csv',
      toCsv(rows, [
        { label: 'Product', value: 'productName' },
        { label: 'SKU', value: 'sku' },
        { label: 'Size', value: 'size' },
        { label: 'Color', value: 'color' },
        { label: 'Stock', value: 'stock' },
        { label: 'Low at', value: 'lowStockThreshold' },
        { label: 'Status', value: (r) => (r.outOfStock ? 'out of stock' : r.lowStock ? 'low stock' : 'in stock') },
      ]),
    );
    return;
  }

  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Unknown export.' } });
}));

export default router;
