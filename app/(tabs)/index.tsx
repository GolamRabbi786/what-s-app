import { useRouter } from 'expo-router';
import {
  Archive,
  BellOff,
  CheckCheck,
  ChevronDown,
  Laptop,
  Lock,
  MessageCircle,
  MessageSquarePlus,
  MoreVertical,
  Moon,
  Pin,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Users,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppShell } from '../../components/AppShell';
import { Avatar } from '../../components/Avatar';
import { ChatWindow } from '../../components/ChatWindow';
import { NewChatModal } from '../../components/NewChatModal';
import { Sheet } from '../../components/Sheet';
import { useApp } from '../../context/AppContext';
import { formatChatTime, getChatPreview } from '../../lib/format';
import { Chat } from '../../lib/types';

export default function ChatsScreen() {
  return (
    <AppShell active="chats">
      <ChatsHome />
    </AppShell>
  );
}

function ChatsHome() {
  const {
    theme,
    state,
    activeChatId,
    openChat,
    closeChat,
    filter,
    setFilter,
    query,
    setQuery,
    markAllRead,
    toggleTheme,
    typing,
  } = useApp();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const router = useRouter();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const activeChat = state.chats.find((chat) => chat.id === activeChatId) ?? null;
  const archivedChats = state.chats.filter((chat) => chat.archived);
  const unreadCount = state.chats.filter((chat) => !chat.archived && chat.unread > 0).length;
  const favoriteCount = state.chats.filter((chat) => !chat.archived && chat.favorite).length;
  const groupCount = state.chats.filter((chat) => !chat.archived && chat.group).length;

  const visibleChats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.chats
      .filter((chat) => !chat.archived)
      .filter((chat) => {
        if (filter === 'unread') return chat.unread > 0;
        if (filter === 'favorites') return Boolean(chat.favorite);
        if (filter === 'groups') return chat.group;
        return true;
      })
      .filter((chat) => {
        if (!normalized) return true;
        const preview = getChatPreview(chat, state.messages) ?? '';
        return (
          chat.name.toLowerCase().includes(normalized) ||
          preview.toLowerCase().includes(normalized) ||
          (chat.phone ?? '').includes(normalized)
        );
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
  }, [state.chats, state.messages, filter, query]);

  const listWidth = Math.min(430, Math.max(342, width * 0.33));

  const filterChips = [
    { key: 'all' as const, label: 'All', count: state.chats.filter((chat) => !chat.archived).length },
    { key: 'unread' as const, label: 'Unread', count: unreadCount },
    { key: 'favorites' as const, label: 'Favourites', count: favoriteCount },
    { key: 'groups' as const, label: 'Groups', count: groupCount },
  ];

  return (
    <View style={styles.screen}>
      <View
        style={[
          styles.listPanel,
          {
            width: desktop ? listWidth : '100%',
            backgroundColor: theme.panel,
            borderRightColor: theme.border,
          },
        ]}
      >
        <View style={styles.listHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: theme.text }]}>Chats</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              {unreadCount > 0 ? `${unreadCount} conversations need attention` : 'You’re all caught up'}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New chat"
              onPress={() => setNewChatOpen(true)}
              style={({ pressed }) => [
                styles.headerButton,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.68 },
              ]}
            >
              <MessageSquarePlus color={theme.icon} size={19} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chat menu"
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [
                styles.headerButton,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.68 },
              ]}
            >
              <MoreVertical color={theme.icon} size={19} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: theme.search }]}>
          <Search color={theme.textMuted} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search or start a new chat"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <X color={theme.textMuted} size={16} />
            </Pressable>
          ) : (
            <View style={[styles.filterDot, { backgroundColor: theme.accent }]} />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: active ? theme.chipActive : theme.chip },
                  active && { borderColor: theme.chipActive },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? theme.accentDark : theme.textSecondary },
                  ]}
                >
                  {chip.label}
                </Text>
                <View
                  style={[
                    styles.chipCount,
                    { backgroundColor: active ? 'rgba(0,168,132,0.16)' : theme.panel },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipCountText,
                      { color: active ? theme.accentDark : theme.textMuted },
                    ]}
                  >
                    {chip.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {archivedChats.length > 0 && !query ? (
          <Pressable
            onPress={() => setArchivedOpen(true)}
            style={({ pressed }) => [
              styles.archivedRow,
              { borderBottomColor: theme.border },
              pressed && { backgroundColor: theme.panelHover },
            ]}
          >
            <View style={[styles.archivedIcon, { backgroundColor: theme.chip }]}>
              <Archive color={theme.accentDark} size={20} />
            </View>
            <Text style={[styles.archivedLabel, { color: theme.text }]}>Archived</Text>
            <Text style={[styles.archivedCount, { color: theme.accentDark }]}>
              {archivedChats.length}
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          data={visibleChats}
          keyExtractor={(chat) => chat.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={visibleChats.length === 0 ? styles.emptyListContent : styles.listContent}
          renderItem={({ item }) => (
            <ChatRow
              chat={item}
              active={activeChatId === item.id}
              typingLabel={typing?.chatId === item.id ? typing.label : null}
              preview={getChatPreview(item, state.messages)}
              onPress={() => openChat(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.chip }]}>
                {query ? (
                  <Search color={theme.textMuted} size={27} />
                ) : filter === 'unread' ? (
                  <CheckCheck color={theme.textMuted} size={28} />
                ) : (
                  <MessageCircle color={theme.textMuted} size={28} />
                )}
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {query
                  ? 'No chats found'
                  : filter === 'unread'
                    ? 'No unread chats'
                    : filter === 'favorites'
                      ? 'No favourites yet'
                      : filter === 'groups'
                        ? 'No groups yet'
                        : 'No chats yet'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {query
                  ? 'Try another name, number, or message.'
                  : filter === 'unread'
                    ? 'You’re all caught up. Nice work.'
                    : 'Start a conversation with someone new.'}
              </Text>
              <Pressable
                onPress={() => setNewChatOpen(true)}
                style={({ pressed }) => [
                  styles.emptyButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Plus color="#ffffff" size={16} />
                <Text style={styles.emptyButtonText}>New chat</Text>
              </Pressable>
            </View>
          }
        />
      </View>

      {desktop ? (
        <View style={styles.conversationPane}>
          {activeChat ? (
            <ChatWindow chat={activeChat} />
          ) : (
            <WelcomePane userName={state.user.name} />
          )}
        </View>
      ) : null}

      <Modal
        visible={!desktop && Boolean(activeChat)}
        animationType="slide"
        onRequestClose={closeChat}
        statusBarTranslucent
        presentationStyle="fullScreen"
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.panel }}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {activeChat ? <ChatWindow chat={activeChat} onClose={closeChat} /> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <NewChatModal visible={newChatOpen} onClose={() => setNewChatOpen(false)} />

      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
        maxWidth={400}
      >
        <View style={styles.profileCard}>
          <Avatar name={state.user.name} uri={state.user.avatar} size={54} showOnline online />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text }]}>{state.user.name}</Text>
            <Text style={[styles.profileAbout, { color: theme.textSecondary }]} numberOfLines={1}>
              {state.user.about}
            </Text>
          </View>
        </View>
        <View style={styles.menuList}>
          <MenuOption
            icon={MessageSquarePlus}
            label="New chat"
            onPress={() => {
              setMenuOpen(false);
              setNewChatOpen(true);
            }}
          />
          <MenuOption
            icon={CheckCheck}
            label="Mark all as read"
            onPress={() => {
              markAllRead();
              setMenuOpen(false);
            }}
          />
          <MenuOption
            icon={Archive}
            label={`Archived chats${archivedChats.length ? ` (${archivedChats.length})` : ''}`}
            onPress={() => {
              setMenuOpen(false);
              setArchivedOpen(true);
            }}
          />
          <MenuOption
            icon={theme.mode === 'dark' ? Sun : Moon}
            label={theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={() => {
              toggleTheme();
              setMenuOpen(false);
            }}
          />
          <MenuOption
            icon={Settings}
            label="Settings"
            onPress={() => {
              setMenuOpen(false);
              router.replace('/(tabs)/settings' as never);
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        title="Archived chats"
        subtitle={`${archivedChats.length} archived conversation${archivedChats.length === 1 ? '' : 's'}`}
        maxWidth={440}
      >
        {archivedChats.length === 0 ? (
          <View style={styles.archivedEmpty}>
            <Archive color={theme.textMuted} size={34} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nothing archived</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Chats you archive will show up here.
            </Text>
          </View>
        ) : (
          archivedChats.map((chat) => (
            <Pressable
              key={chat.id}
              onPress={() => {
                setArchivedOpen(false);
                openChat(chat.id);
              }}
              style={({ pressed }) => [
                styles.archivedChatRow,
                { borderBottomColor: theme.border },
                pressed && { opacity: 0.68 },
              ]}
            >
              <Avatar name={chat.name} uri={chat.avatar} size={43} group={chat.group} />
              <View style={styles.archivedChatText}>
                <Text style={[styles.archivedChatName, { color: theme.text }]}>{chat.name}</Text>
                <Text style={[styles.archivedChatPreview, { color: theme.textSecondary }]} numberOfLines={1}>
                  {getChatPreview(chat, state.messages)}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  openChat(chat.id);
                  setArchivedOpen(false);
                }}
                style={({ pressed }) => [
                  styles.unarchiveButton,
                  { backgroundColor: theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Archive color={theme.accentDark} size={15} />
                <Text style={[styles.unarchiveText, { color: theme.accentDark }]}>Open</Text>
              </Pressable>
            </Pressable>
          ))
        )}
      </Sheet>
    </View>
  );
}

function ChatRow({
  chat,
  active,
  typingLabel,
  preview,
  onPress,
}: {
  chat: Chat;
  active: boolean;
  typingLabel: string | null;
  preview: string;
  onPress: () => void;
}) {
  const { theme, state } = useApp();
  const lastMessage = state.messages[chat.id]?.[state.messages[chat.id].length - 1];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        active && { backgroundColor: theme.panelHover },
        pressed && { backgroundColor: theme.panelHover },
      ]}
    >
      <Avatar
        name={chat.name}
        uri={chat.avatar}
        size={49}
        group={chat.group}
        online={chat.online}
        showOnline
      />
      <View style={styles.chatBody}>
        <View style={styles.chatTopLine}>
          <Text
            style={[
              styles.chatName,
              { color: theme.text, fontWeight: chat.unread > 0 ? '700' : '600' },
            ]}
            numberOfLines={1}
          >
            {chat.name}
          </Text>
          <View style={styles.chatMeta}>
            {chat.muted ? <BellOff color={theme.textMuted} size={12} /> : null}
            {chat.pinned ? <Pin color={theme.textMuted} size={12} /> : null}
            <Text
              style={[
                styles.chatTime,
                { color: chat.unread > 0 ? theme.accentDark : theme.textMuted },
              ]}
            >
              {formatChatTime(chat.lastMessageAt)}
            </Text>
            <ChevronDown color={theme.textMuted} size={11} />
          </View>
        </View>
        <View style={styles.chatBottomLine}>
          <View style={styles.previewWrap}>
            {lastMessage?.senderId === 'me' ? (
              <CheckCheck
                color={lastMessage.status === 'read' ? '#53bdeb' : theme.textMuted}
                size={14}
                style={styles.previewTick}
              />
            ) : null}
            <Text
              numberOfLines={1}
              style={[
                styles.chatPreview,
                {
                  color: typingLabel ? theme.accent : theme.textSecondary,
                  fontStyle: typingLabel ? 'italic' : 'normal',
                },
              ]}
            >
              {typingLabel ? `${typingLabel} is typing…` : preview}
            </Text>
          </View>
          {chat.favorite ? <Star color={theme.warning} size={12} fill={theme.warning} /> : null}
          {chat.unread > 0 ? (
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: chat.muted ? theme.textMuted : theme.accent },
              ]}
            >
              <Text style={styles.unreadText}>{chat.unread > 99 ? '99+' : chat.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function MenuOption({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuOption, pressed && { opacity: 0.62 }]}
    >
      <Icon color={theme.icon} size={19} />
      <Text style={[styles.menuOptionText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function WelcomePane({ userName }: { userName: string }) {
  const { theme } = useApp();
  const firstName = userName.split(' ')[0];

  return (
    <View style={[styles.welcome, { backgroundColor: theme.panelAlt }]}>
      <View style={styles.welcomeDecorationOne} />
      <View style={styles.welcomeDecorationTwo} />
      <View
        style={[
          styles.welcomeCard,
          {
            backgroundColor: theme.panel,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={[styles.welcomeLogo, { backgroundColor: theme.accent }]}>
          <MessageCircle color="#ffffff" size={44} strokeWidth={2} />
        </View>
        <Text style={[styles.welcomeTitle, { color: theme.text }]}>
          Welcome back, {firstName}
        </Text>
        <Text style={[styles.welcomeText, { color: theme.textSecondary }]}>
          Send and receive messages without keeping your phone online. Select a conversation
          on the left to pick up where you left off.
        </Text>

        <View style={styles.welcomeFeatures}>
          <View style={[styles.featurePill, { backgroundColor: theme.chip }]}>
            <ShieldCheck color={theme.accentDark} size={16} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              End-to-end encrypted
            </Text>
          </View>
          <View style={[styles.featurePill, { backgroundColor: theme.chip }]}>
            <Laptop color={theme.accentDark} size={16} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Synced across devices
            </Text>
          </View>
          <View style={[styles.featurePill, { backgroundColor: theme.chip }]}>
            <Users color={theme.accentDark} size={16} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Groups and communities
            </Text>
          </View>
        </View>

        <View style={[styles.welcomeDivider, { backgroundColor: theme.border }]} />

        <View style={styles.welcomeFooter}>
          <Lock color={theme.textMuted} size={14} />
          <Text style={[styles.welcomeFooterText, { color: theme.textMuted }]}>
            Your personal messages are end-to-end encrypted
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  listPanel: {
    minHeight: 0,
    borderRightWidth: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 14,
    gap: 10,
  },
  pageTitle: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 7,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 39,
    borderRadius: 9,
    marginHorizontal: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  chipCount: {
    minWidth: 18,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipCountText: {
    fontSize: 9,
    fontWeight: '700',
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  archivedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  archivedCount: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 19,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 9.5,
    borderRadius: 4,
  },
  chatBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  chatTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatName: {
    flex: 1,
    fontSize: 14.5,
    letterSpacing: -0.1,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatTime: {
    fontSize: 10.5,
  },
  chatBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  previewTick: {
    marginRight: 3,
  },
  chatPreview: {
    flex: 1,
    fontSize: 12.5,
  },
  unreadBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  conversationPane: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(134,150,160,0.25)',
    marginBottom: 8,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  profileAbout: {
    fontSize: 12,
    marginTop: 2,
  },
  menuList: {
    gap: 2,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  menuOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  archivedEmpty: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 4,
  },
  archivedChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  archivedChatText: {
    flex: 1,
    minWidth: 0,
  },
  archivedChatName: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  archivedChatPreview: {
    fontSize: 11.5,
    marginTop: 2,
  },
  unarchiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
  },
  unarchiveText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  welcome: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    overflow: 'hidden',
  },
  welcomeDecorationOne: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(0,168,132,0.07)',
    top: -120,
    right: -80,
  },
  welcomeDecorationTwo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0,168,132,0.05)',
    bottom: -110,
    left: -70,
  },
  welcomeCard: {
    width: '100%',
    maxWidth: 510,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 42,
    paddingVertical: 38,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.09,
    shadowRadius: 50,
    elevation: 4,
  },
  welcomeLogo: {
    width: 82,
    height: 82,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 9,
    maxWidth: 380,
  },
  welcomeFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
    marginTop: 20,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
  },
  featureText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  welcomeDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    marginVertical: 24,
  },
  welcomeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  welcomeFooterText: {
    fontSize: 10.5,
  },
});
