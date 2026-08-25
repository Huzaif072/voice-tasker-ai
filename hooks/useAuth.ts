"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { RootState } from "@/store";
import { setUser, setLoading, logout as logoutAction } from "@/store/slices/authSlice";

async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return null;
  const data = await response.json();
  return data.user ?? null;
}

export function useAuth() {
  const router = useRouter();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const reduxUser = useSelector((s: RootState) => s.auth.user);
  const { data: user = null, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    dispatch(setLoading(isLoading));
    if (!isLoading) dispatch(setUser(user));
  }, [dispatch, isLoading, user]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      queryClient.setQueryData(["auth", "me"], null);
      dispatch(logoutAction());
      router.push("/login");
    }
  }, [dispatch, queryClient, router]);

  return { user: user ?? reduxUser, loading: isLoading, logout, isAuthenticated: Boolean(user ?? reduxUser) };
}

export function useAuthActions() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  const login = useCallback(
    async (email: string, password: string) => {
      dispatch(setLoading(true));
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        dispatch(setLoading(false));
        throw new Error(data.error);
      }
      dispatch(setUser(data.user));
      queryClient.setQueryData(["auth", "me"], data.user);
      return data;
    },
    [dispatch, queryClient]
  );

  return { login };
}
