import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Auth, setUnauthorizedHandler, tokenStore } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "checking" until we know whether a stored token is still valid
  const [status, setStatus] = useState(tokenStore.get() ? "checking" : "anonymous");
  // shown on the sign-in page, e.g. after a session expires
  const [notice, setNotice] = useState("");

  const clear = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((detail) => {
      setNotice(detail || "Please sign in again.");
      clear();
    });
    if (!tokenStore.get()) return;
    Auth.me()
      .then((me) => {
        setUser(me);
        setStatus("authenticated");
      })
      .catch(clear);
  }, [clear]);

  const accept = useCallback(({ token, user }) => {
    tokenStore.set(token);
    setNotice("");
    setUser(user);
    setStatus("authenticated");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      notice,
      login: async (creds) => accept(await Auth.login(creds)),
      register: async (data) => accept(await Auth.register(data)),
      logout: async () => {
        await Auth.logout().catch(() => {});
        clear();
      },
    }),
    [user, status, notice, accept, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
