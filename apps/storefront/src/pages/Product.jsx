import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Money } from '../components/ui/Money.jsx';
import { StarRating } from '../components/products/StarRating.jsx';
import { ProductArtwork } from '../components/products/ProductArtwork.jsx';
import { ProductGrid } from '../components/products/ProductGrid.jsx';
import { ProductReviews } from '../components/products/ProductReviews.jsx';
import { QuantityStepper } from '../components/cart/QuantityStepper.jsx';
import { Spinner } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import { useProduct, useRelatedProducts } from '../hooks/useCatalog.js';
import { useCart } from '../context/CartContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useRecentlyViewed } from '../context/RecentlyViewedContext.jsx';
import { HeartIcon, TruckIcon, RefreshIcon, ShieldIcon } from '../components/ui/Icons.jsx';

export function Product() {
  const { slug } = useParams();
  const productQuery = useProduct(slug);
  const relatedQuery = useRelatedProducts(slug);
  const cart = useCart();
  const wishlist = useWishlist();
  const recentlyViewed = useRecentlyViewed();
  const addRecent = useRef(recentlyViewed.add);
  addRecent.current = recentlyViewed.add;

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');
  const [added, setAdded] = useState(false);

  const product = productQuery.data;

  useEffect(() => {
    if (!product) return;
    const firstAvailable = product.variants.find((v) => v.stock > 0) || product.variants[0];
    setSelectedSize(firstAvailable.size);
    setSelectedColor(firstAvailable.color);
    setQuantity(1);
    addRecent.current(product);
  }, [product]);

  const sizes = useMemo(() => {
    if (!product) return [];
    return [...new Set(product.variants.map((v) => v.size))];
  }, [product]);

  const colors = useMemo(() => {
    if (!product) return [];
    return [...new Set(product.variants.map((v) => v.color))];
  }, [product]);

  const variant = useMemo(() => {
    if (!product) return null;
    return (
      product.variants.find((v) => v.size === selectedSize && v.color === selectedColor) ||
      product.variants.find((v) => v.size === selectedSize) ||
      null
    );
  }, [product, selectedSize, selectedColor]);

  function sizeAvailable(size) {
    return product.variants.some((v) => v.size === size && v.stock > 0);
  }

  async function addToCart() {
    if (!variant || variant.stock <= 0) return;
    try {
      await cart.addItem({ variantId: variant.id, quantity });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      /* toast already shown by the cart context */
    }
  }

  if (productQuery.isLoading) {
    return (
      <div className="container page">
        <Spinner label="Loading product" />
      </div>
    );
  }

  if (productQuery.isError) {
    return (
      <div className="container page">
        <ErrorState error={productQuery.error} onRetry={productQuery.refetch} />
      </div>
    );
  }

  const pricePaise = variant?.pricePaise ?? product.minPricePaise;
  const compareAt = variant?.compareAtPaise ?? product.minCompareAtPaise;
  const discount = compareAt && compareAt > pricePaise ? Math.round(((compareAt - pricePaise) / compareAt) * 100) : 0;
  const maxQty = Math.min(variant?.stock ?? 0, 10);

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/shop">Shop</Link>
        <span>/</span>
        <Link to={`/shop?category=${product.categorySlug}`}>{product.categoryName}</Link>
        <span>/</span>
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div>
          <div className="gallery-main">
            <ProductArtwork product={product} label={`${product.name} · front`} />
          </div>
          <div className="gallery-thumbs">
            {(product.images || []).slice(0, 4).map((image, index) => (
              <div key={index} className={`gallery-thumb ${index === 0 ? 'active' : ''}`}>
                <ProductArtwork product={product} label={image.alt ? '' : `View ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="buy-box">
          <div>
            <span className="product-cat">{product.categoryName}</span>
            <h1 className="h1" style={{ marginTop: 6 }}>
              {product.name}
            </h1>
          </div>

          <div className="row" style={{ gap: 14 }}>
            <StarRating value={product.rating} count={product.reviewCount} />
            {product.featured ? <span className="badge badge-saffron">Featured</span> : null}
          </div>

          <div className="price-line">
            <span className="now">
              <Money paise={pricePaise} />
            </span>
            {compareAt ? <span className="was"><Money paise={compareAt} /></span> : null}
            {discount > 0 ? <span className="off">{discount}% off</span> : null}
          </div>

          <p className="lead">{product.shortDescription || product.description}</p>

          {/* Size selector */}
          <div>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: '0.9rem' }}>Size</strong>
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                {variant ? (variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock') : 'Choose a size'}
              </span>
            </div>
            <div className="size-options" role="group" aria-label="Select size">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`size-chip ${selectedSize === size ? 'active' : ''}`}
                  aria-pressed={selectedSize === size}
                  disabled={!sizeAvailable(size)}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {colors.length > 1 ? (
            <div>
              <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 8 }}>Colour</strong>
              <div className="chip-row" role="group" aria-label="Select colour">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`chip ${selectedColor === color ? 'active' : ''}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={Math.max(maxQty, 1)}
              disabled={!variant || variant.stock <= 0}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg"
              style={{ flex: 1, minWidth: 200 }}
              disabled={!variant || variant.stock <= 0 || cart.isMutating}
              onClick={addToCart}
            >
              {variant && variant.stock <= 0 ? 'Out of stock' : added ? 'Added to bag ✓' : 'Add to bag'}
            </button>
            <button
              type="button"
              className={`btn btn-outline btn-lg ${wishlist.has(product.slug) ? 'active' : ''}`}
              aria-label={wishlist.has(product.slug) ? 'Remove from wishlist' : 'Add to wishlist'}
              onClick={() => wishlist.toggle(product)}
            >
              <HeartIcon size={18} />
            </button>
          </div>

          <ul className="stack" style={{ gap: 10, marginTop: 4 }}>
            <li className="row muted" style={{ gap: 10, fontSize: '0.9rem' }}>
              <TruckIcon size={18} /> Free shipping on orders over ₹1,999
            </li>
            <li className="row muted" style={{ gap: 10, fontSize: '0.9rem' }}>
              <RefreshIcon size={18} /> 14-day returns on unworn items
            </li>
            <li className="row muted" style={{ gap: 10, fontSize: '0.9rem' }}>
              <ShieldIcon size={18} /> Secure demo checkout — no real payment
            </li>
          </ul>
        </div>
      </div>

      {/* Info tabs */}
      <section style={{ marginTop: 48 }}>
        <div className="info-tabs" role="tablist">
          {[
            { id: 'description', label: 'Description' },
            { id: 'specs', label: 'Specifications' },
            { id: 'shipping', label: 'Shipping & returns' },
            { id: 'reviews', label: `Reviews (${product.reviewCount || 0})` },
          ].map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="prose">
          {tab === 'description' ? <p>{product.description}</p> : null}
          {tab === 'specs' ? (
            <dl className="spec-list">
              <div>
                <dt>Category</dt>
                <dd>{product.categoryName}</dd>
              </div>
              <div>
                <dt>Available sizes</dt>
                <dd>{product.availableSizes.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Colours</dt>
                <dd>{product.availableColors.join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>SKU (selected)</dt>
                <dd>{variant?.sku || '—'}</dd>
              </div>
              <div>
                <dt>Collections</dt>
                <dd>{product.collections.join(', ') || '—'}</dd>
              </div>
            </dl>
          ) : null}
          {tab === 'shipping' ? (
            <>
              <p>
                Orders are dispatched within 1–2 business days. Standard delivery takes 3–6 business
                days depending on your PIN code. Free shipping applies to orders over ₹1,999; otherwise
                a flat ₹99 applies.
              </p>
              <p>
                Returns are accepted within 14 days for unworn items with tags attached. Refunds are
                processed to the original payment method. This is a demo store — no goods are shipped
                and no money changes hands.
              </p>
            </>
          ) : null}
        </div>

        {tab === 'reviews' ? (
          <div style={{ marginTop: 24 }}>
            <ProductReviews slug={product.slug} />
          </div>
        ) : null}
      </section>

      {/* Related */}
      {relatedQuery.data?.items?.length ? (
        <section style={{ marginTop: 56 }}>
          <div className="section-head">
            <h2 className="h2">You might also like</h2>
          </div>
          <ProductGrid products={relatedQuery.data.items} />
        </section>
      ) : null}
    </div>
  );
}
