import { notFound } from "next/navigation";
import { PublicMarketingPage, publicMarketingSlugs, type PublicMarketingSlug } from "@/components/marketing/public-marketing-page";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return publicMarketingSlugs.map((slug) => ({ slug }));
}

export default async function MarketingSlugPage({ params }: PageProps) {
  const { slug } = await params;
  if (!publicMarketingSlugs.includes(slug as PublicMarketingSlug)) notFound();

  return <PublicMarketingPage slug={slug as PublicMarketingSlug} />;
}
