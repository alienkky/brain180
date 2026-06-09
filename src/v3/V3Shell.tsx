import { useEffect, useState } from "react";
import { api } from "../v2-shell/api";
import { useTheme, rootThemeStyle } from "../v2-shell/useTheme";
import { useProtocolStore } from "./store/useProtocolStore";
import type { V3User, V3Screen } from "./types";

import { LoginScreen } from "./screens/LoginScreen";
import { DashboardScreen } from "./screens/DashboardScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { SessionScreen } from "./screens/SessionScreen";
import { CompletionScreen } from "./screens/CompletionScreen";
import { AdminShell } from "./admin/AdminShell";

type AuthState = "loading" | "unauthenticated" | "authenticated";

export function V3Shell() {
  const { skin, accent, hl } = useTheme();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [user, setUser] = useState<V3User | null>(null);
  const [screen, setScreen] = useState<V3Screen>("dashboard");

  const session = useProtocolStore((s) => s.session);

  // Auth check on mount
  useEffect(() => {
    api
      .me()
      .then((u) => {
        setUser({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          status: u.status,
        });
        setAuthState("authenticated");
      })
      .catch(() => setAuthState("unauthenticated"));
  }, []);

  const handleLogin = (u: V3User) => {
    setUser(u);
    setAuthState("authenticated");
    setScreen("dashboard");
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setAuthState("unauthenticated");
    setScreen("dashboard");
  };

  if (authState === "loading") {
    return (
      <div className="min-h-screen bg-brain-bg flex items-center justify-center">
        <div className="text-brain-text-muted text-sm">Loading…</div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return (
      <div data-skin={skin} style={rootThemeStyle(skin, accent, hl)}>
        <LoginScreen onLogin={handleLogin} />
      </div>
    );
  }

  // Admin mode
  if (user?.role === "admin") {
    return (
      <div data-skin={skin} style={rootThemeStyle(skin, accent, hl)} className="h-screen overflow-hidden">
        <AdminShell user={user} onLogout={handleLogout} />
      </div>
    );
  }

  // Customer mode
  return (
    <div
      data-skin={skin}
      style={rootThemeStyle(skin, accent, hl)}
      className="h-screen flex flex-col overflow-hidden bg-brain-bg"
    >
      {/* Top nav (non-session screens) */}
      {screen !== "session" && screen !== "complete" && (
        <header className="h-12 border-b border-brain-border bg-brain-surface flex items-center px-4 gap-4 shrink-0">
          <span className="text-sm font-bold text-brain-text">Brain180</span>
          <nav className="flex gap-1 ml-2">
            {(["dashboard", "library"] as V3Screen[]).map((s) => (
              <button
                key={s}
                onClick={() => setScreen(s)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  screen === s
                    ? "bg-brain-accent-soft text-brain-accent"
                    : "text-brain-text-muted hover:text-brain-text"
                }`}
              >
                {s === "dashboard" ? "대시보드" : "레슨 라이브러리"}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-brain-text-muted">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-brain-text-muted hover:text-brain-text transition-colors"
            >
              로그아웃
            </button>
          </div>
        </header>
      )}

      {/* Screen content */}
      <div className={`flex-1 overflow-hidden ${screen !== "session" && screen !== "complete" ? "flex" : ""}`}>
        {screen === "dashboard" && user && (
          <DashboardScreen user={user} onGoLibrary={() => setScreen("library")} />
        )}
        {screen === "library" && (
          <LibraryScreen onSessionStart={() => setScreen("session")} />
        )}
        {screen === "session" && session && (
          <SessionScreen
            onComplete={() => setScreen("complete")}
          />
        )}
        {screen === "session" && !session && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-brain-text-muted">
              <p className="mb-4">세션이 없습니다.</p>
              <button
                onClick={() => setScreen("library")}
                className="px-4 py-2 rounded-lg bg-brain-accent text-white text-sm"
              >
                레슨 선택하기
              </button>
            </div>
          </div>
        )}
        {screen === "complete" && session && (
          <CompletionScreen onBack={() => setScreen("dashboard")} />
        )}
      </div>
    </div>
  );
}
