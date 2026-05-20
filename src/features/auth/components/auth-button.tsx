"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  children: ReactNode;
}

export function AuthButton({ variant = "primary", children, className = "", ...rest }: Props) {
  return (
    <button className={`gba-btn gba-btn-${variant} ${className}`} {...rest}>
      {children}
    </button>
  );
}
