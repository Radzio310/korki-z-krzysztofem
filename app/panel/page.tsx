import type { Metadata } from "next";
import PanelApp from "@/components/panel/PanelApp";

export const metadata: Metadata = { title: "Panel", robots: { index: false, follow: false } };

export default function Page() {
  return <PanelApp />;
}
