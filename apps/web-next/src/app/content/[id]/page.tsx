import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyContentRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/app/en/content/${id}`);
}
