import { useEffect, useState } from "react";
import { ArrowUpRight, Mail, RotateCcw } from "lucide-react";
import { supabase } from "../lib/supabase";

export function AuthForm({ done, flash, demo }) {
  const [mode, setMode] = useState("signin");
  const [verificationMode, setVerificationMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const startVerification = (userEmail) => {
    setEmail(userEmail);
    setVerificationCode("");
    setVerificationMode(true);
    setCooldown(30);
  };

  async function submit(event) {
    event.preventDefault();

    if (demo) {
      flash("Add your Supabase URL and anon key to enable accounts.");
      return;
    }

    const form = new FormData(event.currentTarget);

    setBusy(true);

    const userEmail = String(form.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(form.get("password") || "");

    if (mode === "signup") {
      const name = String(form.get("name") || "").trim();

      const result = await supabase.auth.signUp({
        email: userEmail,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      setBusy(false);

      if (result.error) {
        flash(result.error.message);
        return;
      }

      /*
       * If email confirmation is enabled in Supabase,
       * there will normally be no active session yet.
       *
       * The user stays in this NEXTUP tab and enters
       * the verification code from their email.
       */
      if (result.data.user && !result.data.session) {
        startVerification(userEmail);

        flash(
          "We sent a 8-digit verification code to your email.",
        );

        return;
      }

      /*
       * If email confirmation is disabled in Supabase,
       * Supabase signs the user in immediately.
       */
      flash("Account created. Welcome to NEXTUP!");
      done();
      return;
    }

    const result = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    setBusy(false);

    if (result.error) {
      /*
       * If the account exists but the email has not been
       * confirmed yet, give the user a direct way to
       * request another verification code.
       */
      if (
        result.error.message
          ?.toLowerCase()
          .includes("email not confirmed")
      ) {
        setEmail(userEmail);
        setVerificationCode("");
        setVerificationMode(true);
        setCooldown(0);

        flash(
          "Your email is not verified yet. Enter the code from your email.",
        );

        return;
      }

      flash(result.error.message);
      return;
    }

    flash("Welcome back!");
    done();
  }

  async function verifyCode(event) {
    event.preventDefault();

    if (demo) {
      flash("Add your Supabase URL and anon key to enable accounts.");
      return;
    }

    const token = verificationCode.replace(/\D/g, "");

    if (token.length !== 8) {
      flash("Enter the 8-digit verification code.");
      return;
    }

    setBusy(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    setBusy(false);

    if (error) {
      flash(error.message);
      return;
    }

    if (!data.session) {
      flash(
        "Verification completed. Please sign in to continue.",
      );

      setVerificationMode(false);
      setMode("signin");
      setVerificationCode("");

      return;
    }

    flash("Email verified. Welcome to NEXTUP!");
    done();
  }

  async function resendCode() {
    if (!email || cooldown > 0 || resending) return;

    setResending(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResending(false);

    if (error) {
      flash(error.message);
      return;
    }

    setCooldown(30);
    setVerificationCode("");

    flash("A new verification code was sent to your email.");
  }

  function switchMode() {
    setVerificationMode(false);
    setVerificationCode("");
    setEmail("");
    setCooldown(0);

    setMode((current) =>
      current === "signin" ? "signup" : "signin",
    );
  }

  if (verificationMode) {
    return (
      <>
        <span className="eyebrow">VERIFY YOUR EMAIL</span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            marginTop: 18,
            marginBottom: 18,
            borderRadius: 16,
            background: "rgba(117, 16, 20, 0.08)",
          }}
        >
          <Mail size={26} />
        </div>

        <h2>Check your email.</h2>

        <p className="muted">
          We sent a 8-digit verification code to
          <br />
          <strong>{email}</strong>
        </p>

        <form className="form" onSubmit={verifyCode}>
          <label>
            Verification code
            <input
              name="verificationCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{8}"
              maxLength={8}
              placeholder="00000000"
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(
                  event.target.value.replace(/\D/g, "").slice(0, 8),
                )
              }
              autoFocus
              required
            />
          </label>

          <button
            className="primary full"
            disabled={busy || verificationCode.length !== 8}
          >
            {busy ? "Verifying…" : "Verify email"}
            <ArrowUpRight size={17} />
          </button>
        </form>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 18,
            textAlign: "center",
          }}
        >
          <button
            type="button"
            className="form-switch"
            onClick={resendCode}
            disabled={resending || cooldown > 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              border: 0,
              background: "transparent",
              cursor:
                resending || cooldown > 0
                  ? "default"
                  : "pointer",
              opacity:
                resending || cooldown > 0 ? 0.55 : 1,
            }}
          >
            <RotateCcw size={15} />

            {resending
              ? "Sending new code…"
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
          </button>

          <button
            type="button"
            className="form-switch"
            onClick={() => {
              setVerificationMode(false);
              setVerificationCode("");
            }}
          >
            Use a different email
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <span className="eyebrow">WELCOME TO NEXTUP</span>

      <h2>
        {mode === "signin"
          ? "Good to see you."
          : "Join the game."}
      </h2>

      <p className="muted">
        {mode === "signin"
          ? "Sign in to manage your games and clubs."
          : "Create your account to join sessions."}
      </p>

      <form className="form" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Your name
            <input
              name="name"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>
        )}

        <label>
          Email address
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={8}
            placeholder="At least 8 characters"
            autoComplete={
              mode === "signup"
                ? "new-password"
                : "current-password"
            }
            required
          />
        </label>

        <button
          className="primary full"
          disabled={busy}
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}

          <ArrowUpRight size={17} />
        </button>
      </form>

      <p className="form-switch">
        {mode === "signin"
          ? "New to NEXTUP?"
          : "Already have an account?"}{" "}

        <button
          type="button"
          onClick={switchMode}
        >
          {mode === "signin"
            ? "Create account"
            : "Sign in"}
        </button>
      </p>
    </>
  );
}