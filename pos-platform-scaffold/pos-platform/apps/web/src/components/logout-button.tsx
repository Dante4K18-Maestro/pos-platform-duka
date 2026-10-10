"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/api-client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      className="side-logout"
      onClick={() => {
        clearSession();
        try {
          window.localStorage.removeItem("pos:auth:role");
          window.localStorage.removeItem("pos:auth:mode");
        } catch {
          // Storage can be unavailable (private mode); the session is already
          // cleared, so logging out still succeeds.
        }
        router.push("/login");
      }}
    >
      Log out
    </button>
  );
}
