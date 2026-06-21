import { type FormEvent, useMemo, useState } from "react";
import {
  Aperture,
  CalendarRange,
  Camera,
  Eye,
  EyeOff,
  FileSearch,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Telescope,
  UserPlus,
  type LucideIcon
} from "lucide-react";
import {
  authenticateWithPassword,
  createAuthSession,
  type AuthMode,
  type AuthSession
} from "../lib/auth";
import { fallbackTargets, type Target } from "../lib/targets";

type AuthLandingProps = {
  onComplete: (session: AuthSession) => void;
};

type AuthFormMode = Extract<AuthMode, "login" | "register">;

type LandingFeature = {
  label: string;
  detail: string;
  Icon: LucideIcon;
};

const featuredTargetIds = ["ngc7000", "m31", "m42", "m8"];

const landingFeatures: LandingFeature[] = [
  {
    label: "Tonight Board",
    detail: "Ranking obiektow, pogoda i okna sesji w jednym widoku.",
    Icon: Telescope
  },
  {
    label: "FOV Console",
    detail: "Realna skala targetu kontra sensor, ogniskowa i reduktor.",
    Icon: Aperture
  },
  {
    label: "Capture Runbook",
    detail: "Ekspozycje, filtry, dithering, autofocus i checklisty.",
    Icon: Camera
  },
  {
    label: "Multi-session",
    detail: "Plan wielu nocy, biale noce, Ksiezyc i eksport ICS.",
    Icon: CalendarRange
  },
  {
    label: "FITS Review",
    detail: "Skan klatek, score jakosci i przekazanie do obrobki.",
    Icon: FileSearch
  }
];

export function AuthLanding({ onComplete }: AuthLandingProps) {
  const [mode, setMode] = useState<AuthFormMode>("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const featuredTargets = useMemo(() => selectFeaturedTargets(), []);

  function completeSession(sessionMode: AuthMode) {
    const session = createAuthSession({
      email: sessionMode === "demo" ? "demo@local" : email,
      displayName: sessionMode === "demo" ? "Demo Observatory" : displayName,
      mode: sessionMode
    });

    onComplete(session);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.includes("@") || !email.includes(".")) {
      setError("Podaj poprawny adres e-mail.");
      return;
    }

    if (password.length < 8) {
      setError("Haslo musi miec minimum 8 znakow.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const session = await authenticateWithPassword({
        displayName,
        email,
        mode,
        password
      });
      onComplete(session);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Auth API jest niedostepne. Uruchom backend albo wejdz w trybie demo."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-landing">
      <div className="auth-starfield" aria-hidden="true" />
      <div className="auth-image-wall" aria-hidden="true">
        {featuredTargets.map((target, index) => (
          <figure className={`auth-target-plate auth-target-plate-${index + 1}`} key={target.id}>
            <img src={target.imageSourceUrl} alt="" loading={index === 0 ? "eager" : "lazy"} />
            <figcaption>
              <span>{target.catalogId}</span>
              <strong>{target.name}</strong>
            </figcaption>
          </figure>
        ))}
      </div>

      <section className="auth-hero" aria-label="Astrofoto Mission Control start">
        <div className="auth-copy">
          <span className="auth-kicker">
            <Sparkles size={16} aria-hidden="true" />
            Homelab-ready astro planning suite
          </span>
          <h1>Astrofoto Mission Control</h1>
          <p>
            Planuj noc, kadruj targety w realnej skali, zapisuj profile sprzetu,
            kontroluj pogode i prowadz sesje od wyboru obiektu po FITS review.
          </p>

          <div className="auth-feature-grid" aria-label="Najwazniejsze narzedzia">
            {landingFeatures.map(({ Icon, detail, label }) => (
              <article className="auth-feature" key={label}>
                <Icon size={18} aria-hidden="true" />
                <div>
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="auth-panel" aria-label="Logowanie i rejestracja">
          <div className="auth-panel-header">
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              Operator access
            </span>
            <strong>{mode === "login" ? "Logowanie" : "Rejestracja"}</strong>
          </div>

          <div className="auth-mode-tabs" role="tablist" aria-label="Tryb dostepu">
            <button
              aria-selected={mode === "login"}
              className={mode === "login" ? "is-active" : ""}
              role="tab"
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              <LogIn size={16} aria-hidden="true" />
              Logowanie
            </button>
            <button
              aria-selected={mode === "register"}
              className={mode === "register" ? "is-active" : ""}
              role="tab"
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              <UserPlus size={16} aria-hidden="true" />
              Rejestracja
            </button>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {mode === "register" && (
              <label>
                <span>Nazwa profilu</span>
                <input
                  autoComplete="name"
                  placeholder="Backyard Observatory"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
            )}

            <label>
              <span>E-mail</span>
              <div className="auth-input-shell">
                <Mail size={16} aria-hidden="true" />
                <input
                  autoComplete="email"
                  inputMode="email"
                  placeholder="operator@local"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </label>

            <label>
              <span>Haslo</span>
              <div className="auth-input-shell">
                <Lock size={16} aria-hidden="true" />
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="Minimum 8 znakow"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  aria-label={showPassword ? "Ukryj haslo" : "Pokaz haslo"}
                  className="auth-icon-button"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}
              {isSubmitting
                ? "Laczenie..."
                : mode === "login"
                  ? "Wejdz do kokpitu"
                  : "Utworz konto"}
            </button>
          </form>

          <button className="auth-demo-button" type="button" onClick={() => completeSession("demo")}>
            <Telescope size={17} aria-hidden="true" />
            Wejdz demo bez konta
          </button>

          <p className="auth-note">
            Login i rejestracja uzywaja backendu. Tryb demo dziala lokalnie, gdy API jest offline.
          </p>
        </aside>
      </section>
    </main>
  );
}

function selectFeaturedTargets(): Target[] {
  const selectedTargets = featuredTargetIds
    .map((targetId) => fallbackTargets.find((target) => target.id === targetId))
    .filter((target): target is Target => Boolean(target));

  return selectedTargets.length > 0 ? selectedTargets : fallbackTargets.slice(0, 4);
}
