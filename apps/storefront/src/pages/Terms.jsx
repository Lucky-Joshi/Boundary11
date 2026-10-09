import { StaticPage } from './StaticPage.jsx';

export function Terms() {
  return (
    <StaticPage
      title="Terms & conditions"
      intro="The terms that would govern use of the Boundary11 store. This is a demonstration application."
    >
      <h2>Using this store</h2>
      <p>
        This storefront is provided for demonstration purposes. Prices, stock levels, reviews and orders
        are simulated and should not be treated as real commercial offers.
      </p>
      <h2>No real transactions</h2>
      <p>
        Checkout uses a mock payment provider. No payment is collected, no card data is requested or
        stored, and no goods are shipped.
      </p>
      <h2>Intellectual property</h2>
      <p>
        All Boundary11 names, logos, product names and artwork are original to this project. No third
        party trademarks, cricket board marks, team crests or player likenesses are used.
      </p>
      <h2>Accounts</h2>
      <p>
        Demo accounts are provided for evaluation. Do not enter real or sensitive personal information
        anywhere in this prototype.
      </p>
      <h2>Changes</h2>
      <p>
        These terms may change as the platform is developed. The current version always applies to your
        use of the store.
      </p>
    </StaticPage>
  );
}
