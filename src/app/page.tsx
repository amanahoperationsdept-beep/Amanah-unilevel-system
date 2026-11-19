"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { signInAction } from "@/app/actions/auth";
import PublicLanding from "@/components/PublicLanding";
import { ArrowRight, CircleHelp, Eye, EyeOff, LockKeyhole, ShieldCheck, Users } from "lucide-react";

type Role = "admin" | "distributor";
type Screen = "home" | "login";

const money = (value: number) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", maximumFractionDigits: 0
}).format(value);

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [role, setRole] = useState<Role>("distributor");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [isSigningIn, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPortal = params.get("portal");

    if (requestedPortal === "admin" || requestedPortal === "distributor") {
      setRole(requestedPortal);
      setScreen("login");
    }

    if (params.get("auth") === "not-configured") {
      setScreen("login");
      setNotice("Secure sign-in is not configured yet. Add the Supabase project URL and anon key, then try again.");
    }

    if (params.get("auth") === "pending") {
      setScreen("login");
      setNotice("Your email is confirmed. Your distributor application is now waiting for administrator approval.");
    }

    if (params.get("auth") === "confirmation-failed") {
      setScreen("login");
      setNotice("We could not confirm that email link. Request a new confirmation email or contact AMANAH support.");
    }
  }, []);

  const openLogin = (nextRole: Role) => {
    setRole(nextRole);
    setNotice("");
    setScreen("login");
  };

  const submitLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("role", role);
    setNotice("");

    startTransition(async () => {
      const result = await signInAction(formData);
      if (result && "error" in result) {
        setNotice(result.error);
      }
    });
  };

  if (screen === "login") {
    return (
      <main className="login-shell">
        <button className="back-home" onClick={() => setScreen("home")}>← Back to AMANAH</button>
        <div className="login-layout">
          <section className="login-story">
            <Brand light />
            <div className="login-story-copy">
              <span className="eyebrow light-eyebrow">AMANAH NETWORK MANAGEMENT</span>
              <h1>Grow with purpose.<br /><em>Lead with integrity.</em></h1>
              <p>A clear view of your network, product activity, and performance—built around accountability and trust.</p>
              <div className="login-promise"><ShieldCheck size={18} /> Secure, role-based access</div>
            </div>
            <div className="login-bottom">AMANAH DMC <span>•</span> Built for people and progress</div>
          </section>
          <section className="login-panel">
            <div className="login-panel-inner">
              <span className="eyebrow">WELCOME BACK</span>
              <h2>Sign in to your<br />workspace.</h2>
              <p className="muted">Choose the portal that matches your account.</p>
              <div className="role-switch" aria-label="Choose account type">
                <button className={role === "distributor" ? "selected" : ""} onClick={() => { setRole("distributor"); setNotice(""); }}>
                  <Users size={17} /> Distributor
                </button>
                <button className={role === "admin" ? "selected" : ""} onClick={() => { setRole("admin"); setNotice(""); }}>
                  <ShieldCheck size={17} /> Administrator
                </button>
              </div>
              <div className="portal-label"><span className={role === "admin" ? "admin-dot" : "member-dot"} /> {role === "admin" ? "ADMINISTRATOR PORTAL" : "DISTRIBUTOR PORTAL"}</div>
              <form className="login-form" onSubmit={submitLogin}>
                <input type="hidden" name="role" value={role} />
                <label>{role === "admin" ? "Admin email" : "Distributor email"}</label>
                <input type="email" name="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder={role === "admin" ? "admin@amanah.com" : "Enter your email address"} />
                <label>Password</label>
                <div className="password-field">
                  <input name="password" autoComplete="current-password" required minLength={6} type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
                  <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
                <div className="form-extras"><span className="muted">Use your registered email address.</span><button type="button" className="text-button" onClick={() => setNotice("Password recovery is not enabled yet. Contact your AMANAH administrator.")}>Forgot password?</button></div>
                <button className="primary-button full-button" type="submit" disabled={isSigningIn}>{isSigningIn ? "Signing in..." : "Sign in"} <ArrowRight size={17} /></button>
              </form>
              {notice && <div className="notice" role="status" aria-live="polite"><CircleHelp size={17} /><span>{notice}</span></div>}
              <div className="login-help">Need access? <Link className="text-button" href="/register">Create a distributor account</Link></div>
              <div className="login-security"><LockKeyhole size={14} /> Sign-in checks your active AMANAH profile and assigned role.</div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <PublicLanding onLogin={openLogin} />;
}

function Brand({ light = false }: { light?: boolean }) {
  return <div className={light ? "brand brand-light" : "brand"}><span className="brand-symbol">A</span><span className="brand-name">AMANAH<small>DMC NETWORK</small></span></div>;
}
