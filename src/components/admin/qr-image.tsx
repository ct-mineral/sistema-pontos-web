"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrImage({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, width: 144, color: { dark: "#163028" } })
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (!src) return null;
  return <img className="block rounded-md bg-card" src={src} alt="" width={144} height={144} />;
}
