// This slice of the register flow lives in the register front end at /pos
// (templates/pos.html). Kept as a redirect so planned routes resolve.
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/pos");
}
