"use client";

import { useState, useEffect, type FormEvent } from "react";
import { playTrack } from "@/lib/music-bus";
import { AuthField } from "./auth-field";
import { AuthButton } from "./auth-button";
import {
  useCredentialAuth,
  InvalidPasswordError,
} from "../hooks/use-credential-auth";

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
    loginWithGoogle,
    state,
    isConnected,
    credentialsReady,
    connectionError,
  } = useCredentialAuth();
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  const handleGoogleCredential = async (credential: string) => {
    setError(null);
    if (connectionError) return setError(connectionError.message.toUpperCase());
    if (!isConnected) return setError("CONNECTING — TRY AGAIN IN A MOMENT");
    try {
      const result = await loginWithGoogle(credential);
      playTrack("lobby");
      onAuthed(result.username);
    } catch (err) {
      setError(messageFromError(err));
    }
  };

  useEffect(() => {
    const checkGoogle = () => {
      if (typeof window !== "undefined" && (window as any).google) {
        setGoogleAvailable(true);
        return true;
      }
      return false;
    };

    if (checkGoogle()) return;

    const interval = setInterval(() => {
      if (checkGoogle()) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!googleAvailable) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "100000000000-dummyclientid.apps.googleusercontent.com";
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      console.warn("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured. Google Sign-In button is rendered with a fallback Client ID.");
    }

    try {
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response.credential) {
            handleGoogleCredential(response.credential);
          }
        },
      });

      const btnContainer = document.getElementById("google-signin-btn");
      if (btnContainer) {
        (window as any).google.accounts.id.renderButton(btnContainer, {
          theme: "filled_blue",
          size: "large",
          width: btnContainer.clientWidth || 340,
          text: "signin_with",
          shape: "rectangular",
        });
      }
    } catch (e) {
      console.warn("Failed to initialize Google Sign-In:", e);
    }
  }, [googleAvailable, isConnected, mode]);

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
            <span className="gba-divider-text">OR CONNECT WITH</span>
            <span className="gba-divider-line" />
          </div>

          <div className="gba-google-btn-container">
            <div id="google-signin-btn" style={{ minHeight: "40px" }} />
          </div>
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
