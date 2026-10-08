// The register front end (templates/pos.html) is the product surface; it
// handles its own auth gate (no token → /login) because tokens live in
// localStorage, so the branch happens client-side after redirect.
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/pos");
}
