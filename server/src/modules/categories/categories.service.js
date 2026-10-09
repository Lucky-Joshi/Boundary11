import { getProvider } from '../../providers/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { listProducts } from '../products/products.service.js';

export async function listCategories() {
  const provider = getProvider();
  const [products, categories] = await Promise.all([provider.listProducts(), provider.listCategories()]);
  return categories.map((category) => ({
    ...category,
    productCount: products.filter((p) => p.categorySlug === category.slug).length,
  }));
}

export async function listCollections() {
  const provider = getProvider();
  const [products, collections] = await Promise.all([provider.listProducts(), provider.listCollections()]);
  return collections.map((collection) => ({
    ...collection,
    productCount: products.filter((p) => (p.collections || []).includes(collection.slug)).length,
  }));
}

export async function getCollection(slug) {
  const provider = getProvider();
  const collection = await provider.getCollection(slug);
  if (!collection) throw ApiError.notFound('Collection not found.');
  const { items, total } = await listProducts({ collection: slug, pageSize: 48 });
  return { ...collection, products: items, productCount: total };
}
