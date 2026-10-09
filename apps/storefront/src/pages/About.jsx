import { StaticPage } from './StaticPage.jsx';

export function About() {
  return (
    <StaticPage
      title="About Boundary11"
      intro="Original cricket-inspired merchandise, designed in-house for players and supporters."
    >
      <p>
        Boundary11 began with a simple frustration: good cricket kit was either wildly expensive or
        built to fall apart after a season. We set out to make gear that could handle nets on a Tuesday,
        a match on Sunday and everything in between — without the premium markup.
      </p>
      <h2>What we make</h2>
      <p>
        Our range spans matchday jerseys, training tees, hoodies, caps, bags and the small accessories
        that make a kit bag complete. Every piece is designed by our own team and made from fabrics
        chosen for durability and comfort in heat and humidity.
      </p>
      <h2>Our designs are original</h2>
      <p>
        All Boundary11 branding, product names and artwork are original. We do not use any cricket
        board, national team or player marks, and this demo store carries no licensed third-party
        merchandise.
      </p>
      <h2>About this build</h2>
      <p>
        This storefront is a working prototype. The catalog, orders and payments are powered by an
        isolated demo data provider so the platform can be evaluated end to end without a live payment
        gateway or a production database.
      </p>
    </StaticPage>
  );
}
