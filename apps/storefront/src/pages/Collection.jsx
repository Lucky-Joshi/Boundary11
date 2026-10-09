import { useParams, Link } from 'react-router-dom';
import { useCollection } from '../hooks/useCatalog.js';
import { ProductGrid } from '../components/products/ProductGrid.jsx';
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx';
import { ErrorState } from '../components/ui/States.jsx';

export function Collection() {
  const { slug } = useParams();
  const query = useCollection(slug);

  if (query.isLoading) {
    return (
      <div className="container page">
        <div className="skeleton" style={{ height: 180, marginBottom: 28 }} />
        <ProductGridSkeleton count={8} />
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="container page">
        <ErrorState error={query.error} onRetry={query.refetch} />
      </div>
    );
  }

  const collection = query.data;

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Collections</span>
        <span>/</span>
        <span>{collection.name}</span>
      </div>

      <section
        className="promo"
        style={{ background: collection.accent, marginBottom: 34 }}
      >
        <div>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.85)' }}>
            Collection
          </span>
          <h1 className="h1" style={{ color: '#fff', marginTop: 8 }}>
            {collection.name}
          </h1>
          <p>{collection.description}</p>
          <span className="badge badge-navy" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }}>
            {collection.productCount} products
          </span>
        </div>
        <div className="promo-art" aria-hidden="true">
          {collection.name.split(' ')[0]}
        </div>
      </section>

      {collection.products.length === 0 ? (
        <div className="empty">
          <h3>Nothing here yet</h3>
          <p>This collection is being restocked. Check back soon.</p>
          <Link to="/shop" className="btn btn-primary">
            Shop all products
          </Link>
        </div>
      ) : (
        <ProductGrid products={collection.products} />
      )}
    </div>
  );
}
