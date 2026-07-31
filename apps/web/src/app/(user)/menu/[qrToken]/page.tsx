import { redirect } from "next/navigation";

export default async function MenuRedirectPage({ params }: { params: Promise<{ qrToken: string }> }) {
  const { qrToken } = await params;
  redirect(`/join/${qrToken}`);
}
