import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types/user";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

const initialState: AuthState = { user: null, loading: true };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.loading = false;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    logout(state) {
      state.user = null;
    },
  },
});

export const { setUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
