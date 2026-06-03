import Link from "next/link";

const pageContent = {
  features: {
    title: "Features",
    description: "Plan, generate, publish, and measure content from one AI search workspace.",
    points: ["AEO prompt monitoring", "Brand-aware content generation", "Media Studio workflows"],
  },
  "use-cases": {
    title: "Use Cases",
    description: "Use SoloSpider for content ops, AI visibility, SEO workflows, and campaign support.",
    points: ["Founder-led marketing", "Agency project delivery", "Multi-brand content planning"],
  },
  about: {
    title: "About SoloSpider",
    description: "SoloSpider helps teams turn search, AI visibility, and social content into a daily operating system.",
    points: ["Project-scoped workspaces", "AI-assisted execution", "Operational dashboards"],
  },
  contact: {
    title: "Contact",
    description: "Reach the SoloSpider team for product questions, demos, and partnership conversations.",
    points: ["Product demos", "Agency onboarding", "Support conversations"],
  },
  blog: {
    title: "Blog",
    description: "Read practical notes on AI search, content operations, SEO, and growth workflows.",
    points: ["AEO strategy", "Content systems", "Search visibility"],
  },
  "seo-audit": {
    title: "SEO Audit",
    description: "Review technical and content opportunities before turning them into execution plans.",
    points: ["Keyword gaps", "Authority opportunities", "AI visibility checks"],
  },
  pricing: {
    title: "Pricing",
    description: "Choose a workspace plan that matches the scale of your content and AI visibility work.",
    points: ["Solo workflows", "Growing teams", "Agency delivery"],
  },
  agents: {
    title: "Agents",
    description: "Coordinate AI-assisted workflows for content, media, SEO, and AEO operations.",
    points: ["Prompt research", "Content drafting", "Performance review"],
  },
} as const;

export type PublicMarketingSlug = keyof typeof pageContent;

export const publicMarketingSlugs = Object.keys(pageContent) as PublicMarketingSlug[];

export function PublicMarketingPage({ slug }: { slug: PublicMarketingSlug }) {
  const content = pageContent[slug];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-8 px-6 py-24">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">SoloSpider</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950 md:text-6xl">{content.title}</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">{content.description}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {content.points.map((point) => (
          <div key={point} className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800">
            {point}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          Start workspace
        </Link>
        <Link href="/app/en/dashboard" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900">
          Open app
        </Link>
      </div>
    </main>
  );
}
