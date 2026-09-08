"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, login as apiLogin, logout as apiLogout, resendSignupOtp as apiResendSignupOtp, startSignup as apiStartSignup, verifySignup as apiVerifySignup } from "@/lib/api";
import { AUTH_EVENT, AuthError, getToken, type AuthUser } from "@/lib/session";

type AuthState = {
  ready: boolean;
  user: AuthUser | null;
  notice: string | null;
  login: (email: string, password: string) => Promise<void>;
  startSignup: (input: {
    name: string;
    company: string;
    phone: string;
    email: string;
    password: string;
  }) => Promise<{ email: string; expiresIn: number; resendIn: number }>;
  verifySignup: (email: string, otp: string) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<{ expiresIn: number; resendIn: number }>;
  logout: () => Promise<void>;
  applyUsage: (usage: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const next = await fetchMe();
      setUser(next);
      setNotice(null);
    } catch (err) {
      if (err instanceof AuthError && err.code === "CLOCK_SKEW") {
        setReady(true);
        return;
      }
      setUser(null);
      if (err instanceof AuthError && err.code === "SESSION_REPLACED") {
        setNotice("Signed in on another device. This desk was signed out.");
      } else if (err instanceof AuthError && err.code === "ACCOUNT_BANNED") {
        setNotice("This account is banned. Contact an administrator.");
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onAuth = () => void refresh();
    const onFocus = () => void refresh();
    window.addEventListener(AUTH_EVENT, onAuth);
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const next = await apiLogin(email, password);
    setUser(next);
    setNotice(null);
  }, []);

  const startSignup = useCallback(
    async (input: {
      name: string;
      company: string;
      phone: string;
      email: string;
      password: string;
    }) => {
      const result = await apiStartSignup(input);
      return { email: result.email, expiresIn: result.expiresIn, resendIn: result.resendIn };
    },
    [],
  );

  const verifySignup = useCallback(async (email: string, otp: string) => {
    const next = await apiVerifySignup(email, otp);
    setUser(next);
    setNotice(null);
  }, []);

  const resendSignupOtp = useCallback(async (email: string) => {
    const result = await apiResendSignupOtp(email);
    return { expiresIn: result.expiresIn, resendIn: result.resendIn };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setNotice(null);
  }, []);

  const applyUsage = useCallback((usage: Partial<AuthUser>) => {
    setUser((current) => (current ? { ...current, ...usage } : current));
  }, []);

  const value = useMemo(
    () => ({ ready, user, notice, login, startSignup, verifySignup, resendSignupOtp, logout, applyUsage }),
    [ready, user, notice, login, startSignup, verifySignup, resendSignupOtp, logout, applyUsage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
