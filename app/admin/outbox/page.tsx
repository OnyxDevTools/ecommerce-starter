// filename: app/admin/outbox/page.tsx
import { adminServices as services } from "@/lib/auth/admin-access";
import { all } from "@/lib/data";
export default async function Page() {
  const rows = await all((await services()).store, "Notification");
  return (
    <>
      <h1>Email outbox.</h1>
      <p>
        Demo messages stay here. SMTP delivery requires explicit configuration.
        Uncertain sends require operator review before retrying.
      </p>
      {!rows.length && (
        <div className="empty">
          Your first order confirmation will appear here.
        </div>
      )}
      {rows.map((n) => (
        <details className="panel" key={n.id}>
          <summary>
            {n.subject} · {n.to} · {n.state}
          </summary>
          <iframe
            title={`Email for order ${n.orderId}`}
            sandbox=""
            srcDoc={n.html}
            className="email-preview"
          />
        </details>
      ))}
    </>
  );
}
