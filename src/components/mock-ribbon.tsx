export function Ribbon({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="rounded-2xl border border-gold/50 bg-[#FFF7E0] p-6">
      <span className="rounded bg-gold/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#7A5C14]">
        Preview feature · fully interactive on dummy data
      </span>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">{title}</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-ink/70">{blurb}</p>
    </div>
  );
}
