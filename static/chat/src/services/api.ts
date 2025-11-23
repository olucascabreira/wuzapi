import axios, { AxiosInstance } from 'axios';
import {
  Instance,
  Conversation,
  Message,
  Contact,
  Group,
  ConversationsResponse,
  MessagesResponse,
  PollApiResponse,
  SendTextPayload,
  SendImagePayload,
  SendAudioPayload,
  SendDocumentPayload,
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers['Token'] = this.token;
      }
      return config;
    });
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  // Instance Management (Admin)
  async getInstances(adminToken: string): Promise<Instance[]> {
    const response = await this.client.get('/admin/users', {
      headers: { Token: adminToken },
    });
    return response.data;
  }

  async createInstance(adminToken: string, name: string): Promise<Instance> {
    const response = await this.client.post(
      '/admin/users',
      { name },
      { headers: { Token: adminToken } }
    );
    return response.data;
  }

  async deleteInstance(adminToken: string, id: string): Promise<void> {
    await this.client.delete(`/admin/users/${id}`, {
      headers: { Token: adminToken },
    });
  }

  // Session
  async connect(): Promise<{ Details: string }> {
    const response = await this.client.post('/session/connect');
    return response.data;
  }

  async disconnect(): Promise<{ Details: string }> {
    const response = await this.client.post('/session/disconnect');
    return response.data;
  }

  async getStatus(): Promise<{ Connected: boolean; LoggedIn: boolean }> {
    const response = await this.client.get('/session/status');
    return response.data;
  }

  async getQR(): Promise<{ QRCode: string }> {
    const response = await this.client.get('/session/qr');
    return response.data;
  }

  // Conversations
  async getConversations(includeArchived = false): Promise<ConversationsResponse> {
    const response = await this.client.get('/chat/conversations', {
      params: { include_archived: includeArchived },
    });
    return response.data;
  }

  async getConversation(chatJid: string, limit = 50, offset = 0): Promise<{
    success: boolean;
    conversation: Conversation;
    messages: Message[];
  }> {
    const response = await this.client.get(`/chat/conversations/${encodeURIComponent(chatJid)}`, {
      params: { limit, offset },
    });
    return response.data;
  }

  async updateConversation(
    chatJid: string,
    updates: { is_muted?: boolean; is_archived?: boolean; is_pinned?: boolean }
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.client.patch(
      `/chat/conversations/${encodeURIComponent(chatJid)}`,
      updates
    );
    return response.data;
  }

  async resetUnread(chatJid: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post(
      `/chat/conversations/${encodeURIComponent(chatJid)}/unread`
    );
    return response.data;
  }

  // Messages
  async getHistory(chatJid: string, limit = 50): Promise<MessagesResponse> {
    const response = await this.client.get('/chat/history', {
      params: { chat_jid: chatJid, limit },
    });
    // The API returns array directly
    const messages = Array.isArray(response.data) ? response.data : [];
    return { success: true, messages };
  }

  async searchMessages(
    query: string,
    chatJid?: string,
    limit = 50
  ): Promise<{ success: boolean; messages: Message[]; count: number }> {
    const response = await this.client.get('/chat/messages/search', {
      params: { q: query, chat_jid: chatJid, limit },
    });
    return response.data;
  }

  async getMessageStatus(messageId: string): Promise<{ success: boolean; statuses: any[] }> {
    const response = await this.client.get(`/chat/messages/${messageId}/status`);
    return response.data;
  }

  // Polling
  async poll(since?: number, chatJid?: string, limit = 100): Promise<PollApiResponse> {
    const response = await this.client.get('/chat/poll', {
      params: { since, chat_jid: chatJid, limit },
    });
    return response.data;
  }

  // Send Messages
  async sendText(payload: SendTextPayload): Promise<{ Details: string; Id: string; Timestamp: number }> {
    const response = await this.client.post('/chat/send/text', payload);
    return response.data;
  }

  async sendImage(payload: SendImagePayload): Promise<{ Details: string; Id: string; Timestamp: number }> {
    const response = await this.client.post('/chat/send/image', payload);
    return response.data;
  }

  async sendAudio(payload: SendAudioPayload): Promise<{ Details: string; Id: string; Timestamp: number }> {
    const response = await this.client.post('/chat/send/audio', payload);
    return response.data;
  }

  async sendDocument(payload: SendDocumentPayload): Promise<{ Details: string; Id: string; Timestamp: number }> {
    const response = await this.client.post('/chat/send/document', payload);
    return response.data;
  }

  async deleteMessage(phone: string, messageId: string): Promise<{ Details: string }> {
    const response = await this.client.post('/chat/delete', {
      Phone: phone,
      MessageId: messageId,
    });
    return response.data;
  }

  async reactToMessage(phone: string, messageId: string, emoji: string): Promise<{ Details: string }> {
    const response = await this.client.post('/chat/react', {
      Phone: phone,
      MessageId: messageId,
      Emoji: emoji,
    });
    return response.data;
  }

  async markAsRead(chatPhone: string, messageIds: string[]): Promise<{ Details: string }> {
    const response = await this.client.post('/chat/markread', {
      ChatPhone: chatPhone,
      Id: messageIds,
    });
    return response.data;
  }

  // User/Contact
  async getContacts(): Promise<Contact[]> {
    const response = await this.client.get('/user/contacts');
    return response.data;
  }

  async getUserInfo(phone: string): Promise<any> {
    const response = await this.client.post('/user/info', { Phone: phone });
    return response.data;
  }

  async getAvatar(phone: string): Promise<{ URL: string }> {
    const response = await this.client.post('/user/avatar', { Phone: phone });
    return response.data;
  }

  // Groups
  async getGroups(): Promise<Group[]> {
    const response = await this.client.get('/group/list');
    return response.data;
  }

  async getGroupInfo(groupJid: string): Promise<Group> {
    const response = await this.client.get('/group/info', {
      params: { groupJID: groupJid },
    });
    return response.data;
  }

  // Typing indicator
  async sendTyping(phone: string, state: 'composing' | 'paused'): Promise<{ Details: string }> {
    const response = await this.client.post('/chat/presence', {
      Phone: phone,
      State: state,
    });
    return response.data;
  }
}

export const api = new ApiService();
export default api;
