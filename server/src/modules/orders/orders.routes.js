import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { sensitiveLimiter } from '../../middleware/rateLimit.js';
import { checkoutSchema } from '@boundary11/shared';
import * as orders from './orders.service.js';
import { createCheckout, verifyPayment } from './checkout.service.js';

const verifySchema = z.object({
  orderId: z.string().trim().min(1),
  outcome: z.enum(['success', 'failure']).default('success'),
});

const router = Router();

router.post(
  '/checkout',
  sensitiveLimiter,
  validate({ body: checkoutSchema }),
  asyncHandler((req, res) => {
    res.status(201).json(createCheckout(req));
  }),
);

router.post(
  '/payments/verify',
  sensitiveLimiter,
  validate({ body: verifySchema }),
  asyncHandler((req, res) => {
    res.json(verifyPayment(req));
  }),
);

router.get('/orders', requireAuth, asyncHandler((req, res) => {
  res.json(orders.listOrders(req));
}));

router.get('/orders/:id', requireAuth, asyncHandler((req, res) => {
  res.json(orders.getOrder(req));
}));

export default router;
