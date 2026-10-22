import type { Metadata } from "next";
import ManageBooking from "@/components/ManageBooking";

export const metadata: Metadata = { title: "Twoja rezerwacja", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ManageBooking token={token} />;
}
