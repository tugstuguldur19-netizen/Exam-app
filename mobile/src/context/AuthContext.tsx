import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError, clearToken, getToken, setSessionExpiredHandler, setToken } from "../api/client";
import type { User } from "../types";

const USER_KEY = "exam_prep_user";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function cacheUser(user: User | null) {
  try {
    if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    else await AsyncStorage.removeItem(USER_KEY);
  } catch {
    // Cache only; the server is the source of truth.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    cacheUser(u);
  }, []);

  const logout = useCallback(async () => {
    await clearToken().catch(() => {});
    setUser(null);
  }, [setUser]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      logout();
    });
    return () => setSessionExpiredHandler(null);
  }, [logout]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken().catch(() => null);
        if (!token) return;
        // Show the cached profile immediately; refresh it from the server.
        const cached = await AsyncStorage.getItem(USER_KEY).catch(() => null);
        if (cached) setUserState(JSON.parse(cached));
        try {
          const me = await api.me();
          setUser(me.user);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) await logout();
          // Offline / server asleep: stay signed in with the cached profile.
          else if (!cached) setUserState({ id: "", email: "", name: "" });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [logout, setUser]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    await setToken(res.token);
    setUser(res.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.register(email, password, name);
    await setToken(res.token);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
