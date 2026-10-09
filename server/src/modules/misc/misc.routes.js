import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { contactSchema, newsletterSchema } from '@boundary11/shared';
import { getProvider } from '../../providers/index.js';

const router = Router();

// Contact messages are validated and acknowledged. Email delivery is wired up
// in a later milestone; nothing is sent yet and we do not pretend otherwise.
router.post(
  '/contact',
  validate({ body: contactSchema }),
  asyncHandler((req, res) => {
    res.status(202).json({
      received: true,
      message: 'Thanks — your message has been received. Email delivery is not enabled in this prototype.',
    });
  }),
);

router.post(
  '/newsletter',
  validate({ body: newsletterSchema }),
  asyncHandler((req, res) => {
    const settings = getProvider().getSettings();
    res.status(202).json({
      subscribed: true,
      email: req.body.email,
      message: `Subscribed to ${settings.storeName} updates (prototype — no email is sent).`,
    });
  }),
);

export default router;
