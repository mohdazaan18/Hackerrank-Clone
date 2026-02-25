import { redirect } from "next/navigation";

/**
 * Landing Page → Redirect to /login
 */
export default function LandingPage() {
  redirect("/login");
}
