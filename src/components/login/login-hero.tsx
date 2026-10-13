import Image from "next/image";

export function LoginHero() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[#1a0d08]">
      <Image
        className="object-cover object-[center_20%]"
        src="/login/hero.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/55 to-transparent" />
      <p className="absolute right-5 bottom-5 m-0 flex max-w-[300px] min-h-20 items-center gap-4 rounded-full border border-[#d7e4e0] bg-white px-4 py-4 text-base leading-snug text-[#1a1a1a]">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#e7f3f1] text-[#076458]" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M4 14 14 4M7 4h7v7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        Seu ponto com mais organização.
      </p>
    </div>
  );
}
