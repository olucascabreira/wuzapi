import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setActiveConversation } from '../../store/uiSlice';
import { setConversations } from '../../store/conversationsSlice';
import { setConnectionStatus, logout } from '../../store/authSlice';
import { usePolling } from '../../hooks/usePolling';
import api from '../../services/api';
import ConversationList from '../conversations/ConversationList';
import ChatView from '../chat/ChatView';
import Header from './Header';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function MainLayout() {
  const dispatch = useDispatch();
  const { activeConversation } = useSelector((state: RootState) => state.ui);
  const { isConnected, isLoggedIn, instanceName } = useSelector(
    (state: RootState) => state.auth
  );
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Enable polling
  usePolling({ enabled: isConnected && isLoggedIn, interval: 3000 });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const status = await api.getStatus();
      dispatch(
        setConnectionStatus({
          connected: status.Connected,
          loggedIn: status.LoggedIn,
        })
      );

      if (status.Connected && status.LoggedIn) {
        await loadConversations();
      } else if (!status.Connected) {
        // Try to connect
        await api.connect();
        const newStatus = await api.getStatus();
        dispatch(
          setConnectionStatus({
            connected: newStatus.Connected,
            loggedIn: newStatus.LoggedIn,
          })
        );

        if (!newStatus.LoggedIn) {
          // Get QR code
          await fetchQR();
        } else {
          await loadConversations();
        }
      } else if (!status.LoggedIn) {
        await fetchQR();
      }
    } catch (error) {
      console.error('Status check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQR = async () => {
    try {
      const qrResponse = await api.getQR();
      if (qrResponse.QRCode) {
        setQrCode(qrResponse.QRCode);
      }
    } catch (error) {
      console.error('QR fetch failed:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await api.getConversations();
      if (response.success) {
        dispatch(setConversations(response.conversations));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn && qrCode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Scan QR Code
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Open WhatsApp on your phone, go to Settings &gt; Linked Devices &gt;
            Link a Device and scan this code.
          </p>
          <div className="bg-white p-4 rounded-lg inline-block mb-6">
            <img src={qrCode} alt="QR Code" className="w-64 h-64" />
          </div>
          <div className="flex gap-4">
            <button
              onClick={fetchQR}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              Refresh QR
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header instanceName={instanceName || 'WuzAPI'} onLogout={handleLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversation List */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <ConversationList
            onSelectConversation={(jid) => dispatch(setActiveConversation(jid))}
            selectedJid={activeConversation}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <ChatView chatJid={activeConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">
                  Select a conversation
                </h3>
                <p className="text-gray-400 dark:text-gray-500 mt-1">
                  Choose a chat from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
