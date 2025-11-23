import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import conversationsReducer from './conversationsSlice';
import messagesReducer from './messagesSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    conversations: conversationsReducer,
    messages: messagesReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
