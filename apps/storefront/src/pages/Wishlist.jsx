import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext.jsx';
import { Money } from '../components/ui/Money.jsx';
import { ProductArtwork } from '../components/products/ProductArtwork.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { HeartIcon } from '../components/ui/Icons.jsx';

export function Wishlist() {
  const wishlist = useWishlist();

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Wishlist</span>
      </div>
      <h1 className="h1" style={{ marginBottom: 22 }}>
        Wishlist <span className="muted" style={{ fontWeight: 500 }}>({wishlist.count})</span>
      </h1>

      {wishlist.items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here for later."
          actionLabel="Browse products"
          actionTo="/shop"
          icon="♥"
        />
      ) : (
        <div className="product-grid">
          {wishlist.items.map((item) => (
            <article key={item.slug} className="product-card">
              <div className="product-media">
                <button
                  type="button"
                  className="wish active"
                  aria-label="Remove from wishlist"
                  onClick={() => wishlist.remove(item.slug)}
                >
                  <HeartIcon size={18} />
                </button>
                <Link to={`/products/${item.slug}`} aria-label={item.name}>
                  <ProductArtwork product={item} />
                </Link>
              </div>
              <div className="product-body">
                <span className="product-cat">{item.categoryName}</span>
                <Link to={`/products/${item.slug}`} className="product-title">
                  {item.name}
                </Link>
                <div className="product-price">
                  <span className="now">
                    <Money paise={item.minPricePaise} withDecimals={false} />
                  </span>
                  {item.minCompareAtPaise ? (
                    <span className="was">
                      <Money paise={item.minCompareAtPaise} withDecimals={false} />
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
