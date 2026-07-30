import { redirect } from "next/navigation";

export default function MenuRedirectPage({ params }: { params: { qrToken: string } }) {
  redirect(`/join/${params.qrToken}`);
}
