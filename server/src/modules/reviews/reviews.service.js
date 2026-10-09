import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';

/** Build the rating summary shown above a product's review list. */
export function summarizeReviews(reviews) {
  const count = reviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (!count) return { average: 0, count: 0, distribution };
  let sum = 0;
  for (const review of reviews) {
    sum += review.rating;
    distribution[review.rating] = (distribution[review.rating] || 0) + 1;
  }
  return { average: Math.round((sum / count) * 10) / 10, count, distribution };
}

export async function listProductReviews(slug) {
  const provider = getProvider();
  const product = await provider.getProductBySlug(slug);
  if (!product) throw ApiError.notFound('Product not found.');
  const reviews = await provider.listReviews({ productId: product.id, status: 'published' });
  return {
    productId: product.id,
    rating: product.rating,
    reviewCount: product.reviewCount,
    summary: summarizeReviews(reviews),
    items: reviews,
  };
}

export async function createProductReview(slug, input, user) {
  const provider = getProvider();
  const product = await provider.getProductBySlug(slug);
  if (!product) throw ApiError.notFound('Product not found.');
  return provider.createReview({
    productId: product.id,
    userId: user?.id || null,
    authorName: user?.name || user?.email || 'Boundary11 fan',
    rating: input.rating,
    title: input.title,
    body: input.body,
  });
}

export async function listAllReviews({ status } = {}) {
  return getProvider().listReviews({ status });
}

export async function setReviewStatus(id, status, actor) {
  const updated = await getProvider().setReviewStatus(id, status, actor);
  if (!updated) throw ApiError.notFound('Review not found.');
  return updated;
}
