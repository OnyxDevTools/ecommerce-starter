// filename: app/not-found.tsx
export default function NotFound() {
  return (
    <div className="container narrow">
      <h1>Nothing here, just yet.</h1>
      <p>This page or order is unavailable.</p>
      <a className="button" href="/shop">
        Back to the collection
      </a>
    </div>
  );
}
