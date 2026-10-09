import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { Home } from './pages/Home.jsx';
import { Shop } from './pages/Shop.jsx';
import { Collection } from './pages/Collection.jsx';
import { Product } from './pages/Product.jsx';
import { Cart } from './pages/Cart.jsx';
import { Checkout } from './pages/Checkout.jsx';
import { CheckoutSuccess } from './pages/CheckoutSuccess.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { Wishlist } from './pages/Wishlist.jsx';
import { Contact } from './pages/Contact.jsx';
import { About } from './pages/About.jsx';
import { ShippingPolicy } from './pages/ShippingPolicy.jsx';
import { ReturnsPolicy } from './pages/ReturnsPolicy.jsx';
import { Privacy } from './pages/Privacy.jsx';
import { Terms } from './pages/Terms.jsx';
import { NotFound } from './pages/NotFound.jsx';
import { AccountLayout } from './pages/account/AccountLayout.jsx';
import { AccountOverview } from './pages/account/AccountOverview.jsx';
import { AccountOrders } from './pages/account/AccountOrders.jsx';
import { AccountOrderDetail } from './pages/account/AccountOrderDetail.jsx';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="collections/:slug" element={<Collection />} />
        <Route path="products/:slug" element={<Product />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="checkout/success" element={<CheckoutSuccess />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="contact" element={<Contact />} />
        <Route path="about" element={<About />} />
        <Route path="shipping-policy" element={<ShippingPolicy />} />
        <Route path="returns-policy" element={<ReturnsPolicy />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />

        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AccountOverview />} />
          <Route path="orders" element={<AccountOrders />} />
          <Route path="orders/:id" element={<AccountOrderDetail />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
