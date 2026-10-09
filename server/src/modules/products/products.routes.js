import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { catalogQuerySchema, reviewInputSchema } from '@boundary11/shared';
import * as service from './products.service.js';
import * as reviews from '../reviews/reviews.service.js';

const router = Router();

router.get(
  '/',
  validate({ query: catalogQuerySchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.listProducts(req.query));
  }),
);

router.get(
  '/:slug/related',
  asyncHandler(async (req, res) => {
    res.json({ items: await service.getRelatedProducts(req.params.slug) });
  }),
);

router.get(
  '/:slug/reviews',
  asyncHandler(async (req, res) => {
    res.json(await reviews.listProductReviews(req.params.slug));
  }),
);

router.post(
  '/:slug/reviews',
  requireAuth,
  validate({ body: reviewInputSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await reviews.createProductReview(req.params.slug, req.body, req.user));
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    res.json(await service.getProductBySlug(req.params.slug));
  }),
);

export default router;
