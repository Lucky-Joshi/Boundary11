import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as service from './categories.service.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.json({ items: await service.listCategories() });
}));

export function collectionsRouter() {
  const collections = Router();
  collections.get('/', asyncHandler(async (_req, res) => {
    res.json({ items: await service.listCollections() });
  }));
  collections.get('/:slug', asyncHandler(async (req, res) => {
    res.json(await service.getCollection(req.params.slug));
  }));
  return collections;
}

export default router;
