import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";

const navItems = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Why Join", href: "#why-join" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQs", href: "#faqs" },
];

const services = [
  "Playing-time session creation",
  "Table availability tracking",
  "Repeat customer list",
  "Pending amount calculation",
  "Revenue and analytics reports",
  "Owner dashboard for daily operations",
];

const reasons = [
  {
    title: "Know every active table",
    copy: "Track session time, table status, customer name, and running amount from one clean screen.",
  },
  {
    title: "Recover pending payments",
    copy: "Keep customer dues visible so owners and staff can settle balances without manual notebooks.",
  },
  {
    title: "Grow with repeat customers",
    copy: "See returning players, total visits, and spending patterns before planning offers or memberships.",
  },
];

const testimonials = [
  {
    quote:
      "We stopped calculating table time manually. The pending amount view alone saves our staff hours every week.",
    name: "Amit S.",
    role: "Pool lounge owner",
  },
  {
    quote:
      "The dashboard is simple enough for counter staff and detailed enough for me to check revenue every evening.",
    name: "Riya M.",
    role: "Snooker club manager",
  },
  {
    quote:
      "Repeat customer history helped us identify our regular players and create better weekday offers.",
    name: "Naveen K.",
    role: "Cue sports cafe founder",
  },
];

const faqs = [
  {
    question: "Can I manage both pool and snooker tables?",
    answer:
      "Yes. The CRM is built for venues that run pool, snooker, or a mix of cue-sports tables.",
  },
  {
    question: "Does it calculate pending customer amount?",
    answer:
      "Yes. Each session can contribute to a customer balance so owners can see dues and collected revenue clearly.",
  },
  {
    question: "Is it useful for repeat customers?",
    answer:
      "Yes. Customer history helps you see visits, spending, pending amount, and loyalty opportunities.",
  },
  {
    question: "Can staff use it on mobile?",
    answer:
      "Yes. The landing page and app shell are responsive, and the PWA setup lets supported browsers install it.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="CueDesk home">
            <span className="grid size-9 place-items-center rounded-lg border border-zinc-200 bg-zinc-950 text-sm font-semibold text-white">
              CD
            </span>
            <span className="text-base font-semibold tracking-normal">CueDesk CRM</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-zinc-950">
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-[#3195EF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Try Our Free Tier
            </Link>
          </div>

          <MobileNav items={navItems} />
        </nav>
      </header>

      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-18">
          <div className="max-w-2xl">
            <p className="section-kicker">CRM for pool and snooker table owners</p>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-5xl lg:text-6xl">
              Run every table, session, customer, and payment from one simple dashboard.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-600 sm:text-lg">
              CueDesk helps owners manage playing-time sessions, table usage, repeat customers,
              pending balances, analytics, and daily revenue without spreadsheet chaos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-md bg-[#3195EF] px-6 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Try Our Free Tier
              </Link>
              <a
                href="#services"
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm font-semibold text-zinc-800 transition hover:border-zinc-950"
              >
                View Services
              </a>
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-2xl font-semibold text-zinc-950">24/7</p>
                <p className="mt-1 text-zinc-500">session tracking</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950">1 view</p>
                <p className="mt-1 text-zinc-500">for all tables</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-950">0 logs</p>
                <p className="mt-1 text-zinc-500">lost on paper</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-zinc-100" />
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl shadow-zinc-200/80">
              <Image
                src="/pool-crm-dashboard.png"
                alt="CueDesk CRM dashboard preview for table sessions and revenue analytics"
                width={1568}
                height={1003}
                priority
                className="h-auto w-full rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="section-kicker">About us</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Built for venues where every minute matters.
            </h2>
          </div>
          <p className="text-base leading-8 text-zinc-600 sm:text-lg">
            CueDesk is a focused CRM dashboard for pool and snooker businesses. It gives
            owners a clear operating layer for customer sessions, table usage, pending amount,
            repeat visits, and revenue performance so the counter team can move faster and the
            owner can make better decisions.
          </p>
        </div>
      </section>

      <section id="services" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="section-kicker">What services we provide</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              The daily workflow of your cue-sports business, organized.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service} className="rounded-lg border border-zinc-200 bg-white p-6">
                <div className="mb-5 h-1 w-10 rounded-full bg-[#3195EF]" />
                <h3 className="text-lg font-semibold text-zinc-950">{service}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  Keep this operation visible, searchable, and ready for fast decisions during
                  busy playing hours.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-join" className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="section-kicker">Why join us</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
                Less counter confusion, more owner control.
              </h2>
            </div>
            <div className="grid gap-4">
              {reasons.map((reason) => (
                <div key={reason.title} className="rounded-lg border border-zinc-200 bg-white p-6">
                  <h3 className="text-xl font-semibold">{reason.title}</h3>
                  <p className="mt-3 leading-7 text-zinc-600">{reason.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="section-kicker">What our clients talk about us</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Owners trust simple tools that work during peak hours.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {testimonials.map((item) => (
              <figure key={item.name} className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
                <blockquote className="text-base leading-7 text-zinc-700">
                  &quot;{item.quote}&quot;
                </blockquote>
                <figcaption className="mt-6">
                  <p className="font-semibold text-zinc-950">{item.name}</p>
                  <p className="text-sm text-zinc-500">{item.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="faqs" className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="section-kicker">FAQs</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-normal sm:text-4xl">
              Questions before you start.
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {faqs.map((faq) => (
              <details key={faq.question} className="group p-6">
                <summary className="cursor-pointer list-none text-base font-semibold text-zinc-950">
                  <span className="flex items-center justify-between gap-5">
                    {faq.question}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-zinc-300 text-zinc-500 group-open:hidden">
                      +
                    </span>
                    <span className="hidden size-7 shrink-0 place-items-center rounded-full border border-zinc-300 text-zinc-500 group-open:grid">
                      -
                    </span>
                  </span>
                </summary>
                <p className="mt-4 max-w-2xl leading-7 text-zinc-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-base font-semibold text-zinc-950">CueDesk CRM</p>
            <p className="mt-1 text-sm text-zinc-500">
              Minimal CRM for pool and snooker table businesses.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-zinc-950">
                {item.label}
              </a>
            ))}
            <Link href="/login" className="font-semibold text-zinc-950">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
