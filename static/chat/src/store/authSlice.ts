import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  adminToken: string | null;
  instanceId: string | null;
  instanceName: string | null;
  isAuthenticated: boolean;
  isConnected: boolean;
  isLoggedIn: boolean;
}

const initialState: AuthState = {
  token: localStorage.getItem('wuzapi_token'),
  adminToken: localStorage.getItem('wuzapi_admin_token'),
  instanceId: localStorage.getItem('wuzapi_instance_id'),
  instanceName: localStorage.getItem('wuzapi_instance_name'),
  isAuthenticated: !!localStorage.getItem('wuzapi_token'),
  isConnected: false,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        instanceId: string;
        instanceName: string;
      }>
    ) => {
      state.token = action.payload.token;
      state.instanceId = action.payload.instanceId;
      state.instanceName = action.payload.instanceName;
      state.isAuthenticated = true;
      localStorage.setItem('wuzapi_token', action.payload.token);
      localStorage.setItem('wuzapi_instance_id', action.payload.instanceId);
      localStorage.setItem('wuzapi_instance_name', action.payload.instanceName);
    },
    setAdminToken: (state, action: PayloadAction<string>) => {
      state.adminToken = action.payload;
      localStorage.setItem('wuzapi_admin_token', action.payload);
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<{ connected: boolean; loggedIn: boolean }>
    ) => {
      state.isConnected = action.payload.connected;
      state.isLoggedIn = action.payload.loggedIn;
    },
    logout: (state) => {
      state.token = null;
      state.instanceId = null;
      state.instanceName = null;
      state.isAuthenticated = false;
      state.isConnected = false;
      state.isLoggedIn = false;
      localStorage.removeItem('wuzapi_token');
      localStorage.removeItem('wuzapi_instance_id');
      localStorage.removeItem('wuzapi_instance_name');
    },
    clearAdminToken: (state) => {
      state.adminToken = null;
      localStorage.removeItem('wuzapi_admin_token');
    },
  },
});

export const {
  setCredentials,
  setAdminToken,
  setConnectionStatus,
  logout,
  clearAdminToken,
} = authSlice.actions;

export default authSlice.reducer;
