import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthForm({ done, flash, demo }) {
  const [mode, setMode] = useState("signin"),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (demo) {
      flash("Add your Supabase URL and anon key to enable accounts.");
      return;
    }
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const email = String(f.get("email")),
      password = String(f.get("password"));
    let res =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: String(f.get("name")) } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) flash(res.error.message);
    else {
      flash(
        mode === "signup"
          ? "Account created. Check your email if confirmation is enabled."
          : "Welcome back!",
      );
      done();
    }
  }
  return (
    <>
      <span className="eyebrow">WELCOME TO NEXTUP</span>
      <h2>{mode === "signin" ? "Good to see you." : "Join the game."}</h2>
      <p className="muted">
        {mode === "signin"
          ? "Sign in to manage your games and clubs."
          : "Create your account to join sessions."}
      </p>
      <form className="form" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Your name
            <input name="name" placeholder="Your name" required />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength="6"
            placeholder="At least 6 characters"
            required
          />
        </label>
        <button className="primary full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}{" "}
          <ArrowUpRight size={17} />
        </button>
      </form>
      <p className="form-switch">
        {mode === "signin" ? "New to NEXTUP?" : "Already have an account?"}{" "}
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Create account" : "Sign in"}
        </button>
      </p>
    </>
  );
}
