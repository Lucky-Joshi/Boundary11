import { StaticPage } from './StaticPage.jsx';

export function ShippingPolicy() {
  return (
    <StaticPage
      title="Shipping policy"
      intro="How delivery works at Boundary11. This is a demo store — no physical goods are dispatched."
    >
      <h2>Processing time</h2>
      <p>
        Orders are checked and packed within 1–2 business days. Orders placed on weekends or public
        holidays are processed on the next business day.
      </p>
      <h2>Delivery estimates</h2>
      <ul>
        <li>Metro cities: 2–4 business days</li>
        <li>Other cities: 3–6 business days</li>
        <li>Remote PIN codes: 5–9 business days</li>
      </ul>
      <h2>Shipping charges</h2>
      <p>
        Shipping is free on orders over ₹1,999. Orders below that threshold carry a flat ₹99 shipping
        fee, shown clearly in the cart before you pay.
      </p>
      <h2>Tracking</h2>
      <p>
        Once an order is marked as shipped, tracking details would normally appear on your order page.
        In this prototype, order statuses are simulated and updated by the admin dashboard.
      </p>
    </StaticPage>
  );
}
