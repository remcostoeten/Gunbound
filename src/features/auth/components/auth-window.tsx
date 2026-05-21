"use client";

import { useState, type FormEvent } from "react";
import { AuthField } from "./auth-field";
import { AuthButton } from "./auth-button";
import { useCredentialAuth, InvalidPasswordError } from "../hooks/use-credential-auth";

type Mode = "login" | "register";

interface Props {
  mode: Mode;
  onSwitchMode: (m: Mode) => void;
  onAuthed: (username: string) => void;
}

export function AuthWindow({ mode, onSwitchMode, onAuthed }: Props) {
  const { register, login, state, isConnected, credentialsReady, connectionError } = useCredentialAuth();
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";
  const busy = state === "working";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) return setError("ENTER A USERNAME");
    if (!pw) return setError("ENTER YOUR PASSWORD");
    if (isRegister && pw !== pw2) return setError("PASSWORDS DO NOT MATCH");
    if (connectionError) return setError(connectionError.message.toUpperCase());
    if (!isConnected) return setError("CONNECTING — TRY AGAIN IN A MOMENT");
    if (!isRegister && !credentialsReady) return setError("ACCOUNT LIST IS STILL LOADING");

    try {
      if (isRegister) {
        const result = await register(username, pw);
        onAuthed(result.username);
      } else {
        const result = await login(username, pw);
        onAuthed(result.username);
      }
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  return (
    <div className="gba-window">
      <div className="gba-titlebar">
        <span className="gba-title">{isRegister ? "CREATE ACCOUNT" : "LOGIN"}</span>
        <span className="gba-title-x">×</span>
      </div>
      <div className="gba-body">
        <div className="gba-tabs">
          <button
            type="button"
            className={`gba-tab ${!isRegister ? "is-active" : ""}`}
            onClick={() => onSwitchMode("login")}
          >
            LOGIN
          </button>
          <button
            type="button"
            className={`gba-tab ${isRegister ? "is-active" : ""}`}
            onClick={() => onSwitchMode("register")}
          >
            REGISTER
          </button>
        </div>

        <form className="gba-form" onSubmit={submit}>
          <AuthField label="USERNAME" value={username} onChange={setUsername} maxLength={20} />
          <AuthField label="PASSWORD" type="password" value={pw} onChange={setPw} maxLength={64} />
          <div className={`gba-collapse ${isRegister ? "is-open" : ""}`} aria-hidden={!isRegister}>
            <div className="gba-collapse-inner">
              <AuthField label="CONFIRM" type="password" value={pw2} onChange={setPw2} maxLength={64} />
            </div>
          </div>

          {error && <div className="gba-error">! {error}</div>}

          <div className="gba-actions">
            <AuthButton variant="primary" type="submit" disabled={busy}>
              {busy ? "WORKING..." : isRegister ? "CREATE" : "CONNECT"}
            </AuthButton>
            <AuthButton
              variant="ghost"
              type="button"
              onClick={() => onSwitchMode(isRegister ? "login" : "register")}
            >
              {isRegister ? "BACK" : "NEW USER"}
            </AuthButton>
          </div>

          <p className="gba-foot-hint">
            {isRegister
              ? "Pick a memorable password — there is no email reset yet, so save it carefully."
              : "Sign in to recover your profile on any device."}
          </p>
        </form>
      </div>
    </div>
  );
}

function messageFromError(e: unknown): string {
  if (e instanceof InvalidPasswordError) return "WRONG PASSWORD";
  if (e instanceof Error) return e.message.toUpperCase();
  return String(e);
}
