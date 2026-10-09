import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { catalogQuerySchema } from '@boundary11/shared';
import * as service from './products.service.js';

const router = Router();

router.get(
  '/',
  validate({ query: catalogQuerySchema }),
  asyncHandler((req, res) => {
    res.json(service.listProducts(req.query));
  }),
);

router.get(
  '/:slug/related',
  asyncHandler((req, res) => {
    res.json({ items: service.getRelatedProducts(req.params.slug) });
  }),
);

router.get(
  '/:slug',
  asyncHandler((req, res) => {
    res.json(service.getProductBySlug(req.params.slug));
  }),
);

export default router;
