import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Conversation } from '../../types';
import { Search, Users, Archive, Pin, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  onSelectConversation: (jid: string) => void;
  selectedJid: string | null;
}

type FilterType = 'all' | 'unread' | 'groups' | 'archived';

export default function ConversationList({
  onSelectConversation,
  selectedJid,
}: ConversationListProps) {
  const { items: conversations, typing } = useSelector(
    (state: RootState) => state.conversations
  );
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    // Search filter
    if (search && !conv.name?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    // Type filter
    switch (filter) {
      case 'unread':
        return conv.unread_count > 0;
      case 'groups':
        return conv.is_group;
      case 'archived':
        return conv.is_archived;
      default:
        return !conv.is_archived;
    }
  });

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 border-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
        {(['all', 'unread', 'groups', 'archived'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filter === f
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv.chat_jid}
              conversation={conv}
              isSelected={selectedJid === conv.chat_jid}
              isTyping={!!typing[conv.chat_jid]}
              onClick={() => onSelectConversation(conv.chat_jid)}
              formatTime={formatTime}
              getInitials={getInitials}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isTyping: boolean;
  onClick: () => void;
  formatTime: (timestamp?: string) => string;
  getInitials: (name: string) => string;
}

function ConversationItem({
  conversation,
  isSelected,
  isTyping,
  onClick,
  formatTime,
  getInitials,
}: ConversationItemProps) {
  const name = conversation.name || conversation.chat_jid.split('@')[0];

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
        isSelected ? 'bg-green-50 dark:bg-green-900/20' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        {conversation.avatar_url ? (
          <img
            src={conversation.avatar_url}
            alt={name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
              conversation.is_group ? 'bg-blue-500' : 'bg-green-500'
            }`}
          >
            {conversation.is_group ? (
              <Users className="w-5 h-5" />
            ) : (
              getInitials(name)
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1">
            {conversation.is_pinned && (
              <Pin className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
            {name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
            {conversation.is_muted && (
              <BellOff className="w-3 h-3 flex-shrink-0" />
            )}
            {isTyping ? (
              <span className="text-green-500 italic">typing...</span>
            ) : (
              conversation.last_message_preview || 'No messages'
            )}
          </span>
          {conversation.unread_count > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
