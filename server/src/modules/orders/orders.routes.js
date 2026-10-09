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
  asyncHandler(async (req, res) => {
    res.status(201).json(await createCheckout(req));
  }),
);

router.post(
  '/payments/verify',
  sensitiveLimiter,
  validate({ body: verifySchema }),
  asyncHandler(async (req, res) => {
    res.json(await verifyPayment(req));
  }),
);

router.get('/orders', requireAuth, asyncHandler(async (req, res) => {
  res.json(await orders.listOrders(req));
}));

router.get('/orders/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await orders.getOrder(req));
}));

router.post('/orders/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  res.json(await orders.cancelOrder(req));
}));

export default router;
