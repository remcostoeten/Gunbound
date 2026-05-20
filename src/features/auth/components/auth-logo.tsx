"use client";

import { RemBoundLogo } from "@/components/rembound-logo";

/** Auth-screen wrapper around the shared brand logo. Scales down on small screens via CSS. */
export function AuthLogo() {
  return (
    <div className="gba-logo-wrap">
      <RemBoundLogo scale={0.42} className="rb-logo-auth" />
    </div>
  );
}
