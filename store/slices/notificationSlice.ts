import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Notification } from "@/types/notification";

interface NotificationState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = { items: [], unreadCount: 0 };

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<Notification[]>) {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find((i) => i._id === action.payload);
      if (n && !n.read) {
        n.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      if (!action.payload.read) state.unreadCount++;
    },
  },
});

export const { setNotifications, markRead, addNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
