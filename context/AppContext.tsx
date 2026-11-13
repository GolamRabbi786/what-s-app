import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { apiRequest } from '../lib/client';
import { backgroundById, DEFAULT_BACKGROUND } from '../lib/backgrounds';
import { registerPushNotifications, showIncomingNotification } from '../lib/notifications';
import { playMessageSound } from '../lib/sounds';
import { palettes, Palette } from '../lib/theme';
import {
  Account,
  AppState,
  AppUser,
  CallBackground,
  CallLog,
  CallSession,
  Chat,
  ChatFilter,
  Community,
  Message,
  MessageKind,
  ReplyTo,
  StatusGroup,
  ThemeMode,
  TypingPeer,
} from '../lib/types';

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
  mode: 'typing' | 'recording';
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
  refresh: () => void;
  addStatus: (input: { caption: string; background: string; image?: string }) => void;
  markStatusViewed: (groupdId: string) => void;
  updateUser: (updates: Partial<AppUser>) => void;
  addCall: (call: CallLog) => void;
  clearCalls: () => void;
  createGroup: (name: string, memberIds: string[], avatar?: string) => Promise<string | null>;
  startDirectChat: (userId: string) => Promise<string | null>;
  createCommunity: (name: string, description: string) => Promise<string | null>;
  deleteChat: (chatId: string) => void;
  deleteStatusGroup: (statusId: string) => void;
  deleteCommunity: (communityId: string) => void;
  updateCommunityAnnouncement: (communityId: string, announcement: string) => void;
  syncError: string | null;
  dismissSyncError: () => void;
  typingForChat: (chatId: string) => TypingPeer | null;
  setTypingMode: (chatId: string, mode: 'typing' | 'recording' | 'idle') => void;
  background: CallBackground;
  setBackground: (background: CallBackground) => void;
  incomingCall: CallSession | null;
  activeCall: CallSession | null;
  startCallSession: (input: {
    peerId: string;
    chatId?: string;
    type: 'voice' | 'video';
  }) => Promise<CallSession | null>;
  respondToCall: (action: 'accept' | 'decline', id: string) => Promise<CallSession | null>;
  endCallSession: (id: string) => Promise<CallSession | null>;
  refreshCall: (id: string) => Promise<CallSession | null>;
}

const AppContext = createContext<AppContextValue | null>(null);

const THEME_KEY = 'whatsapp.theme';
const BACKGROUND_KEY = 'whatsapp.background';
const POLL_INTERVAL = 3000;

const EMPTY_STATE: AppState = {
  version: 3,
  theme: 'light',
  chats: [],
  messages: {},
  statuses: [],
  calls: [],
  communities: [],
  contacts: [],
  typing: [],
  user: {
    name: '',
    about: 'Hey there! I am using WhatsApp.',
    phone: '',
    avatar: '',
  },
};

function withProfile(state: AppState, user: Account | null): AppState {
  if (!user) return state;
  const fullPhone = `${user.countryCode} ${user.phone}`.trim();

  return {
    ...state,
    user: {
      ...state.user,
      name: user.name || state.user.name,
      phone: fullPhone || state.user.phone,
      about: user.about || state.user.about,
      avatar: user.avatar ?? state.user.avatar,
    },
  };
}

function mergeTheme(state: AppState, theme: ThemeMode): AppState {
  return state.theme === theme ? state : { ...state, theme };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, signOut } = useAuth();
  const [state, setState] = useState<AppState>(EMPTY_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [hydrated, setHydrated] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [query, setQuery] = useState('');
  const [background, setBackgroundState] = useState<CallBackground>(DEFAULT_BACKGROUND);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const activeCallRef = useRef<CallSession | null>(null);
  activeCallRef.current = activeCall;
  const typingSentRef = useRef<{ chatId: string; mode: string; at: number } | null>(null);
  const themeRef = useRef<ThemeMode>('light');
  const revisionRef = useRef<string | null>(null);
  const activeChatRef = useRef<string | null>(null);
  const seenMessagesRef = useRef<Record<string, string>>({});
  const currentUserId = currentUser?.id ?? null;
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === 'light' || stored === 'dark') {
          themeRef.current = stored;
          setState((prev) => mergeTheme(prev, stored));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(BACKGROUND_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        try {
          const parsed = JSON.parse(stored) as CallBackground;
          if (parsed && (parsed.kind === 'animated' || parsed.kind === 'image')) {
            setBackgroundState(
              parsed.colors || parsed.image ? parsed : backgroundById(parsed.id),
            );
          }
        } catch {
          // ignore malformed background payloads
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setBackground = useCallback((next: CallBackground) => {
    setBackgroundState(next);
    void AsyncStorage.setItem(BACKGROUND_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const handleError = useCallback(
    (error: unknown, fallback: string) => {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('suspended')) {
        void signOut();
        return;
      }
      setSyncError(message || fallback);
    },
    [signOut],
  );

  const fetchState = useCallback(
    async (silent: boolean) => {
      if (!currentUserId) return;
      try {
        const result = await apiRequest<{ state: AppState; revision: string }>('/api/state');
        if (!mountedRef.current) return;
        revisionRef.current = result.revision;
        setState((prev) => {
          const next = withProfile(mergeTheme(result.state, themeRef.current), currentUserRef.current);
          if (prev.theme !== next.theme) next.theme = prev.theme;
          return next;
        });
        setSyncError(null);
      } catch (error) {
        if (!mountedRef.current) return;
        if (!silent) handleError(error, 'Unable to load your messages.');
      } finally {
        if (mountedRef.current) setHydrated(true);
      }
    },
    [currentUserId, handleError],
  );

  const refresh = useCallback(() => {
    void fetchState(true);
  }, [fetchState]);

  useEffect(() => {
    revisionRef.current = null;
    seenMessagesRef.current = {};
    setActiveChatId(null);

    if (!currentUserId) {
      setState((prev) => mergeTheme(EMPTY_STATE, prev.theme));
      setHydrated(true);
      return;
    }

    setHydrated(false);
    void fetchState(false);
  }, [currentUserId, fetchState]);

  useEffect(() => {
    if (!hydrated || !currentUserId) return;
    let cancelled = false;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const result = await apiRequest<{ state: AppState; revision: string }>('/api/state');
        if (cancelled || !mountedRef.current) return;
        if (result.revision === revisionRef.current) return;
        revisionRef.current = result.revision;
        setState((prev) => {
          const next = withProfile(mergeTheme(result.state, themeRef.current), currentUserRef.current);
          if (prev.theme !== next.theme) next.theme = prev.theme;
          return next;
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('suspended')) void signOut();
      }
    };

    const interval = setInterval(tick, POLL_INTERVAL);
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void tick();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisible);
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [hydrated, currentUserId, signOut]);

  useEffect(() => {
    if (!currentUserId) return;
    void registerPushNotifications();
  }, [currentUserId]);

  useEffect(() => {
    if (!hydrated) return;
    const seen = seenMessagesRef.current;
    const firstLoad = Object.keys(seen).length === 0;

    state.chats.forEach((chat) => {
      const list = state.messages[chat.id] ?? [];
      const last = list[list.length - 1];
      if (!last) return;

      const previous = seen[chat.id];
      seen[chat.id] = last.id;

      if (firstLoad || previous === last.id) return;
      if (last.senderId === 'me') return;
      if (activeChatRef.current === chat.id) return;

      const fresh = Date.now() - new Date(last.createdAt).getTime() < 20000;
      if (!fresh) return;

      void playMessageSound();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      void showIncomingNotification(chat.name, last.text || 'New message');
    });

    Object.keys(seen).forEach((chatId) => {
      if (!state.chats.some((chat) => chat.id === chatId)) delete seen[chatId];
    });
  }, [state, hydrated]);

  useEffect(() => {
    if (!currentUser) return;
    setState((prev) => withProfile(prev, currentUser));
  }, [
    currentUser?.id,
    currentUser?.name,
    currentUser?.phone,
    currentUser?.about,
    currentUser?.avatar,
    currentUser?.countryCode,
  ]);

  const openChat = useCallback((chatId: string) => {
    setActiveChatId(chatId);
    const chat = stateRef.current.chats.find((item) => item.id === chatId);
    if (!chat) return;

    if (chat.unread > 0) {
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((item) =>
          item.id === chatId ? { ...item, unread: 0 } : item,
        ),
        messages: {
          ...prev.messages,
          [chatId]: (prev.messages[chatId] ?? []).map((message) =>
            message.senderId !== 'me' ? { ...message, status: 'read' as const } : message,
          ),
        },
      }));
    }

    void apiRequest('/api/chats', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'read', id: chatId }),
    }).catch(() => undefined);
  }, []);

  const closeChat = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const markChatRead = useCallback((chatId: string) => {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((item) => (item.id === chatId ? { ...item, unread: 0 } : item)),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    const ids = stateRef.current.chats.filter((chat) => chat.unread > 0).map((chat) => chat.id);
    setState((prev) => ({
      ...prev,
      chats: prev.chats.map((chat) => ({ ...chat, unread: 0 })),
      messages: Object.fromEntries(
        Object.entries(prev.messages).map(([chatId, list]) => [
          chatId,
          list.map((message) =>
            message.senderId !== 'me' && message.status !== 'read'
              ? { ...message, status: 'read' as const }
              : message,
          ),
        ]),
      ),
    }));
    ids.forEach((id) => {
      void apiRequest('/api/chats', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'read', id }),
      }).catch(() => undefined);
    });
  }, []);

  const sendMessage = useCallback(
    (chatId: string, text: string, options: SendOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed && !options.image && !options.fileName && !options.duration) return;

      const now = new Date().toISOString();
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const outgoing: Message = {
        id: tempId,
        chatId,
        senderId: 'me',
        senderName: 'You',
        text: trimmed,
        createdAt: now,
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
        chats: prev.chats.map((chat) =>
          chat.id === chatId ? { ...chat, lastMessageAt: now, unread: 0 } : chat,
        ),
      }));

      void apiRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          chatId,
          text: trimmed,
          kind: options.kind,
          image: options.image,
          duration: options.duration,
          fileName: options.fileName,
          fileSize: options.fileSize,
          replyToId: options.replyTo?.id,
        }),
      })
        .then(() => fetchState(true))
        .catch((error) => {
          setState((prev) => ({
            ...prev,
            messages: {
              ...prev.messages,
              [chatId]: (prev.messages[chatId] ?? []).filter(
                (message) => message.id !== tempId,
              ),
            },
          }));
          handleError(error, 'Your message could not be sent.');
        });
    },
    [fetchState, handleError],
  );

  const deleteMessage = useCallback(
    (chatId: string, messageId: string) => {
      setState((prev) => {
        const remaining = (prev.messages[chatId] ?? []).filter(
          (message) => message.id !== messageId,
        );
        return {
          ...prev,
          messages: { ...prev.messages, [chatId]: remaining },
        };
      });
      if (messageId.startsWith('pending-')) return;
      void apiRequest('/api/messages', {
        method: 'DELETE',
        body: JSON.stringify({ id: messageId }),
      }).catch((error) => handleError(error, 'Unable to delete the message.'));
    },
    [handleError],
  );

  const toggleReaction = useCallback(
    (chatId: string, messageId: string, emoji: string) => {
      setState((prev) => ({
        ...prev,
        messages: {
          ...prev.messages,
          [chatId]: (prev.messages[chatId] ?? []).map((message) => {
            if (message.id !== messageId) return message;
            const current = message.reactions ?? [];
            return {
              ...message,
              reactions: current.includes(emoji)
                ? current.filter((value) => value !== emoji)
                : [...current, emoji],
            };
          }),
        },
      }));
      if (messageId.startsWith('pending-')) return;
      void apiRequest('/api/messages', {
        method: 'PATCH',
        body: JSON.stringify({ id: messageId, emoji }),
      }).catch((error) => handleError(error, 'Unable to react to the message.'));
    },
    [handleError],
  );

  const clearChatMessages = useCallback(
    (chatId: string) => {
      setState((prev) => ({
        ...prev,
        messages: { ...prev.messages, [chatId]: [] },
      }));
      void apiRequest('/api/messages', {
        method: 'DELETE',
        body: JSON.stringify({ chatId, all: true }),
      })
        .then(() => fetchState(true))
        .catch((error) => handleError(error, 'Unable to clear the conversation.'));
    },
    [fetchState, handleError],
  );

  const toggleChatFlag = useCallback(
    (chatId: string, flag: ChatFlag) => {
      const chat = stateRef.current.chats.find((item) => item.id === chatId);
      const value = chat ? !Boolean(chat[flag]) : true;
      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((item) =>
          item.id === chatId ? { ...item, [flag]: value } : item,
        ),
      }));
      if (flag === 'archived' && activeChatRef.current === chatId) {
        setActiveChatId(null);
      }
      void apiRequest('/api/chats', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'flag', id: chatId, flag, value }),
      }).catch((error) => handleError(error, 'Unable to update the chat.'));
    },
    [handleError],
  );

  const setTheme = useCallback((theme: ThemeMode) => {
    themeRef.current = theme;
    setState((prev) => ({ ...prev, theme }));
    void AsyncStorage.setItem(THEME_KEY, theme).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeRef.current === 'light' ? 'dark' : 'light');
  }, [setTheme]);

  const addStatus = useCallback(
    (input: { caption: string; background: string; image?: string }) => {
      void apiRequest('/api/statuses', {
        method: 'POST',
        body: JSON.stringify({
          caption: input.caption,
          background: input.background,
          image: input.image,
        }),
      })
        .then(() => fetchState(true))
        .catch((error) => handleError(error, 'Unable to publish your status.'));
    },
    [fetchState, handleError],
  );

  const markStatusViewed = useCallback(
    (groupId: string) => {
      setState((prev) => ({
        ...prev,
        statuses: prev.statuses.map((group) =>
          group.id === groupId ? { ...group, viewed: true } : group,
        ),
      }));
      void apiRequest('/api/statuses', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'view', groupId }),
      }).catch(() => undefined);
    },
    [],
  );

  const updateUser = useCallback((updates: Partial<AppUser>) => {
    setState((prev) => ({ ...prev, user: { ...prev.user, ...updates } }));
  }, []);

  const addCall = useCallback(
    (call: CallLog) => {
      setState((prev) => ({ ...prev, calls: [call, ...prev.calls] }));

      const peerId =
        stateRef.current.chats.find((chat) => chat.id === call.contactId)?.peerId ??
        stateRef.current.contacts.find((contact) => contact.id === call.contactId)?.id;

      void apiRequest('/api/calls', {
        method: 'POST',
        body: JSON.stringify({
          peerId,
          name: call.name,
          avatar: call.avatar,
          direction: call.direction,
          type: call.type,
          duration: call.duration,
        }),
      })
        .then(() => fetchState(true))
        .catch(() => undefined);
    },
    [fetchState],
  );

  const clearCalls = useCallback(() => {
    setState((prev) => ({ ...prev, calls: [] }));
    void apiRequest('/api/calls', { method: 'DELETE' }).catch((error) =>
      handleError(error, 'Unable to clear call history.'),
    );
  }, [handleError]);

  const createGroup = useCallback(
    async (name: string, memberIds: string[], avatar?: string) => {
      try {
        const result = await apiRequest<{ chatId: string }>('/api/chats', {
          method: 'POST',
          body: JSON.stringify({ kind: 'group', name, memberIds, avatar }),
        });
        await fetchState(true);
        return result.chatId;
      } catch (error) {
        handleError(error, 'Unable to create the group.');
        return null;
      }
    },
    [fetchState, handleError],
  );

  const startDirectChat = useCallback(
    async (userId: string) => {
      try {
        const result = await apiRequest<{ chatId: string }>('/api/chats', {
          method: 'POST',
          body: JSON.stringify({ kind: 'direct', userId }),
        });
        await fetchState(true);
        return result.chatId;
      } catch (error) {
        handleError(error, 'Unable to start the chat.');
        return null;
      }
    },
    [fetchState, handleError],
  );

  const createCommunity = useCallback(
    async (name: string, description: string) => {
      try {
        const result = await apiRequest<{ communityId: string; chatId: string }>(
          '/api/communities',
          {
            method: 'POST',
            body: JSON.stringify({ name, description }),
          },
        );
        await fetchState(true);
        return result.communityId;
      } catch (error) {
        handleError(error, 'Unable to create the community.');
        return null;
      }
    },
    [fetchState, handleError],
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      setState((prev) => {
        const messages = { ...prev.messages };
        delete messages[chatId];
        return {
          ...prev,
          chats: prev.chats.filter((chat) => chat.id !== chatId),
          messages,
        };
      });
      if (activeChatRef.current === chatId) setActiveChatId(null);
      void apiRequest('/api/chats', {
        method: 'DELETE',
        body: JSON.stringify({ id: chatId }),
      }).catch((error) => handleError(error, 'Unable to delete the chat.'));
    },
    [handleError],
  );

  const deleteStatusGroup = useCallback(
    (statusId: string) => {
      setState((prev) => ({
        ...prev,
        statuses: prev.statuses.filter((group) => group.id !== statusId),
      }));
      void apiRequest('/api/statuses', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'delete', groupId: statusId }),
      }).catch((error) => handleError(error, 'Unable to delete the status.'));
    },
    [handleError],
  );

  const deleteCommunity = useCallback(
    (communityId: string) => {
      setState((prev) => ({
        ...prev,
        communities: prev.communities.filter((item) => item.id !== communityId),
      }));
      void apiRequest('/api/communities', {
        method: 'DELETE',
        body: JSON.stringify({ id: communityId }),
      }).catch((error) => handleError(error, 'Unable to delete the community.'));
    },
    [handleError],
  );

  const updateCommunityAnnouncement = useCallback(
    (communityId: string, announcement: string) => {
      setState((prev) => ({
        ...prev,
        communities: prev.communities.map((community) =>
          community.id === communityId ? { ...community, announcement } : community,
        ),
      }));
      void apiRequest('/api/communities', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'announcement', id: communityId, announcement }),
      }).catch((error) => handleError(error, 'Unable to update the announcement.'));
    },
    [handleError],
  );

  const dismissSyncError = useCallback(() => setSyncError(null), []);

  const typingForChat = useCallback(
    (chatId: string) => state.typing.find((peer) => peer.chatId === chatId) ?? null,
    [state.typing],
  );

  const typing = useMemo<TypingState | null>(() => {
    const peer =
      state.typing.find((entry) => entry.chatId === activeChatId) ?? null;
    if (!peer) return null;
    return { chatId: peer.chatId, label: peer.name, mode: peer.mode };
  }, [state.typing, activeChatId]);

  const setTypingMode = useCallback(
    (chatId: string, mode: 'typing' | 'recording' | 'idle') => {
      const now = Date.now();
      const last = typingSentRef.current;
      if (
        mode !== 'idle' &&
        last &&
        last.chatId === chatId &&
        last.mode === mode &&
        now - last.at < 2200
      ) {
        return;
      }
      typingSentRef.current = { chatId, mode, at: now };
      void apiRequest('/api/typing', {
        method: 'POST',
        body: JSON.stringify({ chatId, mode }),
      }).catch(() => undefined);
    },
    [],
  );

  const startCallSession = useCallback(
    async (input: { peerId: string; chatId?: string; type: 'voice' | 'video' }) => {
      try {
        const result = await apiRequest<{ session: CallSession | null }>(
          '/api/call-sessions',
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'start',
              peerId: input.peerId,
              chatId: input.chatId,
              type: input.type,
            }),
          },
        );
        if (result.session) {
          setActiveCall(result.session);
          setIncomingCall(null);
        }
        return result.session;
      } catch (error) {
        handleError(error, 'Unable to start the call.');
        return null;
      }
    },
    [handleError],
  );

  const respondToCall = useCallback(
    async (action: 'accept' | 'decline', id: string) => {
      try {
        const result = await apiRequest<{ session: CallSession | null }>(
          '/api/call-sessions',
          {
            method: 'POST',
            body: JSON.stringify({ action, id }),
          },
        );
        setIncomingCall(null);
        if (action === 'accept' && result.session) {
          setActiveCall(result.session);
        }
        return result.session;
      } catch (error) {
        handleError(error, 'Unable to answer the call.');
        return null;
      }
    },
    [handleError],
  );

  const endCallSession = useCallback(
    async (id: string) => {
      try {
        const result = await apiRequest<{ session: CallSession | null }>(
          '/api/call-sessions',
          {
            method: 'POST',
            body: JSON.stringify({ action: 'end', id }),
          },
        );
        setActiveCall(null);
        setIncomingCall(null);
        void fetchState(true);
        return result.session;
      } catch (error) {
        handleError(error, 'Unable to end the call.');
        setActiveCall(null);
        return null;
      }
    },
    [fetchState, handleError],
  );

  const refreshCall = useCallback(async (id: string) => {
    try {
      const result = await apiRequest<{ session: CallSession | null }>(
        `/api/call-sessions?id=${encodeURIComponent(id)}`,
      );
      const session = result.session;
      if (!session) return null;
      if (session.status === 'ended' || session.status === 'declined' || session.status === 'missed') {
        setActiveCall(null);
      } else {
        setActiveCall(session);
      }
      return session;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !currentUserId) {
      setIncomingCall(null);
      setActiveCall(null);
      return;
    }
    let cancelled = false;

    const check = async () => {
      try {
        const current = activeCallRef.current;
        if (current) {
          const result = await apiRequest<{ session: CallSession | null }>(
            `/api/call-sessions?id=${encodeURIComponent(current.id)}`,
          );
          if (cancelled || !mountedRef.current) return;
          const session = result.session;
          if (!session) return;
          if (
            session.status === 'ended' ||
            session.status === 'declined' ||
            session.status === 'missed'
          ) {
            setActiveCall(null);
          } else {
            setActiveCall(session);
          }
          return;
        }

        const result = await apiRequest<{ session: CallSession | null }>(
          '/api/call-sessions',
        );
        if (cancelled || !mountedRef.current) return;
        setIncomingCall(result.session);
      } catch {
        // presence polling is best-effort
      }
    };

    void check();
    const timer = setInterval(check, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [hydrated, currentUserId]);

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
      refresh,
      addStatus,
      markStatusViewed,
      updateUser,
      addCall,
      clearCalls,
      createGroup,
      startDirectChat,
      createCommunity,
      deleteChat,
      deleteStatusGroup,
      deleteCommunity,
      updateCommunityAnnouncement,
      syncError,
      dismissSyncError,
      typingForChat,
      setTypingMode,
      background,
      setBackground,
      incomingCall,
      activeCall,
      startCallSession,
      respondToCall,
      endCallSession,
      refreshCall,
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
      refresh,
      addStatus,
      markStatusViewed,
      updateUser,
      addCall,
      clearCalls,
      createGroup,
      startDirectChat,
      createCommunity,
      deleteChat,
      deleteStatusGroup,
      deleteCommunity,
      updateCommunityAnnouncement,
      syncError,
      dismissSyncError,
      typingForChat,
      setTypingMode,
      background,
      setBackground,
      incomingCall,
      activeCall,
      startCallSession,
      respondToCall,
      endCallSession,
      refreshCall,
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
