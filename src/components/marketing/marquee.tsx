const ITEMS = [
  "15 секунд",
  "30 секунд",
  "45 секунд",
  "хук → проблема → демо → CTA",
  "суфлёр в камеру",
  "твои рилсы, не чужие шаблоны",
];

export function Marquee() {
  const loop = [...ITEMS, ...ITEMS];

  return (
    <div className="overflow-hidden border-y border-ink/10 bg-ink py-4 text-cream">
      <div className="animate-marquee-x flex w-max items-center gap-8 whitespace-nowrap will-change-transform">
        {loop.map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-8">
            <span className="font-display text-[0.98rem] font-semibold uppercase tracking-[-0.02em]">
              {item}
            </span>
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          </span>
        ))}
      </div>
    </div>
  );
}
