"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { playTrack, playUiSfx } from "@/lib/music-bus";
import {
  writeStoredToken,
  writeStoredUsername,
} from "@/features/game/spacetime/token-storage";
import { AuthField } from "./auth-field";
import { AuthButton } from "./auth-button";
import {
  useCredentialAuth,
  InvalidPasswordError,
  sanitizeUsername,
} from "../hooks/use-credential-auth";
import { useSpacetimeAuthConfig } from "../spacetime-auth";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
  onSwitchMode: (m: Mode) => void;
  onAuthed: (username: string) => void;
};

export function AuthWindow({ mode, onSwitchMode, onAuthed }: Props) {
  const {
    register,
    login,
    state,
    isConnected,
    credentialsReady,
    connectionError,
  } = useCredentialAuth();
  const { configured: spacetimeAuthConfigured } = useSpacetimeAuthConfig();
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";
  const busy = state === "working";

  useEffect(function playErrorCue(): void {
    if (error !== null) {
      playUiSfx("error");
    }
  }, [error]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) return setError("ENTER A USERNAME");
    if (!pw) return setError("ENTER YOUR PASSWORD");
    if (isRegister && pw !== pw2) return setError("PASSWORDS DO NOT MATCH");
    if (connectionError) return setError(connectionError.message.toUpperCase());
    if (!isConnected) return setError("CONNECTING — TRY AGAIN IN A MOMENT");
    if (!isRegister && !credentialsReady)
      return setError("ACCOUNT LIST IS STILL LOADING");

    try {
      if (isRegister) {
        const result = await register(username, pw);
        playTrack("lobby");
        onAuthed(result.username);
      } else {
        const result = await login(username, pw);
        playTrack("lobby");
        onAuthed(result.username);
      }
    } catch (err) {
      setError(messageFromError(err));
    }
  }

  return (
    <div className="gba-window">
      <div className="gba-titlebar">
        <span className="gba-title">
          {isRegister ? "CREATE ACCOUNT" : "LOGIN"}
        </span>
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
          <AuthField
            label="USERNAME"
            value={username}
            onChange={setUsername}
            maxLength={20}
          />
          <AuthField
            label="PASSWORD"
            type="password"
            value={pw}
            onChange={setPw}
            maxLength={64}
          />
          <div
            className={`gba-collapse ${isRegister ? "is-open" : ""}`}
            aria-hidden={!isRegister}
          >
            <div className="gba-collapse-inner">
              <AuthField
                label="CONFIRM"
                type="password"
                value={pw2}
                onChange={setPw2}
                maxLength={64}
              />
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

          <div className="gba-divider-row">
            <span className="gba-divider-line" />
            <span className="gba-divider-text">OR USE SPACETIMEAUTH</span>
            <span className="gba-divider-line" />
          </div>

          {spacetimeAuthConfigured ? (
            <SpacetimeAuthButtons
              onAuthed={onAuthed}
              onError={(message) => setError(message)}
            />
          ) : (
            <div className="gba-auth-config-missing">
              SET NEXT_PUBLIC_SPACETIME_AUTH_CLIENT_ID
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

type SpacetimeAuthButtonsProps = {
  onAuthed: (username: string) => void;
  onError: (message: string) => void;
};

function SpacetimeAuthButtons({
  onAuthed,
  onError,
}: SpacetimeAuthButtonsProps): React.JSX.Element {
  const auth = useAuth();
  const handledSubjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;
    const token = auth.user.id_token ?? auth.user.access_token;
    if (!token) {
      onError("SPACETIMEAUTH DID NOT RETURN A TOKEN");
      return;
    }

    const subject = auth.user.profile.sub;
    if (handledSubjectRef.current === subject) return;
    handledSubjectRef.current = subject;

    const rawName =
      getStringClaim(auth.user.profile.preferred_username) ??
      getStringClaim(auth.user.profile.name) ??
      getEmailLocalPart(auth.user.profile.email) ??
      "Player";
    const username = sanitizeUsername(rawName);

    writeStoredToken(token);
    writeStoredUsername(username);
    playTrack("lobby");
    onAuthed(username);
  }, [auth.isAuthenticated, auth.user, onAuthed, onError]);

  const disabled = auth.isLoading || Boolean(auth.activeNavigator);
  const label = auth.activeNavigator ? "OPENING..." : "CONTINUE SECURELY";

  async function signIn(): Promise<void> {
    try {
      await auth.signinRedirect();
    } catch (err) {
      onError(messageFromError(err));
    }
  }

  return (
    <div className="gba-spacetime-auth-actions">
      <div className="gba-auth-provider-strip" aria-label="SpacetimeAuth providers">
        <span className="gba-auth-provider-pill">
          <span className="gba-auth-provider-mark">G</span>
          <span>Google</span>
        </span>
        <span className="gba-auth-provider-pill">
          <span className="gba-auth-provider-mark">GH</span>
          <span>GitHub</span>
        </span>
        <span className="gba-auth-provider-pill">
          <span className="gba-auth-provider-mark">@</span>
          <span>Magic link</span>
        </span>
      </div>
      <button
        className="gba-provider-btn"
        type="button"
        disabled={disabled}
        onClick={() => void signIn()}
      >
        <LogIn size={16} aria-hidden />
        <span>{label}</span>
      </button>
      <div className="gba-auth-provider-note">
        <ShieldCheck size={13} aria-hidden />
        <span>Handled by SpacetimeAuth</span>
      </div>
      {auth.error ? (
        <div className="gba-provider-error">{auth.error.message}</div>
      ) : null}
    </div>
  );
}

function getStringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function getEmailLocalPart(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.includes("@") ? value.split("@")[0] : value;
}

function messageFromError(e: unknown): string {
  if (e instanceof InvalidPasswordError) return "WRONG PASSWORD";
  if (e instanceof Error) return e.message.toUpperCase();
  return String(e);
}
