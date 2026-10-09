import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PRODUCT_STATUS, SIZES, rupeesToPaise } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { keys, useInvalidatingMutation } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { useCategories } from '../hooks/useAdminQueries.js';
import { Icon } from '../components/ui/Icons.jsx';
import { Spinner, ErrorState } from '../components/ui/States.jsx';

const EMPTY_VARIANT = { id: '', sku: '', size: 'M', color: '', priceRupees: '', compareAtRupees: '', stock: 0 };

function rupeesToInput(paise) {
  return paise ? String((paise / 100).toFixed(0)) : '';
}

export function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { push } = useToast();

  const categoriesQuery = useCategories();
  const [collections, setCollections] = useState([]);
  const [product, setProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(editing);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    adminApi
      .listCollections()
      .then((res) => active && setCollections(res.items))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!editing) {
      setProduct(null);
      setForm({
        name: '',
        slug: '',
        description: '',
        categorySlug: '',
        collections: [],
        status: 'draft',
        featured: false,
        images: [{ url: '', alt: '' }],
        variants: [{ ...EMPTY_VARIANT }],
      });
      setLoadingProduct(false);
      return undefined;
    }

    let active = true;
    setLoadingProduct(true);
    setLoadError('');
    adminApi
      .getProduct(id)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        setForm({
          name: data.name,
          slug: data.slug,
          description: data.description,
          categorySlug: data.categorySlug,
          collections: data.collections || [],
          status: data.status,
          featured: data.featured,
          images: (data.images && data.images.length ? data.images : [{ url: '', alt: '' }]),
          variants: data.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            priceRupees: rupeesToInput(v.pricePaise),
            compareAtRupees: v.compareAtPaise ? rupeesToInput(v.compareAtPaise) : '',
            stock: v.stock,
          })),
        });
        setLoadingProduct(false);
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message);
          setLoadingProduct(false);
        }
      });
    return () => {
      active = false;
    };
  }, [editing, id]);

  const saveMutation = useInvalidatingMutation(
    (body) => (editing ? adminApi.updateProduct(id, body) : adminApi.createProduct(body)),
    [keys.products({}), keys.product(id), keys.analytics],
  );

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setVariant(index, key, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }

  function addVariant() {
    setForm((current) => ({ ...current, variants: [...current.variants, { ...EMPTY_VARIANT }] }));
  }

  function removeVariant(index) {
    setForm((current) => {
      const variants = current.variants.filter((_, i) => i !== index);
      return { ...current, variants: variants.length ? variants : [{ ...EMPTY_VARIANT }] };
    });
  }

  function setImage(index, key, value) {
    setForm((current) => ({
      ...current,
      images: current.images.map((img, i) => (i === index ? { ...img, [key]: value } : img)),
    }));
  }

  function removeImage(index) {
    setForm((current) => {
      const images = current.images.filter((_, i) => i !== index);
      return { ...current, images: images.length ? images : [{ url: '', alt: '' }] };
    });
  }

  function toggleCollection(slug) {
    setForm((current) => ({
      ...current,
      collections: current.collections.includes(slug)
        ? current.collections.filter((c) => c !== slug)
        : [...current.collections, slug],
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim(),
        categorySlug: form.categorySlug,
        collections: form.collections,
        status: form.status,
        featured: form.featured,
        images: form.images.filter((img) => img.url.trim()).map((img) => ({ url: img.url.trim(), alt: img.alt.trim() })),
        variants: form.variants.map((v) => ({
          id: v.id || undefined,
          sku: v.sku.trim(),
          size: v.size,
          color: v.color.trim(),
          pricePaise: rupeesToPaise(Number(v.priceRupees) || 0),
          compareAtPaise: v.compareAtRupees ? rupeesToPaise(Number(v.compareAtRupees) || 0) : null,
          stock: Number(v.stock) || 0,
        })),
      };
      const saved = await saveMutation.mutateAsync(body);
      push(editing ? 'Product updated' : 'Product created', 'success');
      navigate(`/products/${saved.id}/edit`, { replace: editing });
    } catch (error) {
      setErrors(error.fields || { _: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loadingProduct) return <Spinner label="Loading product…" />;
  if (loadError) return <ErrorState message={loadError} />;
  if (!form) return null;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <Link to="/products" className="btn btn-ghost btn-sm"><Icon name="arrowLeft" size={16} /></Link>
            <h2>{editing ? `Edit ${product.name}` : 'New product'}</h2>
          </div>
          <p>Fields mirror the shared product schema; prices are entered in rupees and stored as paise.</p>
        </div>
      </div>

      {errors._ ? <div className="alert alert-error">{errors._}</div> : null}

      <form onSubmit={submit} noValidate>
        <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', alignItems: 'start' }}>
          <div className="card card-pad">
            <h3 style={{ marginBottom: 14 }}>Details</h3>
            <div className="field">
              <label htmlFor="pf-name">Name</label>
              <input id="pf-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={Boolean(errors.name)} />
              {errors.name ? <span className="field-error">{errors.name}</span> : null}
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="pf-slug">Slug <span className="field-hint">(optional)</span></label>
                <input id="pf-slug" className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated from name" />
                {errors.slug ? <span className="field-error">{errors.slug}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="pf-category">Category</label>
                <select id="pf-category" className="select" value={form.categorySlug} onChange={(e) => set('categorySlug', e.target.value)} aria-invalid={Boolean(errors.categorySlug)}>
                  <option value="">Choose…</option>
                  {(categoriesQuery.data?.items || []).map((category) => (
                    <option key={category.slug} value={category.slug}>{category.name}</option>
                  ))}
                </select>
                {errors.categorySlug ? <span className="field-error">{errors.categorySlug}</span> : null}
              </div>
            </div>
            <div className="field">
              <label htmlFor="pf-desc">Description</label>
              <textarea id="pf-desc" className="textarea" value={form.description} onChange={(e) => set('description', e.target.value)} aria-invalid={Boolean(errors.description)} />
              {errors.description ? <span className="field-error">{errors.description}</span> : null}
            </div>

            {collections.length > 0 && (
              <div className="field">
                <label>Collections</label>
                <div className="row wrap" style={{ gap: 8 }}>
                  {collections.map((collection) => (
                    <label key={collection.slug} className="badge" style={{ cursor: 'pointer', textTransform: 'none', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={form.collections.includes(collection.slug)}
                        onChange={() => toggleCollection(collection.slug)}
                      />
                      {collection.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="field">
              <label>Images <span className="field-hint">(demo — URLs only)</span></label>
              <div className="stack">
                {form.images.map((img, index) => (
                  <div key={index} className="row" style={{ gap: 8, flex: 1 }}>
                    <input
                      className="input"
                      placeholder="Image URL"
                      value={img.url}
                      onChange={(e) => setImage(index, 'url', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      className="input"
                      placeholder="Alt text"
                      value={img.alt}
                      onChange={(e) => setImage(index, 'alt', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => removeImage(index)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gap: 16 }}>
            <div className="card card-pad">
              <h3 style={{ marginBottom: 14 }}>Organisation</h3>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="pf-status">Status</label>
                  <select id="pf-status" className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {Object.values(PRODUCT_STATUS).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="pf-featured">Featured</label>
                  <div className="row" style={{ height: 40 }}>
                    <input id="pf-featured" type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                    <span style={{ fontSize: '0.88rem' }}>Show on home</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <h3>Variants</h3>
                <button type="button" className="btn btn-outline btn-sm" onClick={addVariant}>
                  <Icon name="plus" size={14} /> Add
                </button>
              </div>
              {errors.variants ? <div className="alert alert-error" style={{ marginBottom: 12 }}>{errors.variants}</div> : null}
              <div className="stack">
                {form.variants.map((variant, index) => (
                  <div key={index} className="card card-pad" style={{ borderColor: 'var(--border-strong)' }}>
                    <div className="row-between" style={{ marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.85rem' }}>Variant {index + 1}</strong>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeVariant(index)} aria-label="Remove variant">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label>SKU</label>
                        <input className="input" value={variant.sku} onChange={(e) => setVariant(index, 'sku', e.target.value)} />
                        {errors[`variants.${index}.sku`] ? <span className="field-error">{errors[`variants.${index}.sku`]}</span> : null}
                      </div>
                      <div className="field">
                        <label>Size</label>
                        <select className="select" value={variant.size} onChange={(e) => setVariant(index, 'size', e.target.value)}>
                          {SIZES.map((size) => (
                            <option key={size} value={size}>{size}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Color</label>
                        <input className="input" value={variant.color} onChange={(e) => setVariant(index, 'color', e.target.value)} placeholder="Navy" />
                        {errors[`variants.${index}.color`] ? <span className="field-error">{errors[`variants.${index}.color`]}</span> : null}
                      </div>
                      <div className="field">
                        <label>Stock</label>
                        <input className="input" type="number" min="0" value={variant.stock} onChange={(e) => setVariant(index, 'stock', e.target.value)} />
                        {errors[`variants.${index}.stock`] ? <span className="field-error">{errors[`variants.${index}.stock`]}</span> : null}
                      </div>
                      <div className="field">
                        <label>Price (₹)</label>
                        <input className="input" type="number" min="0" step="1" value={variant.priceRupees} onChange={(e) => setVariant(index, 'priceRupees', e.target.value)} />
                        {errors[`variants.${index}.pricePaise`] ? <span className="field-error">{errors[`variants.${index}.pricePaise`]}</span> : null}
                      </div>
                      <div className="field">
                        <label>Compare at (₹, optional)</label>
                        <input className="input" type="number" min="0" step="1" value={variant.compareAtRupees} onChange={(e) => setVariant(index, 'compareAtRupees', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
          </button>
          <Link to="/products" className="btn btn-outline">Cancel</Link>
        </div>
      </form>
    </>
  );
}