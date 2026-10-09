import { adminApi } from '../services/adminApi.js';
import { useQuery } from '@tanstack/react-query';
import { keys } from '../hooks/useAdminQueries.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/States.jsx';
import { Link } from 'react-router-dom';

function CategoryTable({ items }) {
  if (!items.length) return <EmptyState title="None yet" />;
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Slug</th>
              <th>Description</th>
              <th className="num">Products</th>
            </tr>
          </thead>
          <tbody>
            {items.map((category) => (
              <tr key={category.slug}>
                <td style={{ fontWeight: 600 }}>{category.name}</td>
                <td className="muted">{category.slug}</td>
                <td className="muted">{category.description}</td>
                <td className="num">{category.productCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Categories() {
  const categories = useQuery({ queryKey: keys.categories, queryFn: adminApi.listCategories });
  const collections = useQuery({ queryKey: ['admin', 'collections'], queryFn: adminApi.listCollections });

  if (categories.isLoading || collections.isLoading) return <Spinner label="Loading taxonomies…" />;
  if (categories.isError) return <ErrorState message={categories.error.message} onRetry={categories.refetch} />;
  if (collections.isError) return <ErrorState message={collections.error.message} onRetry={collections.refetch} />;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Categories &amp; collections</h2>
          <p>Taxonomy shown on the storefront navigation and filters.</p>
        </div>
        <Link to="/products" className="btn btn-outline btn-sm">Browse products</Link>
      </div>

      <div className="card-pad">
        <h3 style={{ marginBottom: 6 }}>Categories</h3>
        <p className="muted" style={{ marginBottom: 14, fontSize: '0.85rem' }}>
          Each product belongs to exactly one category. Editing categories is not part of the prototype.
        </p>
        <CategoryTable items={categories.data.items} />
      </div>

      <div className="card-pad">
        <h3 style={{ marginBottom: 6 }}>Collections</h3>
        <p className="muted" style={{ marginBottom: 14, fontSize: '0.85rem' }}>
          Curated sets of products shown on the homepage.
        </p>
        <CategoryTable items={collections.data.items} />
      </div>
    </>
  );
}