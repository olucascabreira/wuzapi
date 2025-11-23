import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Conversation, TypingStatus, PresenceStatus } from '../types';

interface ConversationsState {
  items: Conversation[];
  typing: Record<string, TypingStatus>;
  presence: Record<string, PresenceStatus>;
  isLoading: boolean;
  error: string | null;
}

const initialState: ConversationsState = {
  items: [],
  typing: {},
  presence: {},
  isLoading: false,
  error: null,
};

const conversationsSlice = createSlice({
  name: 'conversations',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.items = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { chat_jid: string }>) => {
      const index = state.items.findIndex((c) => c.chat_jid === action.payload.chat_jid);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    },
    addOrUpdateConversation: (state, action: PayloadAction<Conversation>) => {
      const index = state.items.findIndex((c) => c.chat_jid === action.payload.chat_jid);
      if (index !== -1) {
        state.items[index] = action.payload;
      } else {
        state.items.unshift(action.payload);
      }
      // Sort by pinned first, then by last_message_at
      state.items.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      });
    },
    incrementUnread: (state, action: PayloadAction<string>) => {
      const conv = state.items.find((c) => c.chat_jid === action.payload);
      if (conv) {
        conv.unread_count += 1;
      }
    },
    resetUnread: (state, action: PayloadAction<string>) => {
      const conv = state.items.find((c) => c.chat_jid === action.payload);
      if (conv) {
        conv.unread_count = 0;
      }
    },
    setTyping: (state, action: PayloadAction<TypingStatus[]>) => {
      state.typing = {};
      action.payload.forEach((t) => {
        state.typing[t.chat_jid] = t;
      });
    },
    updateTyping: (state, action: PayloadAction<TypingStatus>) => {
      if (action.payload.is_typing) {
        state.typing[action.payload.chat_jid] = action.payload;
      } else {
        delete state.typing[action.payload.chat_jid];
      }
    },
    setPresence: (state, action: PayloadAction<PresenceStatus[]>) => {
      action.payload.forEach((p) => {
        state.presence[p.jid] = p;
      });
    },
    updatePresence: (state, action: PayloadAction<PresenceStatus>) => {
      state.presence[action.payload.jid] = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const {
  setConversations,
  updateConversation,
  addOrUpdateConversation,
  incrementUnread,
  resetUnread,
  setTyping,
  updateTyping,
  setPresence,
  updatePresence,
  setLoading,
  setError,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
