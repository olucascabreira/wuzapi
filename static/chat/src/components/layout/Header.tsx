import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { toggleTheme, setSearchQuery } from '../../store/uiSlice';
import { MessageSquare, Moon, Sun, LogOut, Search, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  instanceName: string;
  onLogout: () => void;
}

export default function Header({ instanceName, onLogout }: HeaderProps) {
  const dispatch = useDispatch();
  const { theme, searchQuery } = useSelector((state: RootState) => state.ui);
  const { isConnected, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">WuzAPI Chat</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{instanceName}</p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 ml-4">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected && isLoggedIn
              ? 'bg-green-500'
              : isConnected
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {isConnected && isLoggedIn
            ? 'Connected'
            : isConnected
            ? 'Waiting for login'
            : 'Disconnected'}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      {showSearch ? (
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            className="bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white w-48"
            autoFocus
          />
          <button
            onClick={() => {
              setShowSearch(false);
              dispatch(setSearchQuery(''));
            }}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      )}

      {/* Theme toggle */}
      <button
        onClick={() => dispatch(toggleTheme())}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
        title="Logout"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
