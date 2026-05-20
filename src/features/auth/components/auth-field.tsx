"use client";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "password";
  maxLength?: number;
}

export function AuthField({ label, value, onChange, type = "text", maxLength }: Props) {
  return (
    <label className="gba-field">
      <span className="gba-field-label">{label}</span>
      <input
        className="gba-field-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
}
