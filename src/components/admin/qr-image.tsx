"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { cn } from "cn";

const QR_COLOR = { dark: "#163028", light: "#ffffff" };

export function QrImage({
  value,
  size = 144,
  alt = "",
  className,
  onReady,
}: {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
  onReady?: (src: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 2, width: size, color: QR_COLOR })
      .then((url) => {
        if (!active) return;
        setSrc(url);
        onReady?.(url);
      })
      .catch(() => {
        if (active) setSrc(null);
      });
    return () => {
      active = false;
    };
  }, [onReady, size, value]);

  if (!src) {
    return (
      <div
        className={cn("rounded-md bg-muted", className)}
        style={className ? undefined : { width: size, height: size }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      className={cn("block rounded-md bg-white", className)}
      src={src}
      alt={alt}
      width={size}
      height={size}
    />
  );
}
