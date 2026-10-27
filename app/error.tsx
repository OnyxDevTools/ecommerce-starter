"use client";
// filename: app/error.tsx
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="container narrow">
      <h1>We couldn’t load that just yet.</h1>
      <p>
        Try again. If you are setting up this starter, check the downloaded Onyx
        configuration, schema and seed instructions in README.md.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
