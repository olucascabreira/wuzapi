// API Types
export interface Instance {
  id: string;
  name: string;
  token: string;
  jid: string;
  connected: boolean;
  webhook: string;
  events: string;
}

export interface Conversation {
  id: number;
  user_id: string;
  chat_jid: string;
  name: string;
  avatar_url?: string;
  is_group: boolean;
  last_message_id?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count: number;
  is_muted: boolean;
  is_archived: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  user_id: string;
  chat_jid: string;
  sender_jid: string;
  message_id: string;
  timestamp: string;
  message_type: MessageType;
  text_content: string;
  media_link?: string;
  quoted_message_id?: string;
  data_json?: string;
  is_from_me: boolean;
  is_forwarded: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reactions?: string;
  media_mime_type?: string;
  media_size?: number;
  media_thumbnail?: string;
  push_name?: string;
  status: MessageStatus;
}

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'contact'
  | 'location'
  | 'poll'
  | 'reaction'
  | 'delete';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface TypingStatus {
  chat_jid: string;
  sender_jid: string;
  is_typing: boolean;
  media?: string;
  timestamp: number;
}

export interface PresenceStatus {
  jid: string;
  is_online: boolean;
  last_seen?: number;
  timestamp: number;
}

export interface MessageStatusUpdate {
  message_id: string;
  status: string;
  timestamp: number;
}

export interface PollResponse {
  messages: Message[];
  typing: TypingStatus[];
  presence: PresenceStatus[];
  receipts: MessageStatusUpdate[];
  timestamp: number;
  has_more: boolean;
}

export interface Contact {
  jid: string;
  name: string;
  notify?: string;
  verified_name?: string;
}

export interface Group {
  jid: string;
  name: string;
  topic?: string;
  owner?: string;
  participants?: GroupParticipant[];
  created_at?: string;
}

export interface GroupParticipant {
  jid: string;
  is_admin: boolean;
  is_super_admin: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
  count: number;
}

export interface MessagesResponse {
  success: boolean;
  messages: Message[];
}

export interface PollApiResponse {
  success: boolean;
  data: PollResponse;
}

// UI State Types
export interface AuthState {
  token: string | null;
  instanceId: string | null;
  isAuthenticated: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  activeConversation: string | null;
  searchQuery: string;
  isSearching: boolean;
}

// Send Message Types
export interface SendTextPayload {
  Phone: string;
  Body: string;
  Id?: string;
}

export interface SendImagePayload {
  Phone: string;
  Image: string;
  Caption?: string;
  Id?: string;
}

export interface SendAudioPayload {
  Phone: string;
  Audio: string;
  Id?: string;
}

export interface SendDocumentPayload {
  Phone: string;
  Document: string;
  FileName: string;
  Caption?: string;
  Id?: string;
}
