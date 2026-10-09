import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout.jsx';
import { RequireStaff } from './components/RequireStaff.jsx';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Products } from './pages/Products.jsx';
import { ProductForm } from './pages/ProductForm.jsx';
import { Categories } from './pages/Categories.jsx';
import { Inventory } from './pages/Inventory.jsx';
import { Orders } from './pages/Orders.jsx';
import { OrderDetail } from './pages/OrderDetail.jsx';
import { Customers } from './pages/Customers.jsx';
import { Discounts } from './pages/Discounts.jsx';
import { Reviews } from './pages/Reviews.jsx';
import { Content } from './pages/Content.jsx';
import { Settings } from './pages/Settings.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireStaff>
            <AdminLayout />
          </RequireStaff>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="categories" element={<Categories />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="discounts" element={<Discounts />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="content" element={<Content />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}