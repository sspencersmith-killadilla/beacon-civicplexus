import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BeaconWordmark } from "@/components/beacon/logo";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => (typeof s["next"] === "string" && s["next"].startsWith("/") ? { next: s["next"] } : {}),
  head: () => ({ meta: [
    { title: "Sign in — Beacon" }, { name: "description", content: "Sign in to your city's Beacon workspace." },
    { property: "og:title", content: "Sign in — Beacon" }, { property: "og:description", content: "Sign in to your city's Beacon workspace." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

const GoogleG = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

const MicrosoftMark = () => (
  <svg aria-hidden="true" viewBox="0 0 21 21" width="18" height="18"><path fill="#f25022" d="M0 0h10v10H0z"/><path fill="#7fba00" d="M11 0h10v10H11z"/><path fill="#00a4ef" d="M0 11h10v10H0z"/><path fill="#ffb900" d="M11 11h10v10H11z"/></svg>
);

function AuthPage() {
  const { next } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    const saved = sessionStorage.getItem("beacon-next");
    sessionStorage.removeItem("beacon-next");
    const destination = next ?? saved ?? "/app";
    const safe = destination.startsWith("/") && !destination.startsWith("//") && !destination.includes("\\");
    navigate({ to: safe ? destination : "/app" });
  }, [user, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + (next ?? "/app") } });
      if (error) toast.error(error.message); else setSent(true);
    }
    setBusy(false);
  };
  const oauth = async (p: "google" | "microsoft" | "lovable") => {
    if (next) sessionStorage.setItem("beacon-next", next);
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/auth" });
      if (r.error) toast.error(r.error.message);
    } catch {
      toast.error("Unable to start sign-in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6">
        <Link to="/"><BeaconWordmark /></Link>
        <h1 className="mt-6 text-xl font-semibold">{mode === "in" ? "Sign in" : "Create your account"}</h1>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">Check your email to confirm your account, then come back to sign in.</p>
        ) : (
          <>
            <div className="mt-5 grid gap-2">
              <Button type="button" variant="outline" className="google-sign-in" disabled={busy} onClick={() => oauth("google")}><GoogleG />Continue with Google</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => oauth("microsoft")}><MicrosoftMark />Continue with Microsoft</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => oauth("lovable")}><LovableMark />Continue with Lovable</Button>
            </div>
            <div className="my-4 text-center text-xs text-muted-foreground">or with email</div>
            <form onSubmit={submit} className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="email">Work email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button disabled={busy} type="submit">{mode === "in" ? "Sign in" : "Create account"}</Button>
            </form>
            <Button type="button" variant="link" disabled={busy} className="mt-4 h-auto whitespace-normal px-0 text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
              {mode === "in" ? "New to Beacon? Create an account" : "Already have an account? Sign in"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
