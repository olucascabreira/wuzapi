import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setMessages, addMessage } from '../../store/messagesSlice';
import { resetUnread } from '../../store/conversationsSlice';
import api from '../../services/api';
import { Message } from '../../types';
import { format } from 'date-fns';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Mic,
  X,
  Loader2,
} from 'lucide-react';

interface ChatViewProps {
  chatJid: string;
}

export default function ChatView({ chatJid }: ChatViewProps) {
  const dispatch = useDispatch();
  const messages = useSelector(
    (state: RootState) => state.messages.byChat[chatJid] || []
  );
  const conversations = useSelector(
    (state: RootState) => state.conversations.items
  );
  const typing = useSelector(
    (state: RootState) => state.conversations.typing[chatJid]
  );
  const presence = useSelector(
    (state: RootState) => state.conversations.presence
  );

  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const conversation = conversations.find((c) => c.chat_jid === chatJid);
  const contactJid = chatJid.split('@')[0];
  const contactPresence = presence[chatJid];

  useEffect(() => {
    loadMessages();
    // Reset unread count when opening chat
    dispatch(resetUnread(chatJid));
    api.resetUnread(chatJid).catch(console.error);
  }, [chatJid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await api.getHistory(chatJid, 100);
      if (response.messages) {
        // Sort messages by timestamp
        const sortedMessages = [...response.messages].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        dispatch(setMessages({ chatJid, messages: sortedMessages }));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const text = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      const response = await api.sendText({
        Phone: contactJid,
        Body: text,
      });

      if (response.Id) {
        // Add optimistic message
        const newMessage: Message = {
          id: Date.now(),
          user_id: '',
          chat_jid: chatJid,
          sender_jid: '',
          message_id: response.Id,
          timestamp: new Date().toISOString(),
          message_type: 'text',
          text_content: text,
          is_from_me: true,
          is_forwarded: false,
          is_edited: false,
          is_deleted: false,
          status: 'sent',
        };
        dispatch(addMessage({ chatJid, message: newMessage }));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input on error
      setInputValue(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
      default:
        return <Check className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const name = conversation?.name || contactJid;

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* Chat Header */}
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-medium">
          {name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h2 className="font-medium text-gray-900 dark:text-white">{name}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {typing ? (
              <span className="text-green-500">typing...</span>
            ) : contactPresence?.is_online ? (
              'online'
            ) : (
              'offline'
            )}
          </p>
        </div>

        {/* Actions */}
        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <Phone className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <Video className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No messages yet
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.message_id || index}
                message={message}
                formatTime={formatMessageTime}
                getStatusIcon={getStatusIcon}
              />
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-end gap-2">
          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <Smile className="w-5 h-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="p-3 bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white rounded-full transition-colors"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  formatTime: (timestamp: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
}

function MessageBubble({ message, formatTime, getStatusIcon }: MessageBubbleProps) {
  const isFromMe = message.is_from_me;

  const renderContent = () => {
    if (message.is_deleted) {
      return (
        <span className="italic text-gray-400 dark:text-gray-500">
          This message was deleted
        </span>
      );
    }

    switch (message.message_type) {
      case 'image':
        return (
          <div>
            {message.media_link && (
              <img
                src={message.media_link}
                alt="Image"
                className="rounded-lg max-w-xs mb-1"
              />
            )}
            {message.text_content && message.text_content !== ':image:' && (
              <p>{message.text_content}</p>
            )}
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            <span>Voice message</span>
          </div>
        );
      case 'document':
        return (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>{message.text_content || 'Document'}</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            <span>Video</span>
          </div>
        );
      default:
        return <p className="whitespace-pre-wrap">{message.text_content}</p>;
    }
  };

  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`message-bubble px-4 py-2 ${
          isFromMe ? 'message-bubble-sent' : 'message-bubble-received'
        }`}
      >
        {!isFromMe && message.push_name && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
            {message.push_name}
          </p>
        )}
        {renderContent()}
        <div
          className={`flex items-center gap-1 mt-1 ${
            isFromMe ? 'justify-end' : 'justify-start'
          }`}
        >
          <span
            className={`text-xs ${
              isFromMe ? 'text-green-100' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {formatTime(message.timestamp)}
          </span>
          {message.is_edited && (
            <span
              className={`text-xs ${
                isFromMe ? 'text-green-100' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              (edited)
            </span>
          )}
          {isFromMe && getStatusIcon(message.status)}
        </div>
      </div>
    </div>
  );
}
