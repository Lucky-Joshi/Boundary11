import { Link } from 'react-router-dom';
import { Money } from '../components/ui/Money.jsx';
import { ProductArtwork } from '../components/products/ProductArtwork.jsx';
import { QuantityStepper } from '../components/cart/QuantityStepper.jsx';
import { CartSummary } from '../components/cart/CartSummary.jsx';
import { EmptyState } from '../components/ui/States.jsx';
import { Spinner } from '../components/ui/Skeleton.jsx';
import { TrashIcon } from '../components/ui/Icons.jsx';
import { useCart } from '../context/CartContext.jsx';

export function Cart() {
  const cart = useCart();

  if (cart.isLoading) {
    return (
      <div className="container page">
        <Spinner label="Loading your bag" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container page">
        <h1 className="h1" style={{ marginBottom: 22 }}>
          Your bag
        </h1>
        <EmptyState
          title="Your bag is empty"
          description="Add a jersey, a cap or the full kit — it will show up here."
          actionLabel="Start shopping"
          actionTo="/shop"
          icon="🛍"
        />
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <span>/</span>
        <span>Bag</span>
      </div>
      <h1 className="h1" style={{ marginBottom: 22 }}>
        Your bag <span className="muted" style={{ fontWeight: 500 }}>({cart.totals.itemCount})</span>
      </h1>

      <div className="cart-layout">
        <div className="card card-pad">
          {cart.items.map((item) => (
            <div key={item.id} className="cart-line">
              <Link to={`/products/${item.slug}`} className="thumb" aria-label={item.name}>
                <ProductArtwork product={{ name: item.name, accent: '#1d2b53' }} label="" />
              </Link>
              <div>
                <Link to={`/products/${item.slug}`} className="product-title">
                  {item.name}
                </Link>
                <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  Size {item.size} · {item.color} · {item.sku}
                </p>
                <div className="row" style={{ gap: 14, marginTop: 10 }}>
                  <QuantityStepper
                    value={item.quantity}
                    max={Math.min(item.stock, 10)}
                    disabled={cart.isMutating}
                    onChange={(quantity) => cart.updateItem({ itemId: item.id, quantity })}
                  />
                  <button
                    type="button"
                    className="link-btn row"
                    style={{ gap: 6, color: 'var(--red)' }}
                    onClick={() => cart.removeItem(item.id)}
                    disabled={cart.isMutating}
                    aria-label={`Remove ${item.name}`}
                  >
                    <TrashIcon size={15} /> Remove
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong>
                  <Money paise={item.unitPrice * item.quantity} />
                </strong>
                <p className="muted" style={{ fontSize: '0.8rem' }}>
                  <Money paise={item.unitPrice} /> each
                </p>
              </div>
            </div>
          ))}
          <div className="row-between" style={{ paddingTop: 18 }}>
            <Link to="/shop" className="btn btn-ghost">
              ← Continue shopping
            </Link>
            <button type="button" className="link-btn" onClick={cart.clear}>
              Clear bag
            </button>
          </div>
        </div>

        <CartSummary />
      </div>
    </div>
  );
}
