"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import {
  AuthProvider,
  useAuth,
  type AuthProviderProps,
} from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

const SPACETIME_AUTH_AUTHORITY =
  process.env.NEXT_PUBLIC_SPACETIME_AUTH_AUTHORITY ??
  "https://auth.spacetimedb.com/oidc";
const SPACETIME_AUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_SPACETIME_AUTH_CLIENT_ID;
const SPACETIME_AUTH_SCOPE =
  process.env.NEXT_PUBLIC_SPACETIME_AUTH_SCOPE ?? "openid profile email";
const SPACETIME_AUTH_REDIRECT_PATH =
  process.env.NEXT_PUBLIC_SPACETIME_AUTH_REDIRECT_PATH ?? "/";
const SPACETIME_AUTH_DEBUG =
  process.env.NEXT_PUBLIC_SPACETIME_AUTH_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

type SpacetimeAuthConfig = {
  configured: boolean;
};

const SpacetimeAuthConfigContext = createContext<SpacetimeAuthConfig>({
  configured: false,
});

type SpacetimeAuthProviderProps = {
  children: ReactNode;
};

export function SpacetimeAuthProvider({
  children,
}: SpacetimeAuthProviderProps): React.JSX.Element {
  const configured = Boolean(SPACETIME_AUTH_CLIENT_ID);

  const value = useMemo<SpacetimeAuthConfig>(
    () => ({ configured }),
    [configured]
  );

  if (!SPACETIME_AUTH_CLIENT_ID) {
    return (
      <SpacetimeAuthConfigContext.Provider value={value}>
        {children}
      </SpacetimeAuthConfigContext.Provider>
    );
  }

  const oidcConfig: AuthProviderProps = {
    authority: SPACETIME_AUTH_AUTHORITY,
    client_id: SPACETIME_AUTH_CLIENT_ID,
    redirect_uri: resolveRedirectUri(),
    post_logout_redirect_uri: resolveAppOrigin(),
    scope: SPACETIME_AUTH_SCOPE,
    response_type: "code",
    automaticSilentRenew: true,
    userStore:
      typeof window === "undefined"
        ? undefined
        : new WebStorageStateStore({ store: window.localStorage }),
    onSigninCallback: () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("session_state");
      window.history.replaceState({}, document.title, url.toString());
    },
  };

  return (
    <SpacetimeAuthConfigContext.Provider value={value}>
      <AuthProvider {...oidcConfig}>
        {SPACETIME_AUTH_DEBUG ? <OidcDebug /> : null}
        {children}
      </AuthProvider>
    </SpacetimeAuthConfigContext.Provider>
  );
}

export function useSpacetimeAuthConfig(): SpacetimeAuthConfig {
  return useContext(SpacetimeAuthConfigContext);
}

function OidcDebug(): null {
  const auth = useAuth();

  useEffect(() => {
    const events = auth.events;
    const onUserLoaded = (user: unknown) => {
      console.log("[OIDC] userLoaded", user);
    };
    const onUserUnloaded = () => {
      console.log("[OIDC] userUnloaded");
    };
    const onAccessTokenExpiring = () => {
      console.log("[OIDC] accessTokenExpiring");
    };
    const onAccessTokenExpired = () => {
      console.log("[OIDC] accessTokenExpired");
    };
    const onSilentRenewError = (error: Error) => {
      console.warn("[OIDC] silentRenewError", error);
    };
    const onUserSignedOut = () => {
      console.log("[OIDC] userSignedOut");
    };

    events.addUserLoaded(onUserLoaded);
    events.addUserUnloaded(onUserUnloaded);
    events.addAccessTokenExpiring(onAccessTokenExpiring);
    events.addAccessTokenExpired(onAccessTokenExpired);
    events.addSilentRenewError(onSilentRenewError);
    events.addUserSignedOut(onUserSignedOut);

    return () => {
      events.removeUserLoaded(onUserLoaded);
      events.removeUserUnloaded(onUserUnloaded);
      events.removeAccessTokenExpiring(onAccessTokenExpiring);
      events.removeAccessTokenExpired(onAccessTokenExpired);
      events.removeSilentRenewError(onSilentRenewError);
      events.removeUserSignedOut(onUserSignedOut);
    };
  }, [auth.events]);

  useEffect(() => {
    console.log("[OIDC] state", {
      activeNavigator: auth.activeNavigator,
      error: auth.error?.message,
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      user: Boolean(auth.user),
    });
  }, [
    auth.activeNavigator,
    auth.error,
    auth.isAuthenticated,
    auth.isLoading,
    auth.user,
  ]);

  return null;
}

function resolveRedirectUri(): string {
  const origin = resolveAppOrigin();
  if (SPACETIME_AUTH_REDIRECT_PATH.startsWith("http")) {
    return SPACETIME_AUTH_REDIRECT_PATH;
  }
  return `${origin}${SPACETIME_AUTH_REDIRECT_PATH}`;
}

function resolveAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000";
}
