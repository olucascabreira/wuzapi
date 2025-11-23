import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../types';

interface MessagesState {
  byChat: Record<string, Message[]>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  byChat: {},
  isLoading: false,
  isSending: false,
  error: null,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<{ chatJid: string; messages: Message[] }>) => {
      state.byChat[action.payload.chatJid] = action.payload.messages;
      state.isLoading = false;
    },
    addMessage: (state, action: PayloadAction<{ chatJid: string; message: Message }>) => {
      const { chatJid, message } = action.payload;
      if (!state.byChat[chatJid]) {
        state.byChat[chatJid] = [];
      }
      // Check if message already exists
      const exists = state.byChat[chatJid].some((m) => m.message_id === message.message_id);
      if (!exists) {
        state.byChat[chatJid].push(message);
        // Sort by timestamp
        state.byChat[chatJid].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    },
    addMessages: (state, action: PayloadAction<{ chatJid: string; messages: Message[] }>) => {
      const { chatJid, messages } = action.payload;
      if (!state.byChat[chatJid]) {
        state.byChat[chatJid] = [];
      }
      messages.forEach((message) => {
        const exists = state.byChat[chatJid].some((m) => m.message_id === message.message_id);
        if (!exists) {
          state.byChat[chatJid].push(message);
        }
      });
      // Sort by timestamp
      state.byChat[chatJid].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    },
    updateMessage: (
      state,
      action: PayloadAction<{ chatJid: string; messageId: string; updates: Partial<Message> }>
    ) => {
      const { chatJid, messageId, updates } = action.payload;
      if (state.byChat[chatJid]) {
        const index = state.byChat[chatJid].findIndex((m) => m.message_id === messageId);
        if (index !== -1) {
          state.byChat[chatJid][index] = { ...state.byChat[chatJid][index], ...updates };
        }
      }
    },
    deleteMessage: (state, action: PayloadAction<{ chatJid: string; messageId: string }>) => {
      const { chatJid, messageId } = action.payload;
      if (state.byChat[chatJid]) {
        const index = state.byChat[chatJid].findIndex((m) => m.message_id === messageId);
        if (index !== -1) {
          state.byChat[chatJid][index].is_deleted = true;
        }
      }
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      delete state.byChat[action.payload];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setSending: (state, action: PayloadAction<boolean>) => {
      state.isSending = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isSending = false;
    },
  },
});

export const {
  setMessages,
  addMessage,
  addMessages,
  updateMessage,
  deleteMessage,
  clearMessages,
  setLoading,
  setSending,
  setError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
