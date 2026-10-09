import { StaticPage } from './StaticPage.jsx';

export function Privacy() {
  return (
    <StaticPage
      title="Privacy policy"
      intro="How we handle data in this prototype, and how a production build should handle it."
    >
      <h2>What we collect</h2>
      <p>
        In this demo, account details and checkout information you enter are stored in the API&rsquo;s
        in-memory demo provider and are lost when the server restarts. The storefront keeps a shopping
        cart id and your wishlist in your browser&rsquo;s localStorage. No authentication tokens are
        written to localStorage.
      </p>
      <h2>How data is used</h2>
      <p>
        Data is used only to render the shopping experience and demonstrate the order lifecycle. It is
        not sold, shared or used for advertising.
      </p>
      <h2>Production considerations</h2>
      <p>
        A production deployment would use Supabase Auth with server-verified sessions, httpOnly cookies,
        row-level security so customers can only read their own records, and encrypted storage for
        personal data.
      </p>
      <h2>Your choices</h2>
      <p>
        You can clear your cart id and wishlist at any time from your browser settings. Deleting stored
        data does not affect any orders already placed.
      </p>
    </StaticPage>
  );
}
