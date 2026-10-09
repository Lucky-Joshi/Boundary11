import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { contactSchema, newsletterSchema } from '@boundary11/shared';
import { getProvider } from '../../providers/index.js';

const router = Router();

// Active homepage banners, ordered for display in the storefront hero.
router.get(
  '/banners',
  asyncHandler(async (_req, res) => {
    res.json({ items: await getProvider().listBanners() });
  }),
);

// Contact messages are validated, persisted for staff, and acknowledged.
// Email delivery is not wired up in this prototype and we do not pretend it is.
router.post(
  '/contact',
  validate({ body: contactSchema }),
  asyncHandler(async (req, res) => {
    const saved = await getProvider().createContactMessage(req.body);
    res.status(201).json({
      received: true,
      id: saved.id,
      message: 'Thanks — your message has been received. Email delivery is not enabled in this prototype.',
    });
  }),
);

router.post(
  '/newsletter',
  validate({ body: newsletterSchema }),
  asyncHandler(async (req, res) => {
    const settings = await getProvider().getSettings();
    const { already } = await getProvider().subscribeNewsletter(req.body.email);
    res.status(already ? 200 : 201).json({
      subscribed: true,
      already,
      email: req.body.email,
      message: already
        ? `You're already subscribed to ${settings.storeName} updates.`
        : `Subscribed to ${settings.storeName} updates (prototype — no email is sent).`,
    });
  }),
);

export default router;
