import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { listProducts } from '../products/products.service.js';

export function listCategories() {
  const provider = getProvider();
  const products = provider.listProducts();
  return provider.listCategories().map((category) => ({
    ...category,
    productCount: products.filter((p) => p.categorySlug === category.slug).length,
  }));
}

export function listCollections() {
  const provider = getProvider();
  const products = provider.listProducts();
  return provider.listCollections().map((collection) => ({
    ...collection,
    productCount: products.filter((p) => (p.collections || []).includes(collection.slug)).length,
  }));
}

export function getCollection(slug) {
  const provider = getProvider();
  const collection = provider.getCollection(slug);
  if (!collection) throw ApiError.notFound('Collection not found.');
  const { items, total } = listProducts({ collection: slug, pageSize: 48 });
  return { ...collection, products: items, productCount: total };
}
