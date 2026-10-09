import { Link } from 'react-router-dom';
import { useProducts, useCategories, useCollections } from '../hooks/useCatalog.js';
import { ProductGrid } from '../components/products/ProductGrid.jsx';
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import { ArrowRightIcon, CheckIcon } from '../components/ui/Icons.jsx';

const CATEGORY_ACCENTS = {
  jerseys: '#1d2b53',
  training: '#0d9488',
  hoodies: '#1e3a8a',
  caps: '#f97316',
  bags: '#0f766e',
  accessories: '#2563eb',
};

export function Home() {
  const categories = useCategories();
  const collections = useCollections();
  const bestsellers = useProducts({ sort: 'popularity', pageSize: 4 });
  const newArrivals = useProducts({ sort: 'newest', pageSize: 8 });

  return (
    <>
      {/* Hero */}
      <section className="container">
        <div className="hero">
          <div className="hero-inner">
            <div>
              <span className="eyebrow">Original cricket merchandise</span>
              <h1 className="display" style={{ marginTop: 14 }}>
                Gear up for every innings.
              </h1>
              <p>
                Jerseys, training kit and fan essentials built for the long season. Designed in-house,
                made to be worn hard and washed harder.
              </p>
              <div className="hero-actions">
                <Link to="/shop" className="btn btn-accent btn-lg">
                  Shop the collection
                </Link>
                <Link to="/collections/new-season" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>
                  See what&rsquo;s new
                </Link>
              </div>
              <div className="hero-stats">
                <div className="hero-stat">
                  <strong>15+</strong>
                  <span>Products in the range</span>
                </div>
                <div className="hero-stat">
                  <strong>4.6★</strong>
                  <span>Average demo rating</span>
                </div>
                <div className="hero-stat">
                  <strong>14-day</strong>
                  <span>Easy returns</span>
                </div>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <span className="hero-sticker">Matchday ready</span>
              <div className="ball" />
              <div className="crease" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Shop by category</span>
            <h2 className="h2" style={{ marginTop: 8 }}>
              Find your kit
            </h2>
          </div>
          <Link to="/shop" className="row muted" style={{ fontWeight: 600 }}>
            View all <ArrowRightIcon size={16} />
          </Link>
        </div>
        {categories.isLoading ? (
          <div className="category-tiles">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton" style={{ height: 104 }} />
            ))}
          </div>
        ) : (
          <div className="category-tiles">
            {categories.data?.items?.map((category) => (
              <Link key={category.slug} to={`/shop?category=${category.slug}`} className="category-tile">
                <span
                  className="dot"
                  style={{ background: CATEGORY_ACCENTS[category.slug] || '#1d2b53' }}
                  aria-hidden="true"
                />
                <strong>{category.name}</strong>
                <small>{category.productCount} products</small>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bestsellers */}
      <section className="container section-tight">
        <div className="section-head">
          <div>
            <span className="eyebrow">Trending now</span>
            <h2 className="h2" style={{ marginTop: 8 }}>
              Bestsellers
            </h2>
          </div>
          <Link to="/shop?sort=popularity" className="row muted" style={{ fontWeight: 600 }}>
            Shop bestsellers <ArrowRightIcon size={16} />
          </Link>
        </div>
        {bestsellers.isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : bestsellers.isError ? (
          <ErrorState error={bestsellers.error} onRetry={bestsellers.refetch} />
        ) : (
          <ProductGrid products={bestsellers.data.items} />
        )}
      </section>

      {/* Collections promo */}
      <section className="container section-tight">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {(collections.data?.items || []).slice(0, 2).map((collection) => (
            <Link
              key={collection.slug}
              to={`/collections/${collection.slug}`}
              className="promo"
              style={{ background: collection.accent }}
            >
              <div>
                <span className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>
                  Collection
                </span>
                <h2 className="h2" style={{ marginTop: 8 }}>
                  {collection.name}
                </h2>
                <p>{collection.description}</p>
                <span className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}>
                  Explore {collection.name}
                </span>
              </div>
              <div className="promo-art" aria-hidden="true">
                {collection.name.split(' ')[0]}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Just landed</span>
            <h2 className="h2" style={{ marginTop: 8 }}>
              New arrivals
            </h2>
          </div>
          <Link to="/shop?sort=newest" className="row muted" style={{ fontWeight: 600 }}>
            Shop new in <ArrowRightIcon size={16} />
          </Link>
        </div>
        {newArrivals.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : newArrivals.isError ? (
          <ErrorState error={newArrivals.error} onRetry={newArrivals.refetch} />
        ) : (
          <ProductGrid products={newArrivals.data.items} />
        )}
      </section>

      {/* Brand story */}
      <section className="container section-tight">
        <div className="story">
          <div className="story-art" aria-hidden="true">
            <div className="ring" />
          </div>
          <div>
            <span className="eyebrow">The Boundary11 story</span>
            <h2 className="h2" style={{ marginTop: 10 }}>
              Made for the people who never leave the ground early.
            </h2>
            <p className="lead" style={{ marginTop: 12 }}>
              We started Boundary11 because good cricket kit shouldn&rsquo;t be reserved for the
              professionals. Every product is designed in-house and built to survive nets, matches and
              everything in between.
            </p>
            <ul className="value-list">
              <li>
                <span className="tick">
                  <CheckIcon size={14} />
                </span>
                <span>Original designs — no third-party logos or official kit.</span>
              </li>
              <li>
                <span className="tick">
                  <CheckIcon size={14} />
                </span>
                <span>Durable fabrics tested for repeated washes and long days.</span>
              </li>
              <li>
                <span className="tick">
                  <CheckIcon size={14} />
                </span>
                <span>Fair pricing with a straightforward 14-day return window.</span>
              </li>
            </ul>
            <Link to="/about" className="btn btn-primary" style={{ marginTop: 22 }}>
              Read our story
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
