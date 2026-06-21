export type AuthMode = "login" | "register" | "demo";

export type AuthSession = {
  email: string;
  displayName: string;
  mode: AuthMode;
  createdAt: string;
  accessToken?: string;
  expiresAt?: string;
  userId?: number;
};

export const authStorageKey = "astrofoto-auth-session";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

type ApiAuthResponse = {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  user: {
    id: number;
    email: string;
    display_name: string;
    created_at: string;
  };
};

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

export async function authenticateWithPassword({
  displayName,
  email,
  mode,
  password
}: {
  displayName: string;
  email: string;
  mode: Extract<AuthMode, "login" | "register">;
  password: string;
}): Promise<AuthSession> {
  const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
  const payload =
    mode === "register"
      ? {
          email,
          display_name: displayName.trim() || email.trim().split("@")[0] || "Astro Operator",
          password
        }
      : {
          email,
          password
        };

  const response = await fetch(`${apiBaseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await authErrorMessage(response));
  }

  return sessionFromApi(await response.json(), mode);
}

export async function logoutSession(session: AuthSession): Promise<void> {
  if (!session.accessToken) return;

  await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  });
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
      typeof parsedSession.createdAt !== "string" ||
      (parsedSession.accessToken !== undefined && typeof parsedSession.accessToken !== "string") ||
      (parsedSession.expiresAt !== undefined && typeof parsedSession.expiresAt !== "string") ||
      (parsedSession.userId !== undefined && typeof parsedSession.userId !== "number")
    ) {
      return null;
    }

    return {
      email: parsedSession.email,
      displayName: parsedSession.displayName,
      mode: parsedSession.mode,
      createdAt: parsedSession.createdAt,
      accessToken: parsedSession.accessToken,
      expiresAt: parsedSession.expiresAt,
      userId: parsedSession.userId
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

function sessionFromApi(response: ApiAuthResponse, mode: AuthMode): AuthSession {
  return {
    email: response.user.email,
    displayName: response.user.display_name,
    mode,
    createdAt: response.user.created_at,
    accessToken: response.access_token,
    expiresAt: response.expires_at,
    userId: response.user.id
  };
}

async function authErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Ignore JSON parsing failures and use a stable fallback below.
  }

  if (response.status === 409) return "Ten e-mail jest juz zarejestrowany.";
  if (response.status === 401) return "Niepoprawny e-mail albo haslo.";
  return "Nie udalo sie polaczyc z bramka logowania.";
}
