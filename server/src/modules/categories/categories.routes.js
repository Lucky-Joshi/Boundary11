import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as service from './categories.service.js';

const router = Router();

router.get('/', asyncHandler((_req, res) => {
  res.json({ items: service.listCategories() });
}));

export function collectionsRouter() {
  const collections = Router();
  collections.get('/', asyncHandler((_req, res) => {
    res.json({ items: service.listCollections() });
  }));
  collections.get('/:slug', asyncHandler((req, res) => {
    res.json(service.getCollection(req.params.slug));
  }));
  return collections;
}

export default router;
