"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Smooth scroll
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  // Reveal animation on scroll
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.06 }
    );
    els.forEach((el) => {
      if (!el.classList.contains("in")) io.observe(el);
    });

    return () => {
      io.disconnect();
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-ink selection:bg-primary/20 selection:text-ink overflow-x-hidden font-sans"
      style={
        {
          "--bg": "#ffffff",
          "--bg-2": "#f8f6ff",
          "--panel": "#ffffff",
          "--line": "#e5e7eb",
          "--ink": "#000000",
          "--ink-2": "#0f172a",
          "--muted": "#334155",
        } as React.CSSProperties
      }
    >
      <MarketingNavbar />

      <main>
        {/* HERO */}
        <section className="relative pt-[90px] pb-[100px] bg-gradient-to-b from-white to-primary-tint">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute left-[-10%] top-[10%] w-[560px] h-[560px] rounded-full bg-[radial-gradient(circle,rgba(144,37,242,0.18)_0,transparent_65%)] blur-[20px]"></div>
            <div className="absolute right-[-10%] top-[30%] w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.14)_0,transparent_65%)] blur-[20px]"></div>
            <div className="absolute left-[30%] bottom-[-20%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.12)_0,transparent_65%)] blur-[20px]"></div>
            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1700px] h-[1700px] opacity-5" viewBox="-400 -400 800 800" fill="none" stroke="#9025F2" strokeWidth="0.6">
              <g id="spokes">
                {/* 24 radial spokes */}
                <line x1="0" y1="0" x2="0" y2="-380" />
                <line x1="0" y1="0" x2="98" y2="-367" />
                <line x1="0" y1="0" x2="190" y2="-329" />
                <line x1="0" y1="0" x2="269" y2="-269" />
                <line x1="0" y1="0" x2="329" y2="-190" />
                <line x1="0" y1="0" x2="367" y2="-98" />
                <line x1="0" y1="0" x2="380" y2="0" />
                <line x1="0" y1="0" x2="367" y2="98" />
                <line x1="0" y1="0" x2="329" y2="190" />
                <line x1="0" y1="0" x2="269" y2="269" />
                <line x1="0" y1="0" x2="190" y2="329" />
                <line x1="0" y1="0" x2="98" y2="367" />
                <line x1="0" y1="0" x2="0" y2="380" />
                <line x1="0" y1="0" x2="-98" y2="367" />
                <line x1="0" y1="0" x2="-190" y2="329" />
                <line x1="0" y1="0" x2="-269" y2="269" />
                <line x1="0" y1="0" x2="-329" y2="190" />
                <line x1="0" y1="0" x2="-367" y2="98" />
                <line x1="0" y1="0" x2="-380" y2="0" />
                <line x1="0" y1="0" x2="-367" y2="-98" />
                <line x1="0" y1="0" x2="-329" y2="-190" />
                <line x1="0" y1="0" x2="-269" y2="-269" />
                <line x1="0" y1="0" x2="-190" y2="-329" />
                <line x1="0" y1="0" x2="-98" y2="-367" />
              </g>
              {/* concentric rings */}
              <circle cx="0" cy="0" r="60" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="110" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="170" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="240" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="310" strokeWidth="0.5" />
              <circle cx="0" cy="0" r="380" strokeWidth="0.5" />
            </svg>
          </div>

          <div className="relative text-center max-w-[980px] mx-auto px-7">
            <span className="inline-flex items-center gap-2.5 py-1.5 px-4 rounded-full bg-primary/5 border border-primary/20 text-[13px] font-medium text-primary-2 hero-fade hero-d0">
              <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(144,37,242,0.65)] animate-pulse-gentle"></span>
              Now live — The AI marketing OS for agencies & creators
            </span>
            <h1 className="text-5xl md:text-[80px] leading-[1.05] my-7 hero-fade hero-d1">
              <span className="text-ink">Replace Your Entire</span><br />
              <span className="grad-text">Digital Marketing Team</span><br />
              <span className="text-ink">With One Tool</span>
            </h1>
            <p className="text-[20px] text-ink max-w-[760px] mx-auto mb-9 leading-relaxed hero-fade hero-d2">
              Solo Spider automates everything your marketing team does — blogs, social media, SEO, and AI search visibility. One subscription. No agency retainer. No hiring headache.
            </p>
            <div className="flex justify-center gap-3.5 flex-wrap mb-5.5 hero-fade hero-d3">
              <Link href="/signup" className="btn btn-grad">Start for Free →</Link>
              <Link href="#how" className="btn btn-ghost">See How It Works</Link>
            </div>
            <div className="flex justify-center gap-5.5 flex-wrap text-[13px] text-ink-2 hero-fade hero-d4">
              <span className="flex items-center gap-2">No credit card required</span>
              <span className="flex items-center gap-2 before:content-['·'] before:text-muted">Free plan available</span>
              <span className="flex items-center gap-2 before:content-['·'] before:text-muted">Set up in 5 minutes</span>
            </div>
          </div>

          {/* LOGOS */}
          <div className="pt-12 pb-7 border-t border-line mt-20">
            <div className="max-w-[1240px] mx-auto px-7">
              <div className="text-center text-[13px] text-muted mb-6 tracking-wide">
                Trusted by 2,000+ agencies, freelancers, and solo founders
              </div>
              <div className="flex justify-center items-center gap-12 flex-wrap text-ink-2 font-display font-semibold text-lg opacity-80">
                <span className="italic">Loomstack</span>
                <span>NORTHWIND</span>
                <span className="font-extrabold">PEAK CO</span>
                <span>◇ Lattice</span>
                <span className="tracking-[0.18em]">CIVIC</span>
                <span>● Pulse</span>
                <span className="italic">Modern</span>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="relative py-20 md:py-[130px] bg-bg-2" id="problem">
          <div className="max-w-[1240px] mx-auto px-7 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-15 items-center">
            <div className="reveal">
              <div className="mono text-pink mb-4">— The problem</div>
              <h2 className="text-4xl md:text-[60px] mb-6">
                You're paying for <span className="text-pink">6 tools</span><br />
                that should be <span className="grad-text">one.</span>
              </h2>
              <div className="text-[17px] text-ink-2 space-y-4">
                <p>The average digital marketer juggles Surfer SEO, Buffer, Canva, Ahrefs, a blog CMS, and a separate AI writing tool — spending ₹30,000–₹80,000 a month on subscriptions that barely talk to each other.</p>
                <p>That's before counting the hours lost copy-pasting between tools, briefing freelancers, chasing approvals, and manually posting content.</p>
                <p>Solo Spider was built to collapse the entire stack into a single, automated workflow — so you spend less time on the tools and more time on the work that actually grows your business.</p>
              </div>
            </div>
            <div className="relative flex flex-col items-center gap-5.5 p-10 bg-white border border-line rounded-3xl shadow-[0_30px_60px_-30px_rgba(14,12,26,0.1)] reveal d1">
              <div className="grid grid-cols-3 gap-3 w-full">
                {["Surfer SEO", "Buffer", "Canva", "Ahrefs", "Blog CMS", "ChatGPT"].map(tool => (
                  <div key={tool} className="relative p-3.5 border border-line rounded-xl bg-panel-2 text-center text-[13px] font-semibold text-ink-2 overflow-hidden after:content-[''] after:absolute after:left-2 after:right-2 after:top-1/2 after:h-[1.5px] after:bg-pink after:-rotate-12 after:shadow-[0_0_8px_rgba(236,72,153,0.45)]">
                    {tool}
                  </div>
                ))}
              </div>
              <div className="text-3xl text-primary">↓</div>
              <div className="px-7 py-4 bg-primary text-white rounded-xl font-extrabold font-display text-lg tracking-tight flex items-center gap-2.5 shadow-[0_14px_30px_-12px_rgba(144,37,242,0.5)]">
                <span className="w-2.5 h-2.5 rounded-full bg-white"></span>Solo Spider
              </div>
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="relative py-20 md:py-[130px] bg-white" id="audience">
          <div className="max-w-[1240px] mx-auto px-7">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— Who it's for</div>
              <h2 className="mb-[18px]">Built for Agencies.<br /><span className="grad-text">Priced for Solo Creators.</span></h2>
              <p className="text-[18px] text-ink-2 max-w-[660px] mx-auto">Solo Spider works whether you're running campaigns for 20 clients or building a brand entirely on your own.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative bg-white border border-primary/25 rounded-3xl p-10 lg:p-11 flex flex-col gap-4.5 overflow-hidden shadow-[0_20px_50px_-28px_rgba(14,12,26,0.1)] bg-gradient-to-b from-white to-primary-tint group reveal">
                <div className="absolute inset-0 bg-grad-soft opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {/* Simulated featured border gradient */}
                <div className="absolute inset-0 rounded-3xl p-[1.5px] bg-grad [mask-image:linear-gradient(#fff_0_0)] [mask-composite:exclude] pointer-events-none"></div>
                
                <div className="relative z-10">
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-primary text-white text-[12px] font-semibold border border-primary tracking-wide self-start mb-4">
                    For agencies
                  </span>
                  <h3 className="text-3xl font-extrabold tracking-tight leading-tight text-ink mb-4">Scale client work without scaling headcount.</h3>
                  <p className="text-[15px] text-ink-2 leading-relaxed mb-6">Most agencies hit a ceiling: to take on more clients, you need more people. Solo Spider breaks that ceiling. Automate content, social, and SEO delivery across every client account — from one dashboard.</p>
                  
                  <div className="flex flex-col gap-3 mb-8">
                    {[
                      "Manage 10+ client brands from a single workspace",
                      "Auto-generate blogs, captions, and social assets per client",
                      "Schedule and publish content without touching each platform",
                      "Deliver SEO audit reports clients actually understand",
                      "Show up in AI search results before your competitors do (AEO/GRO)",
                      "White-label reporting ready to send to clients"
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start text-[14.5px] text-ink">
                        <div className="shrink-0 w-[22px] h-[22px] rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-extrabold mt-0.5">✓</div>
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing" className="btn btn-grad self-start">Explore Agency Plan →</Link>
                </div>
              </div>

              <div className="relative bg-white border border-line rounded-3xl p-10 lg:p-11 flex flex-col gap-4.5 overflow-hidden shadow-[0_20px_50px_-28px_rgba(14,12,26,0.1)] group reveal d1">
                <div className="absolute inset-0 bg-grad-soft opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-primary-soft text-primary-2 text-[12px] font-semibold border border-primary/20 tracking-wide self-start mb-4">
                    For individuals
                  </span>
                  <h3 className="text-3xl font-extrabold tracking-tight leading-tight text-ink mb-4">Your entire marketing team. Just you.</h3>
                  <p className="text-[15px] text-ink-2 leading-relaxed mb-6">You're wearing every hat. Solo Spider makes that sustainable. Write blogs, post to social, fix your SEO, and grow your AI search visibility — without hiring anyone or subscribing to anything else.</p>
                  
                  <div className="flex flex-col gap-3 mb-8">
                    {[
                      "Publish blog posts without touching a CMS",
                      "Generate scroll-stopping social images and videos automatically",
                      "Fix SEO issues on your site with one click",
                      "Get found in ChatGPT, Gemini, and AI overview results",
                      "Plan and schedule a month of content in under an hour"
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 items-start text-[14.5px] text-ink">
                        <div className="shrink-0 w-[22px] h-[22px] rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-extrabold mt-0.5">✓</div>
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing" className="btn btn-ghost self-start mt-auto">Explore Solo Plan →</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="relative py-20 md:py-[130px] bg-bg-2" id="features">
          <div className="max-w-[1240px] mx-auto px-7">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— Everything included</div>
              <h2 className="mb-[18px]">Six Superpowers.<br /><span className="grad-text">One Subscription.</span></h2>
              <p className="text-[18px] text-ink-2 max-w-[660px] mx-auto">No integrations to configure. No freelancers to brief. No tool-switching. Everything works together because it lives in one place.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-white border border-line rounded-3xl p-9 flex flex-col gap-4.5 relative overflow-hidden transition-all duration-250 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(144,37,242,0.18)] shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal">
                <div className="absolute top-6 right-7 font-display text-6xl font-black text-primary opacity-10 leading-none">01</div>
                <div className="w-[54px] h-[54px] rounded-xl bg-primary-soft border border-primary/15 text-primary flex items-center justify-center text-2xl mb-2">✎</div>
                <div className="flex flex-col gap-1.5 relative z-10">
                  <span className="mono">Content & Blog Automation</span>
                  <h3 className="text-[28px] font-extrabold tracking-tight leading-tight text-ink">Write Less. Publish More.</h3>
                </div>
                <p className="text-[14.5px] text-ink-2 leading-relaxed">Solo Spider generates long-form, SEO-optimised blog posts in your brand voice — then schedules and publishes them automatically. You approve. It does everything else.</p>
                <div className="flex flex-col gap-2.5 mt-2 border-t border-line pt-4.5">
                  {[
                    "AI blog writing in your tone and niche",
                    "SEO keyword targeting built into every draft",
                    "One-click publish to your website or CMS",
                    "Blog scheduling — set dates, forget about it",
                    "Content calendar to plan weeks ahead"
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-[13.5px] text-ink-2">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-bold mt-0.5">→</div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-4.5 font-mono text-[12px] text-muted border-t border-dashed border-line tracking-wide">
                  ⏱ Avg. time to publish a 1,200-word blog: 8 minutes
                </div>
              </div>

              <div className="bg-white border border-line rounded-3xl p-9 flex flex-col gap-4.5 relative overflow-hidden transition-all duration-250 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(144,37,242,0.18)] shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal d1">
                <div className="absolute top-6 right-7 font-display text-6xl font-black text-primary opacity-10 leading-none">02</div>
                <div className="w-[54px] h-[54px] rounded-xl bg-[#fce7f3] border border-pink/20 text-pink flex items-center justify-center text-2xl mb-2">◐</div>
                <div className="flex flex-col gap-1.5 relative z-10">
                  <span className="mono text-pink">Social Media — End to End</span>
                  <h3 className="text-[28px] font-extrabold tracking-tight leading-tight text-ink">Plan It. Generate It. Post It. Automatically.</h3>
                </div>
                <p className="text-[14.5px] text-ink-2 leading-relaxed">From on-brand images and short-form videos to captions and hashtags — Solo Spider handles your entire social media presence without you logging into a single platform.</p>
                <div className="flex flex-col gap-2.5 mt-2 border-t border-line pt-4.5">
                  {[
                    "AI-generated social images (Instagram, LinkedIn, X, Facebook)",
                    "Short-form video creation from your blog or topic",
                    "Caption writing with platform-specific formatting",
                    "Post planning with AI content suggestions",
                    "Bulk scheduling across all platforms at once",
                    "Auto-posting — publishes on the schedule you set"
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-[13.5px] text-ink-2">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-[#fce7f3] text-pink flex items-center justify-center text-[11px] font-bold mt-0.5">→</div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-4.5 font-mono text-[12px] text-muted border-t border-dashed border-line tracking-wide">
                  📅 Plan and schedule a full month of social content in under 60 minutes
                </div>
              </div>

              <div className="bg-white border border-line rounded-3xl p-9 flex flex-col gap-4.5 relative overflow-hidden transition-all duration-250 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgba(144,37,242,0.18)] shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal">
                <div className="absolute top-6 right-7 font-display text-6xl font-black text-primary opacity-10 leading-none">03</div>
                <div className="w-[54px] h-[54px] rounded-xl bg-[#fef3c7] border border-[#f5b500]/30 text-[#b45309] flex items-center justify-center text-2xl mb-2">◇</div>
                <div className="flex flex-col gap-1.5 relative z-10">
                  <span className="mono !text-[#b45309]">SEO — Audit & Fix</span>
                  <h3 className="text-[28px] font-extrabold tracking-tight leading-tight text-ink">Find Every SEO Problem. Fix It Without a Developer.</h3>
                </div>
                <p className="text-[14.5px] text-ink-2 leading-relaxed">Solo Spider scans your entire website for SEO issues — broken tags, slow pages, missing meta descriptions, weak internal linking — then helps you fix them without touching code.</p>
                <div className="flex flex-col gap-2.5 mt-2 border-t border-line pt-4.5">
                  {[
                    "Full site SEO audit in minutes",
                    "Priority-ranked issue list (critical → low)",
                    "One-click fixes for common on-page errors",
                    "Meta title and description suggestions",
                    "Page speed and Core Web Vitals analysis",
                    "Ongoing monitoring — get alerts when new issues appear"
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-[13.5px] text-ink-2">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-[#fef3c7] text-[#b45309] flex items-center justify-center text-[11px] font-bold mt-0.5">→</div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-4.5 font-mono text-[12px] text-muted border-t border-dashed border-line tracking-wide">
                  ⚡ Most users fix their top 10 SEO issues in under 30 minutes
                </div>
              </div>

              <div className="bg-primary border border-transparent rounded-3xl p-9 flex flex-col gap-4.5 relative overflow-hidden transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_40px_70px_-22px_rgba(144,37,242,0.5)] shadow-[0_30px_60px_-22px_rgba(144,37,242,0.4)] reveal d1">
                <div className="absolute top-6 right-7 font-display text-6xl font-black text-white/20 leading-none">04</div>
                <div className="w-[54px] h-[54px] rounded-xl bg-white/15 text-white flex items-center justify-center text-2xl mb-2">✦</div>
                <div className="flex flex-col gap-1.5 relative z-10">
                  <span className="mono text-white/85">AEO & GRO — Be Found in AI Search</span>
                  <h3 className="text-[28px] font-extrabold tracking-tight leading-tight text-white">Google Is Changing. Your Visibility Strategy Should Too.</h3>
                </div>
                <p className="text-[14.5px] text-white/85 leading-relaxed">AI-powered search is here. ChatGPT, Gemini, and Google's AI Overviews are now answering questions directly — and most brands are invisible in those answers. Solo Spider helps you show up.</p>
                
                <div className="grid grid-cols-2 gap-3.5 bg-white/10 p-4.5 rounded-2xl border border-white/15 mt-2">
                  <div>
                    <div className="font-display font-bold text-[14px] text-white">AEO</div>
                    <div className="text-[12.5px] text-white/80 leading-relaxed mt-1">Answer Engine Optimisation — optimising your content to appear in AI answers.</div>
                  </div>
                  <div>
                    <div className="font-display font-bold text-[14px] text-pink">GRO</div>
                    <div className="text-[12.5px] text-white/80 leading-relaxed mt-1">Generative Result Optimisation — tracking visibility in AI search engines.</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-2 border-t border-white/15 pt-4.5">
                  {[
                    "Identify Content Drivers: Pinpoint which content assets drive your specific topics.",
                    "Create On-Brand AI Content: Tailor articles researched from grounding.",
                    "Brand-Aware Context: Considers your existing pages and brand tone.",
                    "Target Intelligence: Identify specific authors and publishers.",
                    "Value-First Media Pitch: Auto-formulate high-leverage pitches.",
                    "Earn Third-Party Media: Outlets AI models read.",
                    "Multi-Engine Analytics Tracking: Monitor brand visibility over time across ChatGPT, Gemini & Claude.",
                  ].map((item, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-[13.5px] text-white/95">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                        →
                      </div>
                      <span className="font-semibold text-white">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-4.5 font-mono text-[12px] text-white/70 border-t border-dashed border-white/15 tracking-wide">
                  📈 Early adopters are 5× more visible in AI search. Don't be last.
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="relative py-20 md:py-[130px] bg-white" id="how">
          <div className="max-w-[1240px] mx-auto px-7">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— How it works</div>
              <h2 className="mb-[18px]">From Setup to Running on<br /><span className="grad-text">Autopilot — in One Day.</span></h2>
              <p className="text-[18px] text-ink-2 max-w-[660px] mx-auto">You don't need a marketing degree, a developer, or a full team. Just connect your accounts and let Solo Spider do the rest.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              {[
                { num: "01", icon: "⊞", title: "Connect your channels", desc: "Link your website, social accounts, and any existing CMS. Solo Spider pulls in your brand voice, existing content, and target audience automatically." },
                { num: "02", icon: "◎", title: "Set your goals", desc: "Tell Solo Spider what you want to achieve — more blog traffic, stronger social presence, better rankings, or AI search visibility. It builds your content strategy around your goals.", delay: "d1" },
                { num: "03", icon: "✓", title: "Review and approve", desc: "Solo Spider generates your blogs, social posts, and SEO fixes. You review, tweak if you like, and hit approve. Or set it to fully auto — your call.", delay: "d2" },
                { num: "04", icon: "↗", title: "Watch it run", desc: "Content goes live. Posts publish. SEO improves. AI search visibility grows. You get weekly reports showing exactly what's working — and what Solo Spider is doing about what isn't.", delay: "d3" }
              ].map((step, i) => (
                <div key={i} className={`bg-white border border-line rounded-2xl p-7 lg:p-8 flex flex-col gap-3.5 transition-all duration-250 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_22px_44px_-22px_rgba(144,37,242,0.2)] shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal ${step.delay || ''}`}>
                  <span className="font-mono text-[13px] text-muted tracking-wider">{step.num}</span>
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center text-[22px] mb-1">{step.icon}</div>
                  <h4 className="font-display text-[20px] font-bold tracking-tight text-ink">{step.title}</h4>
                  <p className="text-[14px] text-ink-2">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NUMBERS */}
        <section className="relative py-20 md:py-[130px] bg-bg-2 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] bg-[radial-gradient(circle,rgba(144,37,242,0.06)_0,transparent_60%)] pointer-events-none"></div>
          <div className="max-w-[1240px] mx-auto px-7 relative z-10">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— By the numbers</div>
              <h2 className="mb-[18px]">Real Results.<br /><span className="grad-text">Not Marketing Fluff.</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line rounded-3xl overflow-hidden shadow-[0_30px_60px_-30px_rgba(14,12,26,0.1)]">
              {[
                { v: "10×", l: "Faster content production vs. doing it manually." },
                { v: "6 tools", l: "Replaced by a single Solo Spider subscription.", d: "d1" },
                { v: "80%", l: "Reduction in time spent on repetitive marketing tasks.", d: "d2" },
                { v: "5 mins", l: "Average setup time to publish your first blog." },
                { v: "₹40k+", l: "Avg. monthly tool cost replaced by one Solo Spider plan.", d: "d1" },
                { v: "2,000+", l: "Agencies and creators already using Solo Spider.", d: "d2" }
              ].map((num, i) => (
                <div key={i} className={`bg-white p-8 lg:p-12 flex flex-col gap-2.5 reveal ${num.d || ''}`}>
                  <div className="font-display font-black text-5xl lg:text-[64px] leading-none tracking-tight text-primary">{num.v}</div>
                  <div className="text-[14.5px] text-ink-2 leading-relaxed">{num.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="relative py-20 md:py-[130px] bg-white">
          <div className="max-w-[1240px] mx-auto px-7">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— vs. the old way</div>
              <h2 className="mb-[18px]">Stop Paying for a Stack.<br /><span className="grad-text">Start Using a System.</span></h2>
              <p className="text-[18px] text-ink-2 max-w-[660px] mx-auto">Here's what Solo Spider replaces — and what none of those tools can do together.</p>
            </div>

            <div className="hidden lg:block bg-white border border-line rounded-3xl overflow-hidden shadow-[0_30px_60px_-30px_rgba(14,12,26,0.08)] reveal">
              <div className="grid grid-cols-[1.6fr_repeat(6,1fr)] items-center bg-gradient-to-b from-primary-tint to-white border-b border-line">
                <div className="py-4.5 px-6 font-display font-bold text-[13px] text-ink text-left border-r border-line">Capability</div>
                <div className="py-4.5 px-4 font-display font-extrabold text-[14px] text-white bg-primary text-center border-r border-line">Solo Spider</div>
                <div className="py-4.5 px-4 font-display font-bold text-[13px] text-ink-2 text-center border-r border-line">Surfer SEO</div>
                <div className="py-4.5 px-4 font-display font-bold text-[13px] text-ink-2 text-center border-r border-line">Buffer</div>
                <div className="py-4.5 px-4 font-display font-bold text-[13px] text-ink-2 text-center border-r border-line">Canva Pro</div>
                <div className="py-4.5 px-4 font-display font-bold text-[13px] text-ink-2 text-center border-r border-line">Ahrefs</div>
                <div className="py-4.5 px-4 font-display font-bold text-[13px] text-ink-2 text-center">ChatGPT</div>
              </div>
              
              {[
                { name: "Blog writing & publishing", vals: ["✓", "—", "—", "—", "—", "Partial"] },
                { name: "Blog scheduling", vals: ["✓", "—", "—", "—", "—", "—"] },
                { name: "Social image generation", vals: ["✓", "—", "—", "✓", "—", "—"] },
                { name: "Social video generation", vals: ["✓", "—", "—", "Partial", "—", "—"] },
                { name: "Social scheduling & posting", vals: ["✓", "—", "✓", "—", "—", "—"] },
                { name: "SEO audit & fixes", vals: ["✓", "✓", "—", "—", "✓", "—"] },
                { name: "AEO analysis", vals: ["✓", "—", "—", "—", "—", "—"] },
                { name: "GRO / AI search visibility", vals: ["✓", "—", "—", "—", "—", "—"] },
                { name: "All-in-one dashboard", vals: ["✓", "—", "—", "—", "—", "—"] },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-[1.6fr_repeat(6,1fr)] items-center border-b border-line last:border-b-0 even:bg-bg-2" role="row">
                  <div className="py-4.5 px-6 font-semibold text-[13.5px] text-ink border-r border-line">{row.name}</div>
                  <div className="py-4.5 px-4 text-center border-r border-line bg-primary-tint font-bold text-primary text-[18px]">
                    {row.vals[0] === "✓" ? "✓" : <span className="text-[11.5px] font-semibold bg-[#fef3c7] text-[#b45309] px-2 py-1 rounded-md">{row.vals[0]}</span>}
                  </div>
                  {row.vals.slice(1).map((val, j) => (
                    <div key={j} className="py-4.5 px-4 text-center border-r border-line last:border-r-0">
                      {val === "✓" ? <span className="text-primary font-extrabold text-[18px]">✓</span> : val === "—" ? <span className="text-[#c4c4d1] text-[18px]">—</span> : <span className="text-[11.5px] font-semibold bg-[#fef3c7] text-[#b45309] px-2 py-1 rounded-md">{val}</span>}
                    </div>
                  ))}
                </div>
              ))}
              
              <div className="grid grid-cols-[1.6fr_repeat(6,1fr)] items-center bg-bg-2 font-semibold">
                <div className="py-4.5 px-6 text-[13.5px] text-ink border-r border-line">Typical monthly cost</div>
                <div className="py-4.5 px-4 text-center border-r border-line bg-primary-tint text-primary text-[13.5px]">₹X,XXX</div>
                <div className="py-4.5 px-4 text-center border-r border-line text-ink-2 text-[13.5px]">₹8,000+</div>
                <div className="py-4.5 px-4 text-center border-r border-line text-ink-2 text-[13.5px]">₹3,500+</div>
                <div className="py-4.5 px-4 text-center border-r border-line text-ink-2 text-[13.5px]">₹2,000+</div>
                <div className="py-4.5 px-4 text-center border-r border-line text-ink-2 text-[13.5px]">₹15,000+</div>
                <div className="py-4.5 px-4 text-center text-ink-2 text-[13.5px]">₹1,600+</div>
              </div>
            </div>

            {/* Mobile Fallback */}
            <div className="grid lg:hidden gap-4 reveal">
              <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_14px_30px_-22px_rgba(14,12,26,0.08)]">
                <h4 className="font-display font-bold text-[16px] mb-3 grad-text">Solo Spider replaces all five</h4>
                {[
                  "Blog writing & publishing", "Blog scheduling", "Social image generation",
                  "Social video generation", "Social scheduling & posting", "SEO audit & fixes",
                  "AEO analysis", "GRO / AI search visibility", "All-in-one dashboard"
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2 text-[13px] border-b border-dashed border-line last:border-b-0">
                    <span className="text-ink">{item}</span>
                    <span className="text-primary font-bold">✓</span>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-line rounded-2xl p-5 shadow-[0_14px_30px_-22px_rgba(14,12,26,0.08)]">
                <h4 className="font-display font-bold text-[16px] mb-3 text-ink">What you'd pay for the stack</h4>
                {[
                  { n: "Surfer SEO", p: "₹8,000+" },
                  { n: "Buffer", p: "₹3,500+" },
                  { n: "Canva Pro", p: "₹2,000+" },
                  { n: "Ahrefs", p: "₹15,000+" },
                  { n: "ChatGPT", p: "₹1,600+" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between py-2 text-[13px] border-b border-dashed border-line last:border-b-0 text-ink-2">
                    <span className="text-ink">{item.n}</span>
                    <span>{item.p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-muted text-[13px] mt-4.5 reveal">Prices approximate. Solo Spider replaces all five — for less than the cost of one.</div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="relative py-20 md:py-[130px] bg-bg-2 overflow-hidden">
          <div className="absolute right-[-200px] top-0 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(144,37,242,0.07)_0,transparent_65%)] pointer-events-none"></div>
          <div className="max-w-[1240px] mx-auto px-7 relative z-10">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— What people are saying</div>
              <h2 className="mb-[18px]">Agencies and Creators<br /><span className="grad-text">Who Made the Switch.</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { q: `"We cancelled Surfer, Buffer, and Canva in the same week. Solo Spider does everything they did — faster, cheaper, and without three different logins."`, a: "PM", n: "Priya M.", r: "Founder, digital content agency · Mumbai" },
                { q: `"I'm a solopreneur running a D2C brand. Before Solo Spider, marketing took 3 hours a day. Now it takes 20 minutes. I genuinely don't know how I did it without this."`, a: "RD", n: "Rahul D.", r: "Founder · Ahmedabad", d: "d1" },
                { q: `"I use Solo Spider for 6 clients. The content quality is good enough that two clients thought I'd hired a writer. I hadn't — I just had the right tool."`, a: "SK", n: "Sneha K.", r: "Freelance digital marketer · Bengaluru" },
                { q: `"The AEO and GRO features alone are worth the subscription. No other tool even tracks AI search visibility. We're way ahead of our competitors because of it."`, a: "AT", n: "Arjun T.", r: "Head of Growth, SaaS startup · Pune", d: "d1" }
              ].map((test, i) => (
                <div key={i} className={`bg-white border border-line rounded-2xl p-8 lg:p-9 flex flex-col gap-5 transition-colors duration-250 hover:border-primary/30 shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal ${test.d || ''}`}>
                  <div className="flex gap-0.5 text-yellow text-[15px]">★★★★★</div>
                  <p className="text-[17px] text-ink font-medium leading-relaxed">
                    {test.q}
                  </p>
                  <div className="flex items-center gap-3.5 pt-4.5 border-t border-line mt-auto">
                    <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-display font-extrabold text-[18px] shrink-0">
                      {test.a}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[14.5px] text-ink">{test.n}</span>
                      <span className="text-[12.5px] text-muted">{test.r}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="relative py-20 md:py-[130px] bg-white" id="pricing">
          <div className="max-w-[1240px] mx-auto px-7">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— Pricing</div>
              <h2 className="mb-[18px]">One Price.<br /><span className="grad-text">Everything Included.</span></h2>
              <p className="text-[18px] text-ink-2 max-w-[660px] mx-auto">No feature gating. No per-seat pricing surprises. Pick the plan that fits your volume and get access to every single Solo Spider capability.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              
              <div className="bg-white border border-line rounded-3xl p-8 lg:p-9 flex flex-col gap-5 transition-all duration-250 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_26px_50px_-22px_rgba(144,37,242,0.18)] shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal relative">
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary">Free forever</span>
                <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Starter</h3>
                <div className="text-[13px] text-muted">For solo creators just getting started</div>
                <div className="font-display font-black text-[54px] leading-none tracking-tight text-ink mt-2">₹0<small className="text-[14px] font-medium text-muted tracking-normal ml-1.5 font-sans">/month</small></div>
                <div className="flex flex-col gap-2.5 text-[14px] text-ink-2 border-t border-line pt-5 mt-2">
                  {["5 blog posts/month", "20 social posts/month", "Basic SEO audit (1 website)", "AEO insights (limited)", "1 connected social account"].map((f, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-bold mt-0.5">✓</div>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" className="btn btn-ghost w-full justify-center mt-auto pt-6">Get started free →</Link>
              </div>

              <div className="bg-gradient-to-b from-white to-primary-tint rounded-3xl p-8 lg:p-9 flex flex-col gap-5 transition-all duration-250 hover:-translate-y-1 shadow-[0_30px_60px_-22px_rgba(144,37,242,0.3)] reveal d1 relative">
                <div className="absolute inset-0 rounded-3xl p-[1.5px] bg-grad [mask-image:linear-gradient(#fff_0_0)] [mask-composite:exclude] pointer-events-none"></div>
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white font-display font-extrabold text-[11px] tracking-widest uppercase px-3.5 py-1.5 rounded-lg z-10">Most popular</span>
                
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary relative z-10">Most popular for solo creators</span>
                <h3 className="font-display text-[22px] font-bold tracking-tight text-ink relative z-10">Solo</h3>
                <div className="text-[13px] text-muted relative z-10">For founders, freelancers & creators</div>
                <div className="font-display font-black text-[54px] leading-none tracking-tight text-primary mt-2 relative z-10">₹X,XXX<small className="text-[14px] font-medium text-muted tracking-normal ml-1.5 font-sans">/month</small></div>
                <div className="flex flex-col gap-2.5 text-[14px] text-ink-2 border-t border-line pt-5 mt-2 relative z-10">
                  {["Unlimited blog posts", "Unlimited social content", "Full SEO audit + auto-fix", "AEO & GRO dashboard", "5 social accounts", "Priority support"].map((f, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-primary text-white flex items-center justify-center text-[11px] font-bold mt-0.5">✓</div>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" className="btn btn-grad w-full justify-center mt-auto relative z-10">Start Solo plan →</Link>
              </div>

              <div className="bg-white border border-line rounded-3xl p-8 lg:p-9 flex flex-col gap-5 transition-all duration-250 hover:border-primary/30 hover:-translate-y-1 hover:shadow-[0_26px_50px_-22px_rgba(144,37,242,0.18)] shadow-[0_14px_40px_-28px_rgba(14,12,26,0.1)] reveal d2 relative">
                <span className="font-mono text-[11px] uppercase tracking-widest text-primary">Best for teams & client work</span>
                <h3 className="font-display text-[22px] font-bold tracking-tight text-ink">Agency</h3>
                <div className="text-[13px] text-muted">For agencies running 10+ clients</div>
                <div className="font-display font-black text-[54px] leading-none tracking-tight text-ink mt-2">₹X,XXX<small className="text-[14px] font-medium text-muted tracking-normal ml-1.5 font-sans">/month</small></div>
                <div className="flex flex-col gap-2.5 text-[14px] text-ink-2 border-t border-line pt-5 mt-2">
                  {["Everything in Solo", "25+ client workspaces", "White-label reports", "Bulk content scheduling", "Team collaboration tools", "Dedicated onboarding call"].map((f, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <div className="shrink-0 w-[18px] h-[18px] rounded-full bg-primary-soft text-primary flex items-center justify-center text-[11px] font-bold mt-0.5">✓</div>
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" className="btn btn-ghost w-full justify-center mt-auto pt-6">Talk to us →</Link>
              </div>

            </div>

            <div className="text-center mt-9 text-muted text-[14px] leading-relaxed reveal">
              All plans include a <strong className="text-ink">14-day free trial</strong>. No credit card required.<br />
              Annual billing saves <strong className="text-[#67e8f9]">30%</strong>.
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-20 md:py-[130px] bg-bg-2">
          <div className="max-w-[1240px] mx-auto px-7">
            <div className="text-center max-w-[820px] mx-auto mb-[72px] reveal">
              <div className="mono text-primary mb-[18px]">— Common questions</div>
              <h2 className="mb-[18px]">Everything You Want to Know<br /><span className="grad-text">Before You Sign Up.</span></h2>
            </div>
            
            <div className="max-w-[880px] mx-auto flex flex-col gap-3.5">
              {[
                { q: "Do I need any technical skills to use Solo Spider?", a: "Not at all. Solo Spider is designed to be used without any coding or technical knowledge. If you can use Gmail, you can use Solo Spider. Setup takes under 5 minutes." },
                { q: "Will the content actually sound like me?", a: "Yes. Solo Spider learns your brand voice from your existing content, website, and the preferences you set during onboarding. You can always edit and refine drafts before publishing — but most users find they barely need to." },
                { q: "What platforms does Solo Spider post to?", a: "Instagram, LinkedIn, X (Twitter), Facebook, and more. Blog publishing works with WordPress, Webflow, Wix, and custom CMS setups via API." },
                { q: "What's AEO and GRO — do I really need it?", a: "AEO (Answer Engine Optimisation) and GRO (Generative Result Optimisation) help you appear in AI-generated search results — like Google's AI Overviews, ChatGPT, and Gemini answers. AI search is growing rapidly. Brands that optimise for it now will have a significant advantage. Yes, you need it." },
                { q: "How is Solo Spider different from just using ChatGPT?", a: "ChatGPT can write — but it can't publish, schedule, audit, post, or track your SEO and AI visibility. Solo Spider wraps powerful AI writing with an end-to-end marketing workflow. It's the difference between having an ingredient and having a meal." },
                { q: "Can I manage multiple clients or brands?", a: "Yes. The Agency plan supports 25+ separate client workspaces, each with their own brand settings, content calendars, and reports. You can manage everything without ever logging out." },
                { q: "Is there a free trial?", a: "Yes — every paid plan comes with a 14-day free trial. No credit card required. You can also use the Starter plan for free, forever." },
              ].map((faq, i) => (
                <div key={i} className={`bg-white border border-line rounded-2xl overflow-hidden transition-colors duration-250 hover:border-primary/20 shadow-[0_8px_24px_-18px_rgba(14,12,26,0.08)] reveal ${openFaq === i ? 'border-primary/20' : ''}`}>
                  <button 
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex justify-between items-center gap-4.5 p-5 lg:px-6 lg:py-5 text-left font-display font-semibold text-[18px] text-ink"
                  >
                    <span>{faq.q}</span>
                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[14px] transition-all duration-250 ${openFaq === i ? 'bg-primary text-white rotate-45 border border-transparent' : 'bg-primary-soft text-primary border border-primary/15'}`}>+</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-350 ease-in-out ${openFaq === i ? 'max-h-[340px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 pt-4 border-t border-line text-[15px] text-ink-2 leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative bg-white overflow-hidden py-20 md:py-[130px]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1300px] h-[800px] bg-[radial-gradient(ellipse,rgba(144,37,242,0.08)_0,transparent_60%)] pointer-events-none"></div>
          <div className="max-w-[1240px] mx-auto px-7 relative z-10">
            <div className="relative text-center max-w-[920px] mx-auto py-12 md:py-20 px-6 md:px-10 bg-gradient-to-b from-white to-primary-tint rounded-[32px] overflow-hidden shadow-[0_40px_80px_-30px_rgba(144,37,242,0.2)] reveal">
              <div className="absolute inset-0 rounded-[32px] p-[1.5px] bg-grad [mask-image:linear-gradient(#fff_0_0)] [mask-composite:exclude] pointer-events-none"></div>
              
              <div className="mono text-[#22d3ee] mb-3.5">— Ready to switch?</div>
              <h2 className="text-4xl md:text-[64px] leading-[1.05] mb-6">
                Fire Your Marketing Stack.<br />
                <span className="grad-text">Keep the Results.</span>
              </h2>
              <p className="text-[18px] text-ink-2 mb-9 max-w-[680px] mx-auto">
                Join 2,000+ agencies and creators who replaced their entire digital marketing workflow with Solo Spider. Less cost. Less complexity. More output.
              </p>
              
              <div className="flex justify-center gap-3.5 flex-wrap mb-9">
                <Link href="/signup" className="btn btn-grad">Start Free — No Card Needed →</Link>
                <Link href="/signup" className="btn btn-ghost">Book a 20-Minute Demo</Link>
              </div>
              
              <div className="flex justify-center flex-wrap gap-x-8 gap-y-4 text-[13.5px] text-ink-2">
                <span className="flex items-center gap-2"><span className="text-primary font-extrabold">✓</span>Free plan available, always</span>
                <span className="flex items-center gap-2"><span className="text-primary font-extrabold">✓</span>14-day trial on all paid plans</span>
                <span className="flex items-center gap-2"><span className="text-primary font-extrabold">✓</span>Cancel anytime, no questions asked</span>
                <span className="flex items-center gap-2"><span className="text-primary font-extrabold">✓</span>Setup in under 5 minutes</span>
                <span className="flex items-center gap-2"><span className="text-primary font-extrabold">✓</span>Used by 2,000+ marketers across India</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      <MarketingFooter />
    </div>
  );
}
