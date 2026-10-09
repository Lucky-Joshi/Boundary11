import { Router } from 'express';
import { getProvider } from '../providers/index.js';
import productsRouter from '../modules/products/products.routes.js';
import categoriesRouter, { collectionsRouter } from '../modules/categories/categories.routes.js';
import cartRouter from '../modules/cart/cart.routes.js';
import ordersRouter from '../modules/orders/orders.routes.js';
import authRouter from '../modules/auth/auth.routes.js';
import adminRouter from '../modules/admin/admin.routes.js';
import miscRouter from '../modules/misc/misc.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    mode: getProvider().mode,
    time: new Date().toISOString(),
  });
});

router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/collections', collectionsRouter());
router.use('/cart', cartRouter);
router.use(ordersRouter);
router.use('/admin', adminRouter);
router.use(miscRouter);

export default router;
