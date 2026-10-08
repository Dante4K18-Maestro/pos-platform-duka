"use client";

// Settings hub: one warm photo tile per settings area (Unsplash imagery,
// Loyverse-style). The sub-pages exist so every link resolves; their content
// lands with their slices.
import Link from "next/link";
import { useRef } from "react";

const AREAS = [
  {
    href: "/settings/taxes",
    icon: "🧮",
    title: "Taxes",
    description: "VAT rates per store. Currently seeded at 16%.",
    photo:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=800&auto=format&fit=crop",
  },
  {
    href: "/settings/mpesa",
    icon: "📲",
    title: "M-Pesa",
    description: "Daraja credentials and STK push defaults.",
    photo:
      "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=800&auto=format&fit=crop",
  },
  {
    href: "/settings/receipts",
    icon: "🧾",
    title: "Receipts",
    description: "Header/footer text, logo, and printer behaviour.",
    photo:
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=800&auto=format&fit=crop",
  },
  {
    href: "/settings/profile",
    icon: "🏪",
    title: "Business profile",
    description: "Store name, currency, timezone and branding.",
    photo:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop",
  },
];

export default function SettingsPage() {
  // The spotlight between tiles follows the pointer as --px/--py percentages.
  const gridRef = useRef<HTMLDivElement>(null);

  function trackPointer(event: React.PointerEvent<HTMLDivElement>) {
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    grid.style.setProperty("--px", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    grid.style.setProperty("--py", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <main>
      <h1>Settings</h1>
      <p className="subtitle">Store configuration, one area at a time.</p>

      <div className="photo-grid kpi-grid" ref={gridRef} onPointerMove={trackPointer}>
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="photo-tile"
            style={{ backgroundImage: `url("${area.photo}")` }}
          >
            <span className="tile-icon">{area.icon}</span>
            <h3>{area.title}</h3>
            <p>{area.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
