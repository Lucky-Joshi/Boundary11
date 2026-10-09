import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SORT_OPTIONS, DEFAULT_PAGE_SIZE } from '@boundary11/shared';
import { useProducts, useCategories } from '../hooks/useCatalog.js';
import { useDebounce } from '../hooks/useDebounce.js';
import { Filters } from '../components/products/Filters.jsx';
import { ProductGrid } from '../components/products/ProductGrid.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { ProductGridSkeleton } from '../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';

function toggle(list, item) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function Shop() {
  const [params, setParams] = useSearchParams();
  const categoriesQuery = useCategories();

  const q = params.get('q') || '';
  const selectedCategories = useMemo(() => (params.get('category') || '').split(',').filter(Boolean), [params]);
  const selectedSizes = useMemo(() => (params.get('size') || '').split(',').filter(Boolean), [params]);
  const selectedColors = useMemo(() => (params.get('color') || '').split(',').filter(Boolean), [params]);
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const inStock = params.get('inStock') === 'true';
  const sort = params.get('sort') || 'featured';
  const page = Number(params.get('page') || 1);

  const [searchInput, setSearchInput] = useState(q);
  const debouncedSearch = useDebounce(searchInput, 350);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    if (debouncedSearch === q) return;
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  function update(mutator) {
    const next = new URLSearchParams(params);
    mutator(next);
    setParams(next);
  }

  const queryParams = {
    q: q || undefined,
    category: selectedCategories.length ? selectedCategories.join(',') : undefined,
    size: selectedSizes.length ? selectedSizes.join(',') : undefined,
    color: selectedColors.length ? selectedColors.join(',') : undefined,
    minPrice: minPrice ? Number(minPrice) * 100 : undefined,
    maxPrice: maxPrice ? Number(maxPrice) * 100 : undefined,
    inStock: inStock || undefined,
    sort,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };

  const productsQuery = useProducts(queryParams);
  const activeFilterCount =
    selectedCategories.length + selectedSizes.length + selectedColors.length + (inStock ? 1 : 0) + (minPrice || maxPrice ? 1 : 0);

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span>/</span>
        <span>Shop</span>
      </div>

      <div className="row-between" style={{ marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1">All products</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {productsQuery.data ? `${productsQuery.data.total} products` : 'Loading products…'}
            {q ? ` for “${q}”` : ''}
          </p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label htmlFor="sort" className="muted" style={{ fontSize: '0.85rem' }}>
            Sort
          </label>
          <select
            id="sort"
            className="select"
            value={sort}
            onChange={(event) => update((next) => { next.set('sort', event.target.value); next.delete('page'); })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="shop-layout">
        <Filters
          categories={categoriesQuery.data?.items || []}
          value={{ categories: selectedCategories, sizes: selectedSizes, colors: selectedColors, minPrice, maxPrice, inStock }}
          onToggleCategory={(slug) =>
            update((next) => {
              const list = toggle(selectedCategories, slug);
              if (list.length) next.set('category', list.join(','));
              else next.delete('category');
              next.delete('page');
            })
          }
          onToggleSize={(size) =>
            update((next) => {
              const list = toggle(selectedSizes, size);
              if (list.length) next.set('size', list.join(','));
              else next.delete('size');
              next.delete('page');
            })
          }
          onToggleColor={(color) =>
            update((next) => {
              const list = toggle(selectedColors, color);
              if (list.length) next.set('color', list.join(','));
              else next.delete('color');
              next.delete('page');
            })
          }
          onPrice={(min, max) =>
            update((next) => {
              if (min) next.set('minPrice', min);
              else next.delete('minPrice');
              if (max) next.set('maxPrice', max);
              else next.delete('maxPrice');
              next.delete('page');
            })
          }
          onToggleStock={() =>
            update((next) => {
              if (inStock) next.delete('inStock');
              else next.set('inStock', 'true');
              next.delete('page');
            })
          }
          onClear={() => setParams(new URLSearchParams())}
        />

        <div>
          <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div className="row" style={{ gap: 10 }}>
              <label htmlFor="shop-search" className="sr-only">
                Search products
              </label>
              <input
                id="shop-search"
                className="input"
                type="search"
                placeholder="Search within results…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                style={{ minWidth: 240 }}
              />
            </div>
            {activeFilterCount > 0 ? (
              <span className="badge badge-blue">{activeFilterCount} filters active</span>
            ) : null}
          </div>

          {productsQuery.isLoading ? (
            <ProductGridSkeleton count={9} />
          ) : productsQuery.isError ? (
            <ErrorState error={productsQuery.error} onRetry={productsQuery.refetch} />
          ) : productsQuery.data.items.length === 0 ? (
            <EmptyState
              title="No products match those filters"
              description="Try removing a filter or searching for something broader."
              actionLabel="Clear filters"
              actionTo="/shop"
              icon="🔎"
            />
          ) : (
            <>
              <ProductGrid products={productsQuery.data.items} columns={3} />
              <Pagination
                page={productsQuery.data.page}
                totalPages={productsQuery.data.totalPages}
                onChange={(nextPage) =>
                  update((next) => {
                    if (nextPage <= 1) next.delete('page');
                    else next.set('page', String(nextPage));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  })
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
