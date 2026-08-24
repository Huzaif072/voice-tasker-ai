"use client";

import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/store";
import { setUser, setLoading, logout as logoutAction } from "@/store/slices/authSlice";

export function useAuth() {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => dispatch(setUser(data?.user ?? null)))
      .catch(() => dispatch(setUser(null)));
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      dispatch(logoutAction());
      window.location.href = "/login";
    }
  }, [dispatch]);

  return { user, loading, logout, isAuthenticated: !!user };
}

export function useAuthActions() {
  const dispatch = useDispatch();

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(setLoading(true));
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      dispatch(setUser(data.user));
      return data;
    },
    [dispatch]
  );

  return { login };
}
