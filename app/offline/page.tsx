import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 text-zinc-950">
      <section className="w-full max-w-md rounded-2xl border border-[#337418]/20 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#337418]/10 text-xl font-extrabold text-[#337418]">
          CD
        </div>
        <h1 className="mt-5 text-2xl font-extrabold">You are offline</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          CueDesk can still open cached screens, but fresh sessions and payments need a network
          connection.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#337418] px-5 text-sm font-extrabold text-white"
        >
          Try Dashboard
        </Link>
      </section>
    </main>
  );
}
