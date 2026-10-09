import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { cartItemInputSchema, cartItemUpdateSchema } from '@boundary11/shared';
import * as service from './cart.service.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await service.getCart(req));
}));

router.post(
  '/items',
  validate({ body: cartItemInputSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.addItem(req));
  }),
);

router.patch(
  '/items/:itemId',
  validate({ body: cartItemUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.updateItem(req));
  }),
);

router.delete('/items/:itemId', asyncHandler(async (req, res) => {
  res.json(await service.removeItem(req));
}));

router.delete('/', asyncHandler(async (req, res) => {
  res.json(await service.clearCart(req));
}));

export default router;
