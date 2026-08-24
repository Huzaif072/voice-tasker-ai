import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Task } from "@/types/task";

interface TaskState {
  items: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = { items: [], loading: false, error: null };

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    setTasks(state, action: PayloadAction<Task[]>) {
      state.items = action.payload;
      state.loading = false;
    },
    addTask(state, action: PayloadAction<Task>) {
      state.items.unshift(action.payload);
    },
    updateTask(state, action: PayloadAction<Task>) {
      const idx = state.items.findIndex((t) => t._id === action.payload._id);
      if (idx >= 0) state.items[idx] = action.payload;
    },
    removeTask(state, action: PayloadAction<string>) {
      state.items = state.items.filter((t) => t._id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setTasks, addTask, updateTask, removeTask, setLoading, setError } =
  taskSlice.actions;
export default taskSlice.reducer;
