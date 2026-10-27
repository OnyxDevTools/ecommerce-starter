// filename: app/(shop)/sign-in/page.tsx
import { AuthForm } from "@/admin/auth-form";
export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="container auth">
      <span className="eyebrow">WELCOME BACK</span>
      <h1>Make yourself at home.</h1>
      <AuthForm next="/account" />
      <p>
        New here? <a href="/sign-up">Create an account</a>
      </p>
    </div>
  );
}
