import Link from 'next/link';
import { ArrowRight, BookOpen, DatabaseZap, Sparkles } from 'lucide-react';

const guideCards = [
  {
    title: 'Project Overview',
    description: 'See how the client, server module, bindings, and docs fit together.',
    href: '/docs/project-overview',
    icon: Sparkles,
  },
  {
    title: 'Developer Guide',
    description: 'Follow the local workflow, scripts, and edit loop without guessing.',
    href: '/docs/development',
    icon: DatabaseZap,
  },
  {
    title: 'Quickstart',
    description: 'Start the repo locally and get the module watcher running.',
    href: '/docs/spacetimedb/quickstart',
    icon: BookOpen,
  },
];

export default function HomePage() {
  return (
    <main className="gb-home relative isolate flex min-h-[calc(100dvh-4rem)] flex-1 overflow-hidden">
      <div className="gb-skyline" aria-hidden="true" />
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:py-16">
        <section className="relative z-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-100/70 px-3 py-1 text-sm font-medium text-amber-950 shadow-sm shadow-amber-900/10 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
            <BookOpen className="size-4" />
            Gunbound repo documentation
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] text-neutral-950 sm:text-5xl lg:text-6xl dark:text-white">
            Understand how the Gunbound repo works before you touch it.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-700 sm:text-lg dark:text-neutral-300">
            Practical notes for the Next.js client, the SpacetimeDB module, generated bindings,
            docs, and the development flow around them.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/docs"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-lg shadow-neutral-950/20 transition hover:-translate-y-0.5 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:bg-white dark:text-neutral-950 dark:hover:bg-amber-100"
            >
              Open docs
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs/spacetimedb/quickstart"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-950/10 bg-white/75 px-5 text-sm font-semibold text-neutral-950 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Start quickstart
            </Link>
          </div>
        </section>

        <section className="relative min-h-[360px] lg:min-h-[520px]" aria-label="Gunbound docs preview">
          <div className="gb-terrain absolute inset-x-0 bottom-0 h-40 rounded-t-[48px]" />
          <div
            className="gb-mobile-sprite gb-mobile-sprite--frog absolute bottom-20 left-2 sm:bottom-20 lg:left-0"
            role="img"
            aria-label="Animated Gunbound frog mobile"
          />
          <div
            className="gb-mobile-sprite gb-mobile-sprite--trico absolute bottom-24 right-0 sm:bottom-24"
            role="img"
            aria-label="Animated Gunbound Trico mobile"
          />
          <div
            className="gb-mobile-sprite gb-mobile-sprite--aduko absolute bottom-8 left-1/2"
            role="img"
            aria-label="Animated Gunbound Aduko mobile"
          />
          <div className="gb-shot absolute right-[28%] top-20 h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_28px_8px_rgba(251,191,36,0.55)]" />
        </section>
      </div>

      <div className="absolute inset-x-0 bottom-5 z-10 mx-auto grid w-[min(1120px,calc(100%-2rem))] grid-cols-1 gap-3 lg:grid-cols-3">
        {guideCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-lg border border-white/60 bg-white/80 p-4 shadow-lg shadow-neutral-950/10 backdrop-blur transition hover:-translate-y-1 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:border-white/10 dark:bg-neutral-950/70 dark:hover:bg-neutral-900"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                <Icon className="size-5" />
              </div>
              <h2 className="text-base font-bold text-neutral-950 dark:text-white">{card.title}</h2>
              <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
