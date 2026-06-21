export type AuthMode = "login" | "register" | "demo";

export type AuthSession = {
  email: string;
  displayName: string;
  mode: AuthMode;
  createdAt: string;
};

export const authStorageKey = "astrofoto-auth-session";

export function createAuthSession({
  email,
  displayName,
  mode
}: {
  email: string;
  displayName: string;
  mode: AuthMode;
}): AuthSession {
  const normalizedEmail = email.trim().toLowerCase();
  const fallbackName = mode === "demo" ? "Demo Observatory" : normalizedEmail.split("@")[0];

  return {
    email: normalizedEmail || "demo@local",
    displayName: displayName.trim() || fallbackName || "Astro Operator",
    mode,
    createdAt: new Date().toISOString()
  };
}

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  const storedSession = window.localStorage.getItem(authStorageKey);
  if (!storedSession) return null;

  try {
    const parsedSession = JSON.parse(storedSession) as Partial<AuthSession>;
    if (
      typeof parsedSession.email !== "string" ||
      typeof parsedSession.displayName !== "string" ||
      !isAuthMode(parsedSession.mode) ||
      typeof parsedSession.createdAt !== "string"
    ) {
      return null;
    }

    return {
      email: parsedSession.email,
      displayName: parsedSession.displayName,
      mode: parsedSession.mode,
      createdAt: parsedSession.createdAt
    };
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function clearAuthSession() {
  window.localStorage.removeItem(authStorageKey);
}

function isAuthMode(value: unknown): value is AuthMode {
  return value === "login" || value === "register" || value === "demo";
}
