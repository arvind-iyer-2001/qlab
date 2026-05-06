export function InterviewerCTA() {
  if (process.env.NEXT_PUBLIC_QLAB_HIRING_CTA !== '1') return null
  return (
    <section className="bg-zinc-950 py-16 border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mb-2">
            for interviewers
          </p>
          <p className="text-xl text-white">Hiring q devs?</p>
          <p className="text-zinc-400 text-sm mt-1">
            Build a private problem set and shortlist from real solve times.
          </p>
        </div>
        <a
          href="mailto:hello@qlab.dev?subject=Private%20problem%20set"
          className="px-5 py-3 rounded-md border border-zinc-700 text-zinc-200 font-mono text-sm hover:border-zinc-500 transition"
        >
          Get in touch →
        </a>
      </div>
    </section>
  )
}
