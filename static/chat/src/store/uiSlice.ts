import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  activeConversation: string | null;
  searchQuery: string;
  isSearching: boolean;
  showInstanceSelector: boolean;
  showSettings: boolean;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const stored = localStorage.getItem('wuzapi_theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const initialState: UIState = {
  sidebarOpen: true,
  theme: getInitialTheme(),
  activeConversation: null,
  searchQuery: '',
  isSearching: false,
  showInstanceSelector: false,
  showSettings: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('wuzapi_theme', action.payload);
      document.documentElement.classList.toggle('dark', action.payload === 'dark');
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('wuzapi_theme', state.theme);
      document.documentElement.classList.toggle('dark', state.theme === 'dark');
    },
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversation = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setIsSearching: (state, action: PayloadAction<boolean>) => {
      state.isSearching = action.payload;
    },
    setShowInstanceSelector: (state, action: PayloadAction<boolean>) => {
      state.showInstanceSelector = action.payload;
    },
    setShowSettings: (state, action: PayloadAction<boolean>) => {
      state.showSettings = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  toggleTheme,
  setActiveConversation,
  setSearchQuery,
  setIsSearching,
  setShowInstanceSelector,
  setShowSettings,
} = uiSlice.actions;

export default uiSlice.reducer;
