import { Link } from 'react-router-dom';
import { Money } from '../ui/Money.jsx';
import { HeartIcon } from '../ui/Icons.jsx';
import { ProductArtwork } from './ProductArtwork.jsx';
import { StarRating } from './StarRating.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';

export function ProductCard({ product }) {
  const wishlist = useWishlist();
  const saved = wishlist.has(product.slug);

  return (
    <article className="product-card">
      <div className="product-media">
        <div className="badges">
          {product.discountPercent > 0 ? (
            <span className="badge badge-saffron">-{product.discountPercent}%</span>
          ) : null}
          {product.featured ? <span className="badge badge-navy">Featured</span> : null}
          {!product.inStock ? <span className="badge badge-red">Sold out</span> : null}
        </div>
        <button
          type="button"
          className={`wish ${saved ? 'active' : ''}`}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={saved}
          onClick={() => wishlist.toggle(product)}
        >
          <HeartIcon size={18} />
        </button>
        <Link to={`/products/${product.slug}`} aria-label={product.name}>
          <ProductArtwork product={product} />
        </Link>
      </div>
      <div className="product-body">
        <span className="product-cat">{product.categoryName}</span>
        <Link to={`/products/${product.slug}`} className="product-title">
          {product.name}
        </Link>
        <StarRating value={product.rating} count={product.reviewCount} compact />
        <div className="product-price">
          <span className="now">
            <Money paise={product.minPricePaise} withDecimals={false} />
          </span>
          {product.minCompareAtPaise ? (
            <>
              <span className="was">
                <Money paise={product.minCompareAtPaise} withDecimals={false} />
              </span>
              <span className="off">{product.discountPercent}% off</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
