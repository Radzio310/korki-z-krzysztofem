import type { Metadata } from "next";
import PreviewHost from "@/components/panel/preview/PreviewHost";

/* Ramka żywego podglądu dla panelu (Oferta, Treści). Sama nic nie pobiera — czeka na szkic od panelu. */
export const metadata: Metadata = { title: "Podgląd", robots: { index: false, follow: false } };

export default function Page() {
  return <PreviewHost />;
}
