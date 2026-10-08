// Back-office surface: owner/manager views. A grouped sidebar whose every
// item resolves to a real (designed) page. Client component so the current
// route gets the .active treatment (globals.css).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  // The register ("pos") is served by the static template, not a Next route,
  // so it is linked natively rather than through the client router.
  external?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "📈" },
      { href: "/reports", label: "Reports", icon: "📊" },
      { href: "/stores", label: "Stores", icon: "🏬" },
    ],
  },
  {
    title: "Selling",
    items: [
      { href: "/pos", label: "Point of Sale", icon: "🧾", external: true },
      { href: "/sales-history", label: "Sales", icon: "🧮" },
      { href: "/refunds", label: "Refunds", icon: "↩️" },
      { href: "/cash-session", label: "Cash", icon: "💵" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: "🏷️" },
      { href: "/categories", label: "Categories", icon: "🗂️" },
      { href: "/inventory", label: "Inventory", icon: "📦" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/customers", label: "Customers", icon: "🧑‍🤝‍🧑" },
      { href: "/staff", label: "Staff", icon: "👥" },
    ],
  },
  {
    title: "Purchasing",
    items: [
      { href: "/suppliers", label: "Suppliers", icon: "🚚" },
      { href: "/purchase-orders", label: "Purchase Orders", icon: "📥" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/audit", label: "Audit log", icon: "🛡️" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

export default function BackOfficeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Rendered after mount so the static shell and the client agree.
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="app-shell">
      <aside className="app-side">
        <span className="brand">
          <span className="logo">🏪</span>
          <span className="brand-text">
            <strong>Duka POS</strong>
            <small>Back office</small>
          </span>
          {/* Same pulse language as the register's LIVE dot. */}
          <span className="live-dot" aria-hidden />
        </span>

        <nav className="app-side-nav">
          {NAV.map((group) => (
            <div className="app-side-group" key={group.title}>
              <p className="app-side-title">{group.title}</p>
              {group.items.map((item) =>
                item.external ? (
                  <a key={item.href} href={item.href} className="app-side-link">
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                    <span className="nav-out">↗</span>
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={isActive(item.href) ? "app-side-link active" : "app-side-link"}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          ))}
        </nav>

        <div className="app-side-foot">
          <span className="side-status">
            <span className="live-dot" aria-hidden /> Live {clock && `· ${clock}`}
          </span>
          <LogoutButton />
        </div>
      </aside>

      <div className="app-main">
        <div className="page">{children}</div>
      </div>
    </div>
  );
}
