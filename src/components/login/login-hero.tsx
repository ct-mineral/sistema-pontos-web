import Image from "next/image";

export function LoginHero() {
  return (
    <div className="login-hero">
      <Image
        className="login-hero__photo"
        src="/login/hero.jpg"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
      />
      <div className="login-hero__shade" />
      <p className="login-hero__pill">
        <span className="login-hero__pill-icon" aria-hidden="true">
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
