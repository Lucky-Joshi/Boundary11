import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { sensitiveLimiter } from '../../middleware/rateLimit.js';
import { loginSchema, registerSchema } from '@boundary11/shared';
import * as service from './auth.service.js';

const router = Router();

router.post(
  '/login',
  sensitiveLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    res.json(await service.login(req.body));
  }),
);

router.post(
  '/register',
  sensitiveLimiter,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.register(req.body));
  }),
);

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.logout(req));
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.me(req));
}));

export default router;