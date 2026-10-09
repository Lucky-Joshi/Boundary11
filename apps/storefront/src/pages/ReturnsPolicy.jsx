import { StaticPage } from './StaticPage.jsx';

export function ReturnsPolicy() {
  return (
    <StaticPage
      title="Returns & refunds"
      intro="Our approach to returns, exchanges and refunds. Demo store — no money actually changes hands."
    >
      <h2>Return window</h2>
      <p>
        Unworn items with original tags can be returned within 14 days of delivery. Innerwear,
        accessories and personalised items are final sale for hygiene reasons.
      </p>
      <h2>How to start a return</h2>
      <p>
        Contact us with your order number and the reason for the return. We&rsquo;ll confirm eligibility
        and arrange a pickup where available.
      </p>
      <h2>Refunds</h2>
      <p>
        Approved refunds are processed to the original payment method within 5–7 business days. In this
        prototype, refunds are recorded as status changes only — no payment gateway is wired in.
      </p>
      <h2>Exchanges</h2>
      <p>
        Size exchanges are free, subject to availability. If your size is out of stock we&rsquo;ll offer
        a refund or a store credit instead.
      </p>
    </StaticPage>
  );
}
