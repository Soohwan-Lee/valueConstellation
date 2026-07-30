export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="display text-[32px] leading-[1.2] font-medium">
        Value Constellation
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        Paste a meeting transcript to map where each participant stands.
      </p>
      <div className="mt-8 rounded-[8px] border border-[var(--hairline)] bg-[var(--surface)] p-4">
        <p className="text-[13px] text-[var(--muted)]">
          Transcript input lands here next.
        </p>
      </div>
    </main>
  )
}
