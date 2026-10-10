// Front door. The register (/pos) is the product surface — served by the
// static template and reached with a full navigation — while sign-in lives at
// /login, where the Admin/Cashier choice is made. This page spells out the two
// ways to use Duka: the admin back office and the counter-only till.
import Link from "next/link";

const FEATURES = [
  {
    icon: "📷",
    title: "Scan by camera or barcode",
    body: "Point a phone at a barcode, or plug in a scanner gun — items land straight in the order.",
  },
  {
    icon: "📦",
    title: "Stock that keeps up",
    body: "Shelves update as you sell, with low-stock alerts before you run out of the fast movers.",
  },
  {
    icon: "📱",
    title: "M-Pesa or cash",
    body: "Push an STK request to the customer's phone, or take cash and open the drawer with a float.",
  },
  {
    icon: "🛡️",
    title: "Reports and an audit trail",
    body: "Daily takings, cash sessions and a full who-changed-what log — reserved for the admin.",
  },
];

const ROLES = [
  {
    icon: "🧑‍💼",
    title: "Admin",
    points: [
      "Dashboard, reports and audit log",
      "Inventory, products and categories",
      "Customers, staff, suppliers and stores",
      "Purchasing and store settings",
    ],
  },
  {
    icon: "🧾",
    title: "Cashier",
    points: [
      "The counter till — sell and charge",
      "Camera and barcode scanning",
      "Checkout, and the drawer for this shift",
      "Log out hands the counter back",
    ],
  },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="landing-brand">
          <span className="logo">🏪</span>
          <span>
            Duka POS
            <small>Point of sale</small>
          </span>
        </span>
        <nav className="landing-nav-links">
          <Link className="landing-link" href="/login">
            Sign in
          </Link>
          {/* /pos is a rewrite to the static register template, so it is a
              real navigation rather than a client-route transition. */}
          <a className="btn btn-primary landing-nav-cta" href="/pos">
            Open register
          </a>
        </nav>
      </header>

      <section className="landing-hero">
        <div>
          <span className="landing-tag">✨ Built for shops like yours</span>
          <h1>
            Run your duka like the <span className="accent">big shops</span>.
          </h1>
          <p className="lead">
            Sell, scan and take M-Pesa or cash at the counter — with every
            shilling accounted for, and a back office that stays out of the
            cashier&apos;s way.
          </p>
          <div className="landing-cta">
            <Link className="btn btn-primary" href="/login">
              Sign in
            </Link>
            <a className="btn btn-ghost" href="/pos">
              Open the register
            </a>
          </div>
          <p className="landing-role-note">
            Choose <strong>Admin</strong> for the full back office, or{" "}
            <strong>Cashier</strong> for a counter-only till.
          </p>
        </div>

        <div className="landing-art">
          <div className="landing-badge-float">🔒 Cashier-safe till</div>
          <div className="landing-card landing-ticket">
            <div className="landing-ticket-row">
              <span>Unga Pembe · 2kg</span>
              <span className="muted">KES 210.00</span>
            </div>
            <div className="landing-ticket-row">
              <span>Sugar · 1kg</span>
              <span className="muted">KES 165.00</span>
            </div>
            <div className="landing-ticket-row">
              <span>Milk · 500ml × 2</span>
              <span className="muted">KES 130.00</span>
            </div>
            <div className="landing-ticket-total">
              <span>Total</span>
              <span>KES 505.00</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2>Everything the counter needs. Nothing it doesn&apos;t.</h2>
        <p className="sub">
          One store, two clear roles: the admin sees the whole picture, the
          cashier sees only the sale in front of them.
        </p>
        <div className="landing-grid">
          {FEATURES.map((feature) => (
            <article className="landing-feature" key={feature.title}>
              <span className="icon" aria-hidden>
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>Two sign-ins, one till</h2>
        <p className="sub">
          Sign in from the login screen and pick your side of the counter.
        </p>
        <div className="landing-roles">
          {ROLES.map((role) => (
            <article className="landing-role-card" key={role.title}>
              <div className="role-head">
                <span className="icon" aria-hidden>
                  {role.icon}
                </span>
                {role.title}
              </div>
              <ul>
                {role.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Duka POS · Demo Duka</span>
        <span>
          <Link className="landing-link" href="/login">
            Sign in
          </Link>
          <a className="landing-link" href="/pos">
            Register
          </a>
        </span>
      </footer>
    </div>
  );
}
