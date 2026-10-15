export function LoginHero() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[#e7f3f1]">
      <div className="absolute inset-0 flex items-center justify-center p-8 pb-28">
        <img src="/login/qr-code.svg" alt="" className="max-h-full max-w-full object-contain" />
      </div>
      <p className="absolute right-5 bottom-5 m-0 flex min-h-20 items-center gap-4 rounded-full border border-[#d7e4e0] bg-white px-4 py-4 text-base leading-snug text-[#1a1a1a]">
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
