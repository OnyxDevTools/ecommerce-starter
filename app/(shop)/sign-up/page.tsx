// filename: app/(shop)/sign-up/page.tsx
import { AuthForm } from "@/admin/auth-form";
export const metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="container auth">
      <h1>Your everyday starts here.</h1>
      <AuthForm signUp next="/account" />
      <a href="/sign-in">Already have an account?</a>
    </div>
  );
}
