// Providers: auth, db (Dexie), sync, profile, theme. Everything the cashier
// UI needs is available offline from here down — the network is never on
// the critical path of a sale.
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
