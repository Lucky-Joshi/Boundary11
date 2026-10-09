import { ProductCard } from './ProductCard.jsx';

export function ProductGrid({ products = [], columns = 4 }) {
  return (
    <div className={`product-grid ${columns === 3 ? 'cols-3' : ''}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
