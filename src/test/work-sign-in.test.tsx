import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

const mocks = vi.hoisted(() => ({ oauth: vi.fn(), navigate: vi.fn(), user: null as null | { id: string } }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: mocks.oauth } } }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import { Route } from "@/routes/auth";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = null;
  mocks.oauth.mockResolvedValue({ error: null, redirected: true });
  sessionStorage.clear();
  vi.spyOn(Route, "useSearch").mockReturnValue({ next: "/app" });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const Page = Route.options.component as ComponentType;

describe("Work-account sign-in", () => {
  it.each(["Google", "Microsoft"])("starts %s through the managed helper with a public callback", async (name) => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: `Continue with ${name}` }));
    await waitFor(() => expect(mocks.oauth).toHaveBeenCalledWith(name.toLowerCase(), { redirect_uri: `${window.location.origin}/auth` }));
    expect(sessionStorage.getItem("beacon-next")).toBe("/app");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("restores an invitation after the authenticated session arrives", () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({});
    sessionStorage.setItem("beacon-next", "/invite/test-token");
    mocks.user = { id: "staff" };
    render(<Page />);
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({ to: "/invite/test-token" });
    expect(sessionStorage.getItem("beacon-next")).toBeNull();
  });
  it("does not restore an external destination", () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({});
    sessionStorage.setItem("beacon-next", "//other.example/path");
    mocks.user = { id: "staff" };
    render(<Page />);
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/app" });
  });
});