import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { cartItemInputSchema, cartItemUpdateSchema } from '@boundary11/shared';
import * as service from './cart.service.js';

const router = Router();

router.get('/', asyncHandler((req, res) => {
  res.json(service.getCart(req));
}));

router.post(
  '/items',
  validate({ body: cartItemInputSchema }),
  asyncHandler((req, res) => {
    res.status(201).json(service.addItem(req));
  }),
);

router.patch(
  '/items/:itemId',
  validate({ body: cartItemUpdateSchema }),
  asyncHandler((req, res) => {
    res.json(service.updateItem(req));
  }),
);

router.delete('/items/:itemId', asyncHandler((req, res) => {
  res.json(service.removeItem(req));
}));

router.delete('/', asyncHandler((req, res) => {
  res.json(service.clearCart(req));
}));

export default router;
