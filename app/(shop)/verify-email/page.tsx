// filename: app/(shop)/verify-email/page.tsx
import { VerificationControls } from "@/admin/auth-form";
export const metadata = {
  title: "Verify email",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="container auth">
      <h1>Check your inbox.</h1>
      <p>Verify your email, then continue to your account.</p>
      <VerificationControls />
    </div>
  );
}
