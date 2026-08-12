import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy firm dossier URL — analytics now lives under /competitors/[slug]. */
export default async function FirmPageRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/competitors/${slug}`);
}
