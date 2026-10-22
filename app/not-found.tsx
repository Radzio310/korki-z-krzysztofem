import Mascot from "@/components/Mascot";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", background: "var(--bg)" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 24 }}>
        <Mascot mood="think" size={140} say="Tej strony nie ma — ale równanie zawsze da się rozwiązać." side="left" />
        <h1 className="h-section">404</h1>
        <a className="btn btn--primary" href="/">Wróć na stronę główną</a>
      </div>
    </main>
  );
}
