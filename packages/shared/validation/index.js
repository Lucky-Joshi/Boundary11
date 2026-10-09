import { z } from 'zod';
import { ROLES, PRODUCT_STATUS, SIZES, INVENTORY_REASONS } from '../constants/index.js';

/** Reusable field primitives. */
const email = z.string().trim().toLowerCase().email('Enter a valid email address.');
const name = z.string().trim().min(2, 'Name must be at least 2 characters.').max(80);
const phone = z
  .string()
  .trim()
  .regex(/^[+]?[0-9\s-]{8,15}$/, 'Enter a valid phone number.');
const paise = z.number().int().nonnegative('Amount must be zero or more paise.');

export const addressSchema = z.object({
  fullName: name,
  phone,
  line1: z.string().trim().min(3, 'Address line 1 is required.').max(120),
  line2: z.string().trim().max(120).optional().default(''),
  city: z.string().trim().min(2, 'City is required.').max(60),
  state: z.string().trim().min(2, 'State is required.').max(60),
  postalCode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian PIN code.'),
  country: z.string().trim().default('India'),
});

export const checkoutSchema = z.object({
  contactEmail: email,
  contactPhone: phone,
  shippingAddress: addressSchema,
  paymentMethod: z.enum(['mock_upi', 'mock_card', 'cod']).default('mock_upi'),
  couponCode: z.string().trim().max(40).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
});

export const cartItemInputSchema = z.object({
  variantId: z.string().trim().min(1, 'A variant is required.'),
  quantity: z.number().int().min(1).max(10),
});

export const cartItemUpdateSchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export const registerSchema = z.object({
  fullName: name,
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Za-z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
});

export const variantInputSchema = z.object({
  id: z.string().trim().optional(),
  sku: z.string().trim().min(2, 'SKU is required.').max(40),
  size: z.enum(SIZES),
  color: z.string().trim().min(1, 'Color is required.').max(30),
  pricePaise: paise,
  compareAtPaise: paise.nullable().optional(),
  stock: z.number().int().nonnegative('Stock cannot be negative.'),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(3, 'Product name is required.').max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens.')
    .optional(),
  description: z.string().trim().min(20, 'Description should be at least 20 characters.'),
  categorySlug: z.string().trim().min(1, 'Choose a category.'),
  collections: z.array(z.string().trim()).optional().default([]),
  tags: z.array(z.string().trim()).optional().default([]),
  status: z.enum(Object.values(PRODUCT_STATUS)).default(PRODUCT_STATUS.DRAFT),
  featured: z.boolean().optional().default(false),
  images: z
    .array(z.object({ url: z.string().trim().min(1), alt: z.string().trim().optional().default('') }))
    .optional()
    .default([]),
  variants: z.array(variantInputSchema).min(1, 'Add at least one variant.'),
});

export const couponInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,20}$/, 'Coupon codes are 3-20 letters/numbers.'),
  type: z.enum(['percent', 'fixed']),
  value: z.number().int().positive('Value must be greater than zero.'),
  minSubtotalPaise: paise.optional().default(0),
  maxDiscountPaise: paise.nullable().optional(),
  active: z.boolean().optional().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
});

export const inventoryAdjustmentSchema = z.object({
  variantId: z.string().trim().min(1, 'A variant is required.'),
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0, 'Adjustment must be a non-zero amount.')
    .refine((v) => Math.abs(v) <= 10000, 'Adjustment is too large.'),
  reason: z.enum(INVENTORY_REASONS),
  note: z.string().trim().max(200).optional().default(''),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ]),
  note: z.string().trim().max(200).optional().default(''),
});

export const contactSchema = z.object({
  name,
  email,
  subject: z.string().trim().min(3, 'Subject is required.').max(120),
  message: z.string().trim().min(10, 'Message should be at least 10 characters.').max(1000),
});

export const newsletterSchema = z.object({
  email,
});

export const roleSchema = z.enum(Object.values(ROLES));

/** Sort/filter query schema for the catalog API. */
export const catalogQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().optional(),
  collection: z.string().trim().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'popularity']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

/** Convert a ZodError into a flat field->message map for API responses. */
export function formatZodError(error) {
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
