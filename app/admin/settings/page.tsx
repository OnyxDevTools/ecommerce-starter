// filename: app/admin/settings/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { settings } from "@/modules/catalog/service";
import { SettingsForm } from "@/admin/forms";
export default async function Page() {
  return (
    <>
      <h1>Store settings.</h1>
      <SettingsForm settings={await settings((await services()).store)} />
    </>
  );
}
