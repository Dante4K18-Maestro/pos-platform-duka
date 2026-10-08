// The register now lives at /pos (templates/pos.html). This old page is kept
// as a redirect so existing links and bookmarks keep working.
import { redirect } from "next/navigation";

export default function SellPage() {
  redirect("/pos");
}
