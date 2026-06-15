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
  const [adminMode, setAdminMode] = useState(true); // admin users: true=관리자패널 / false=학습자모드

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
    // admin → start in admin mode
    setAdminMode(true);
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

  // Admin + adminMode → admin panel
  if (user?.role === "admin" && adminMode) {
    return (
      <div data-skin={skin} style={rootThemeStyle(skin, accent, hl)} className="h-screen overflow-hidden">
        <AdminShell
          user={user}
          onLogout={handleLogout}
          onSwitchToLearning={() => setAdminMode(false)}
        />
      </div>
    );
  }

  // Customer mode (or admin in learning mode)
  return (
    <div
      data-skin={skin}
      style={rootThemeStyle(skin, accent, hl)}
      className="h-screen flex flex-col overflow-hidden bg-brain-bg"
    >
      {/* Top nav (non-session screens) */}
      {screen !== "session" && screen !== "complete" && (
        <header className="h-12 border-b border-brain-border bg-brain-surface flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 overflow-hidden">
          <span className="text-sm font-bold text-brain-text shrink-0">Brain180</span>
          <nav className="flex gap-1 min-w-0">
            {(["dashboard", "library"] as V3Screen[]).map((s) => (
              <button
                key={s}
                onClick={() => setScreen(s)}
                className={`px-2 sm:px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  screen === s
                    ? "bg-brain-accent-soft text-brain-accent"
                    : "text-brain-text-muted hover:text-brain-text"
                }`}
              >
                {s === "dashboard" ? "대시보드" : s === "library" ? "라이브러리" : s}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Admin: show switch-back button */}
            {user?.role === "admin" && (
              <button
                onClick={() => setAdminMode(true)}
                className="px-2 sm:px-3 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-300 whitespace-nowrap"
              >
                🔧<span className="hidden sm:inline"> 관리자 패널</span>
              </button>
            )}
            <span className="hidden md:inline text-xs text-brain-text-muted truncate max-w-[120px]">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-brain-text-muted hover:text-brain-text transition-colors whitespace-nowrap"
            >
              로그아웃
            </button>
          </div>
        </header>
      )}

      {/* Screen content */}
      <div className={`flex-1 overflow-hidden ${screen !== "session" && screen !== "complete" ? "flex" : ""}`}>
        {screen === "dashboard" && user && (
          <DashboardScreen
            user={user}
            onGoLibrary={() => setScreen("library")}
            onResume={() => setScreen("session")}
          />
        )}
        {screen === "library" && (
          <LibraryScreen onSessionStart={() => setScreen("session")} />
        )}
        {screen === "session" && session && (
          <SessionScreen
            onComplete={() => setScreen("complete")}
            onExit={() => setScreen("dashboard")}
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
        {screen === "complete" && !session && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-brain-text-muted">
              <p className="mb-4">완료된 세션 정보가 없습니다.</p>
              <button
                onClick={() => setScreen("dashboard")}
                className="px-4 py-2 rounded-lg bg-brain-accent text-white text-sm"
              >
                대시보드로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
