const developers = [
  {
    name: "Tama Studio",
    role: "Product & Engineering",
    logo: "https://i.postimg.cc/XJvGhxHV/tama-studio-logo-new.jpg",
  },
  {
    name: "PD Nur Cahaya",
    role: "Partner Pengembang",
    logo: "https://i.postimg.cc/Vv2xrjKJ/pd-nur-cahaya-logo.jpg",
  },
];

export default function DeveloperSection() {
  return (
    <section id="pengembang" className="mx-auto max-w-6xl px-5 py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-mint">
        Di balik layar
      </p>
      <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold text-paper sm:text-4xl">
        Dikembangkan oleh
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {developers.map((d) => (
          <div
            key={d.name}
            className="flex items-center gap-4 rounded-card border border-ink-line bg-ink-soft p-6"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.logo}
              alt={`Logo ${d.name}`}
              className="h-14 w-14 rounded-md object-cover"
            />
            <div>
              <p className="font-display text-lg font-semibold text-paper">
                {d.name}
              </p>
              <p className="font-mono text-sm text-paper-faint">{d.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
