import type React from "react";
import "./avatar.css";

/* Avatar Krzysztofa: kadr na twarz z portretu (krzysztof-640.webp, twarz ~48% / 18% kadru).
   Tło pod przezroczystą częścią zdjęcia to morski gradient z tokenów. */
export default function Avatar({ size = 44, typing = false, className = "" }: { size?: number; typing?: boolean; className?: string }) {
  return (
    <span
      className={`kav ${typing ? "is-typing" : ""} ${className}`}
      style={{ "--kav": `${size}px` } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="kav__face" />
    </span>
  );
}
