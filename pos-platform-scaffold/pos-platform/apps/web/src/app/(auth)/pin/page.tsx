// PIN pad sign-in lands with the staff-accounts slice; the password form
// at /login is the supported path today.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/login");
}
