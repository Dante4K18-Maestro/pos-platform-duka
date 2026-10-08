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
        router.push("/login");
      }}
    >
      Log out
    </button>
  );
}
