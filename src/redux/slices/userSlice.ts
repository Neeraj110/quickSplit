import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface IUser {
  _id: string;
  name: string;
  avatar?: string;
  email: string;
  groups?: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserState {
  user: IUser | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<IUser>) => {
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setCredentials, logout } = userSlice.actions;
export const userReducer = userSlice.reducer;
