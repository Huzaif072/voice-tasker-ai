"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface DashboardSearchContextValue {
  search: string;
  setSearch: (value: string) => void;
}

const DashboardSearchContext = createContext<DashboardSearchContextValue | null>(null);

export function DashboardSearchProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState("");
  const value = useMemo(() => ({ search, setSearch }), [search]);

  return <DashboardSearchContext.Provider value={value}>{children}</DashboardSearchContext.Provider>;
}

export function useDashboardSearch(): DashboardSearchContextValue {
  const context = useContext(DashboardSearchContext);
  if (!context) throw new Error("useDashboardSearch must be used within DashboardSearchProvider");
  return context;
}
