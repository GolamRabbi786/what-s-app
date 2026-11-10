import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { seedState } from '../lib/data';
import { Palette, palettes } from '../lib/theme';
import {
  AppState,
  AppUser,
  CallLog,
  Chat,
  ChatFilter,
  Community,
  Message,
  MessageKind,
  ReplyTo,
  StatusGroup,
  ThemeMode,
} from '../lib/types';

const STORAGE_KEY = 'whatsapp-web-clone-state-v2';

type ChatFlag = 'pinned' | 'muted' | 'archived' | 'favorite';

interface SendOptions {
  kind?: MessageKind;
  image?: string;
  duration?: string;
  fileName?: string;
  fileSize?: string;
  replyTo?: ReplyTo;
}

interface TypingState {
  chatId: string;
  label: string;
}

interface AppContextValue {
  state: AppState;
  theme: Palette;
  hydrated: boolean;
  activeChatId: string | null;
  typing: TypingState | null;
  filter: ChatFilter;
  query: string;
  setFilter: (filter: ChatFilter) => void;
  setQuery: (query: string) => void;
  openChat: (chatId: string) => void;
  closeChat: () => void;
  markChatRead: (chatId: string) => void;
  markAllRead: () => void;
  sendMessage: (chatId: string, text: string, options?: SendOptions) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  toggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  clearChatMessages: (chatId: string) => void;
  toggleChatFlag: (chatId: string, flag: ChatFlag) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  addStatus: (input: { caption: string; background: string; image?: string }) => void;
  markStatusViewed: (statusId: string) => void;
  updateUser: (updates: Partial<AppUser>) => void;
  addCall: (call: CallLog) => void;
  clearCalls: () => void;
  createGroup: (name: string, memberIds: string[], avatar?: string) => string;
  createCommunity: (name: string, description: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

const AUTO_REPLIES: Record<
  string,
  { senderId: string; senderName: string; text: string }[]
> = {
  maya: [
    { senderId: 'maya', senderName: 'Maya', text: 'Perfect — I’ll send the location in a sec 📍' },
    { senderId: 'maya', senderName: 'Maya', text: 'Just got here. The light is beautiful ✨' },
  ],
  zara: [
    { senderId: 'zara', senderName: 'Zara', text: 'Adding it to the playlist right now 🎧' },
    { senderId: 'zara', senderName: 'Zara', text: 'Okay, you’re going to love this one.' },
  ],
  rohan: [
    { senderId: 'rohan', senderName: 'Rohan', text: 'Perfect. I’ll send a calendar invite.' },
    { senderId: 'rohan', senderName: 'Rohan', text: 'Nice — catch you then 👍' },
  ],
  ananya: [
    { senderId: 'ananya', senderName: 'Ananya', text: 'Saving that for next time ☕' },
    { senderId: 'ananya', senderName: 'Ananya', text: 'Haha, exactly what I thought.' },
  ],
  dev: [
    { senderId: 'dev', senderName: 'Dev', text: 'Done. I’ll check the weather forecast.' },
    { senderId: 'dev', senderName: 'Dev', text: 'Let’s lock it in this week.' },
  ],
  kabir: [
    { senderId: 'kabir', senderName: 'Kabir', text: 'Sounds good!' },
    { senderId: 'kabir', senderName: 'Kabir', text: 'Got it — thanks for the update.' },
  ],
  'design-crew': [
    { senderId: 'priya', senderName: 'Priya', text: 'Nice one. I’ll take a look after standup.' },
    { senderId: 'rohan', senderName: 'Rohan', text: 'Agreed — let’s discuss in critique.' },
  ],
  family: [
    { senderId: 'mom', senderName: 'Mom', text: 'Perfect, see you Sunday ❤️' },
    { senderId: 'dad', senderName: 'Dad', text: 'I’ll add it to the list.' },
  ],
  product: [
    { senderId: 'priya', senderName: 'Priya', text: 'Noted — adding it to the doc.' },
    { senderId: 'arjun', senderName: 'Arjun', text: 'Good call. Let’s review in sprint planning.' },
  ],
  'book-club': [
    { senderId: 'nina', senderName: 'Nina', text: 'Good point. Let’s discuss on Sunday.' },
    { senderId: 'sam', senderName: 'Sam', text: 'Adding that to the reading list.' },
  ],
};

function mergeStoredState(stored: AppState): AppState {
  if (!stored || stored.version !== seedState.version) return seedState;
  return {
    ...seedState,
    ...stored,
    user: { ...seedState.user, ...stored.user },
    chats: Array.isArray(stored.chats) ? stored.chats : seedState.chats,
    messages: stored.messages ?? seedState.messages,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(seedState);
  const [hydrated, setHydrated] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState<TypingState | null>(null);
  const activeChatRef = useRef(activeChatId);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as AppState;
            setState(mergeStoredState(parsed));
          } catch {
            setState(seedState);
          }
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });

    return () => {
      mounted = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, hydrated]);

  useEffect(() => {
    if (!typing) return;
    const timeout = setTimeout(() => setTyping(null), 4500);
    return () => clearTimeout(timeout);
  }, [typing]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    timers.current.push(timer);
  }, []);

  const markChatRead = useCallback((chatId: string) => {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((chat) =>
        chat.id === chatId ? { ...chat, unread: 0 } : chat,
      ),
      messages: {
        ...prev.messages,
        [chatId]: (prev.messages[chatId] ?? []).map((item) =>
          item.senderId !== 'me' && item.status !== 'read'
            ? { ...item, status: 'read' }
            : item,
        ),
      },
    }));
  }, []);

  const openChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId);
      markChatRead(chatId);
    },
    [markChatRead],
  );

  const closeChat = useCallback(() => {
    setActiveChatId(null);
    setTyping(null);
  }, []);

  const markAllRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((chat) => ({ ...chat, unread: 0 })),
      messages: Object.fromEntries(
        Object.entries(prev.messages).map(([chatId, list]) => [
          chatId,
          list.map((item) =>
            item.senderId !== 'me' && item.status !== 'read'
              ? { ...item, status: 'read' as const }
              : item,
          ),
        ]),
      ),
    }));
  }, []);

  const simulateReply = useCallback(
    (chat: Chat) => {
      const replies = AUTO_REPLIES[chat.id];
      if (!replies || replies.length === 0) return;

      const reply = replies[Math.floor(Math.random() * replies.length)];
      schedule(() => setTyping({ chatId: chat.id, label: reply.senderName }), 1100);
      schedule(() => {
        const incoming: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          chatId: chat.id,
          senderId: reply.senderId,
          senderName: reply.senderName,
          text: reply.text,
          createdAt: new Date().toISOString(),
          status: 'read',
          kind: 'text',
        };
        setTyping(null);
        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [chat.id]: [...(prev.messages[chat.id] ?? []), incoming],
          },
          chats: prev.chats.map((item) =>
            item.id === chat.id
              ? {
                  ...item,
                  unread: activeChatRef.current === chat.id ? 0 : item.unread + 1,
                  lastMessageAt: incoming.createdAt,
                }
              : item,
          ),
        }));
      }, 3100);
    },
    [schedule],
  );

  const sendMessage = useCallback(
    (chatId: string, text: string, options: SendOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed && !options.image && !options.fileName) return;

      const chat = state.chats.find((item) => item.id === chatId);
      if (!chat) return;

      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const outgoing: Message = {
        id,
        chatId,
        senderId: 'me',
        senderName: 'You',
        text: trimmed,
        createdAt: new Date().toISOString(),
        status: 'sent',
        kind: options.kind ?? 'text',
        image: options.image,
        duration: options.duration,
        fileName: options.fileName,
        fileSize: options.fileSize,
        replyTo: options.replyTo,
      };

      setState((prev) => ({
        ...prev,
        messages: {
          ...prev.messages,
          [chatId]: [...(prev.messages[chatId] ?? []), outgoing],
        },
        chats: prev.chats.map((item) =>
          item.id === chatId
            ? { ...item, unread: 0, lastMessageAt: outgoing.createdAt }
            : item,
        ),
      }));

      schedule(() => {
        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [chatId]: (prev.messages[chatId] ?? []).map((item) =>
              item.id === id ? { ...item, status: 'delivered' } : item,
            ),
          },
        }));
      }, 800);

      schedule(() => {
        setState((prev) => ({
          ...prev,
          messages: {
            ...prev.messages,
            [chatId]: (prev.messages[chatId] ?? []).map((item) =>
              item.id === id ? { ...item, status: 'read' } : item,
            ),
          },
        }));
      }, 2100);

      if (!chat.group || AUTO_REPLIES[chat.id]) {
        simulateReply(chat);
      }
    },
    [schedule, simulateReply, state.chats],
  );

  const deleteMessage = useCallback((chatId: string, messageId: string) => {
    setState((prev) => {
      const remaining = (prev.messages[chatId] ?? []).filter((item) => item.id !== messageId);
      const last = remaining[remaining.length - 1];
      return {
        ...prev,
        messages: { ...prev.messages, [chatId]: remaining },
        chats: prev.chats.map((chat) =>
          chat.id === chatId && last ? { ...chat, lastMessageAt: last.createdAt } : chat,
        ),
      };
    });
  }, []);

  const toggleReaction = useCallback((chatId: string, messageId: string, emoji: string) => {
    setState((prev) => ({
      ...prev,
      messages: {
        ...prev.messages,
        [chatId]: (prev.messages[chatId] ?? []).map((item) => {
          if (item.id !== messageId) return item;
          const current = item.reactions ?? [];
          return {
            ...item,
            reactions: current.includes(emoji)
              ? current.filter((value) => value !== emoji)
              : [...current, emoji],
          };
        }),
      },
    }));
  }, []);

  const clearChatMessages = useCallback((chatId: string) => {
    setState((prev) => ({
      ...prev,
      messages: { ...prev.messages, [chatId]: [] },
      chats: prev.chats.map((chat) =>
        chat.id === chatId ? { ...chat, lastMessageAt: new Date().toISOString(), unread: 0 } : chat,
      ),
    }));
  }, []);

  const toggleChatFlag = useCallback(
    (chatId: string, flag: ChatFlag) => {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) =>
          chat.id === chatId ? { ...chat, [flag]: !chat[flag] } : chat,
        ),
      }));
      if (flag === 'archived' && activeChatRef.current === chatId) {
        setActiveChatId(null);
      }
    },
    [],
  );

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }, []);

  const addStatus = useCallback(
    (input: { caption: string; background: string; image?: string }) => {
      const items = [
        {
          id: `status-${Date.now()}`,
          type: input.image ? ('image' as const) : ('text' as const),
          image: input.image,
          caption: input.caption,
          background: input.background,
          duration: 5,
        },
      ];

      setState((prev) => {
        const existing = prev.statuses.find((item) => item.id === 'my-status');
        const myStatus: StatusGroup = existing
          ? {
              ...existing,
              time: 'Just now',
              viewed: false,
              items: [...existing.items, ...items],
            }
          : {
              id: 'my-status',
              name: prev.user.name,
              avatar: prev.user.avatar,
              time: 'Just now',
              viewed: false,
              items,
            };

        return {
          ...prev,
          statuses: [myStatus, ...prev.statuses.filter((item) => item.id !== 'my-status')],
        };
      });
    },
    [],
  );

  const markStatusViewed = useCallback((statusId: string) => {
    setState((prev) => ({
      ...prev,
      statuses: prev.statuses.map((item) =>
        item.id === statusId ? { ...item, viewed: true } : item,
      ),
    }));
  }, []);

  const updateUser = useCallback((updates: Partial<AppUser>) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...updates } }));
  }, []);

  const addCall = useCallback((call: CallLog) => {
    setState((prev) => ({ ...prev, calls: [call, ...prev.calls] }));
  }, []);

  const clearCalls = useCallback(() => {
    setState((prev) => ({ ...prev, calls: [] }));
  }, []);

  const createGroup = useCallback(
    (name: string, memberIds: string[], avatar?: string) => {
      const id = `group-${Date.now()}`;
      const members = state.chats.filter((chat) => memberIds.includes(chat.id));
      const initials = name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
      const now = new Date().toISOString();

      const newChat: Chat = {
        id,
        name,
        avatar,
        initials,
        group: true,
        members: members.length + 1,
        unread: 0,
        about: 'New group',
        lastMessageAt: now,
      };

      const systemMessage: Message = {
        id: `sys-${Date.now()}`,
        chatId: id,
        senderId: 'me',
        senderName: 'You',
        text: `You created group “${name}”`,
        createdAt: now,
        status: 'read',
        kind: 'text',
      };

      setState((prev) => ({
        ...prev,
        chats: [newChat, ...prev.chats],
        messages: { ...prev.messages, [id]: [systemMessage] },
      }));

      return id;
    },
    [state.chats],
  );

  const createCommunity = useCallback((name: string, description: string) => {
    const id = `community-${Date.now()}`;
    const community: Community = {
      id,
      name,
      description,
      members: 1,
      unread: 0,
      announcement: `Welcome to ${name}. This is where announcements will appear.`,
      accent: '#00a884',
      groups: [
        {
          id: `${id}-announcements`,
          name: 'Announcements',
          members: 1,
        },
      ],
    };
    setState((prev) => ({ ...prev, communities: [community, ...prev.communities] }));
    return id;
  }, []);

  const theme = palettes[state.theme];

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      hydrated,
      activeChatId,
      typing,
      filter,
      query,
      setFilter,
      setQuery,
      openChat,
      closeChat,
      markChatRead,
      markAllRead,
      sendMessage,
      deleteMessage,
      toggleReaction,
      clearChatMessages,
      toggleChatFlag,
      setTheme,
      toggleTheme,
      addStatus,
      markStatusViewed,
      updateUser,
      addCall,
      clearCalls,
      createGroup,
      createCommunity,
      theme,
    }),
    [
      state,
      hydrated,
      activeChatId,
      typing,
      filter,
      query,
      openChat,
      closeChat,
      markChatRead,
      markAllRead,
      sendMessage,
      deleteMessage,
      toggleReaction,
      clearChatMessages,
      toggleChatFlag,
      setTheme,
      toggleTheme,
      addStatus,
      markStatusViewed,
      updateUser,
      addCall,
      clearCalls,
      createGroup,
      createCommunity,
      theme,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}
