import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setTyping, setPresence, addOrUpdateConversation } from '../store/conversationsSlice';
import { addMessages, updateMessage } from '../store/messagesSlice';
import api from '../services/api';
import { Message, Conversation } from '../types';

interface UsePollingOptions {
  enabled?: boolean;
  interval?: number;
  chatJid?: string;
}

export function usePolling(options: UsePollingOptions = {}) {
  const { enabled = true, interval = 3000, chatJid } = options;
  const dispatch = useDispatch();
  const { isAuthenticated, isConnected } = useSelector((state: RootState) => state.auth);
  const lastTimestamp = useRef<number>(Math.floor(Date.now() / 1000) - 300);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    if (!isAuthenticated || !isConnected) return;

    try {
      const response = await api.poll(lastTimestamp.current, chatJid, 100);

      if (response.success && response.data) {
        const { messages, typing, presence, receipts, timestamp } = response.data;

        // Update last timestamp
        lastTimestamp.current = timestamp;

        // Update typing indicators
        if (typing && typing.length > 0) {
          dispatch(setTyping(typing));
        }

        // Update presence
        if (presence && presence.length > 0) {
          dispatch(setPresence(presence));
        }

        // Add new messages
        if (messages && messages.length > 0) {
          // Group messages by chat
          const messagesByChat: Record<string, Message[]> = {};
          messages.forEach((msg) => {
            if (!messagesByChat[msg.chat_jid]) {
              messagesByChat[msg.chat_jid] = [];
            }
            messagesByChat[msg.chat_jid].push(msg);
          });

          // Dispatch messages for each chat
          Object.entries(messagesByChat).forEach(([jid, msgs]) => {
            dispatch(addMessages({ chatJid: jid, messages: msgs }));

            // Update conversation with last message
            if (msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              const preview = lastMsg.text_content || `[${lastMsg.message_type}]`;
              dispatch(
                addOrUpdateConversation({
                  chat_jid: jid,
                  last_message_id: lastMsg.message_id,
                  last_message_preview: preview.substring(0, 100),
                  last_message_at: lastMsg.timestamp,
                  unread_count: lastMsg.is_from_me ? 0 : 1,
                } as Conversation)
              );
            }
          });
        }

        // Update message statuses from receipts
        if (receipts && receipts.length > 0) {
          receipts.forEach((receipt) => {
            // We need to find the chat for this message - this is a simplification
            // In a real app, you'd want to track message -> chat mapping
            dispatch(
              updateMessage({
                chatJid: chatJid || '',
                messageId: receipt.message_id,
                updates: { status: receipt.status as Message['status'] },
              })
            );
          });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, [dispatch, isAuthenticated, isConnected, chatJid]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !isConnected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, poll, isAuthenticated, isConnected]);

  return { poll };
}
