// filename: scripts/bootstrap-admin.ts
import { firebaseAdmin } from "../lib/auth/admin";
import { OnyxStore } from "../lib/repository";
import { locked, all, put } from "../lib/data";
import { ensure } from "../lib/errors";
const email = process.env.STORE_ADMIN_EMAIL;
ensure(
  email,
  422,
  "Set STORE_ADMIN_EMAIL to an existing verified Firebase user.",
);
const user = await firebaseAdmin().getUserByEmail(email);
ensure(
  user.emailVerified && !user.disabled,
  422,
  "Administrator must have a verified, active Firebase account.",
);
const store = new OnyxStore();
await locked(store, async () => {
  const admins = (await all(store, "Customer")).filter(
    (x) => x.role === "administrator" && x.active,
  );
  ensure(
    !admins.some((x) => x.id !== user.uid),
    409,
    "Another administrator already exists. Grant further access through a reviewed operator process.",
  );
  await put(store, "Customer", {
    id: user.uid,
    email: user.email!,
    name: user.displayName || user.email!,
    role: "administrator",
    active: true,
  });
});
console.log(
  "Administrator grant ready. No public signup promotion or password was created.",
);
