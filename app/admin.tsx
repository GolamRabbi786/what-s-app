import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  Ban,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  Moon,
  Phone,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Sheet } from '../components/Sheet';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES } from '../lib/countries';
import { formatListDate, truncate } from '../lib/format';
import { Account, Broadcast } from '../lib/types';

type Section = 'overview' | 'users' | 'content' | 'calls' | 'broadcast' | 'settings';

const NAV: {
  key: Section;
  label: string;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
}[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'User management', icon: Users },
  { key: 'content', label: 'Chats & content', icon: MessageCircle },
  { key: 'calls', label: 'Call activity', icon: Phone },
  { key: 'broadcast', label: 'Broadcasts', icon: Megaphone },
  { key: 'settings', label: 'Admin settings', icon: Settings },
];

const SECTION_TITLES: Record<Section, { title: string; subtitle: string }> = {
  overview: {
    title: 'Platform overview',
    subtitle: 'A live view of accounts, conversations and activity',
  },
  users: {
    title: 'User management',
    subtitle: 'Verify, suspend, reset or remove member accounts',
  },
  content: {
    title: 'Chats & content',
    subtitle: 'Moderate conversations, status updates and communities',
  },
  calls: {
    title: 'Call activity',
    subtitle: 'Monitor voice, video and group call history',
  },
  broadcast: {
    title: 'Broadcasts',
    subtitle: 'Send announcements to your member base',
  },
  settings: {
    title: 'Admin settings',
    subtitle: 'Manage your administrator account and security',
  },
};

export default function AdminScreen() {
  const router = useRouter();
  const {
    theme,
    state,
    setTheme,
    toggleTheme,
    deleteChat,
    clearChatMessages,
    deleteStatusGroup,
    deleteCommunity,
    clearCalls,
    updateCommunityAnnouncement,
  } = useApp();
  const {
    currentUser,
    accounts,
    broadcasts,
    signOut,
    adminDeleteUser,
    adminResetPassword,
    toggleUserStatus,
    toggleUserVerified,
    sendBroadcast,
    deleteBroadcast,
    changeAdminPassword,
  } = useAuth();
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;

  const [section, setSection] = useState<Section>('overview');
  const [userQuery, setUserQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'suspended' | 'verified' | 'admin'>(
    'all',
  );
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [toast, setToast] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [announcement, setAnnouncement] = useState<{ id: string; value: string } | null>(null);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [audience, setAudience] = useState<Broadcast['audience']>('everyone');

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const members = useMemo(
    () => accounts.filter((account) => account.role !== 'admin'),
    [accounts],
  );

  const stats = useMemo(() => {
    const totalMessages = Object.values(state.messages).reduce(
      (sum, list) => sum + list.length,
      0,
    );
    const unread = state.chats.reduce((sum, chat) => sum + chat.unread, 0);
    const active = members.filter((account) => account.status === 'active').length;
    const suspended = members.filter((account) => account.status === 'suspended').length;
    const verified = members.filter((account) => account.verified).length;
    const countries = new Set(members.map((account) => account.countryName)).size;
    return {
      totalUsers: members.length,
      active,
      suspended,
      verified,
      admins: accounts.filter((account) => account.role === 'admin').length,
      chats: state.chats.length,
      groups: state.chats.filter((chat) => chat.group).length,
      messages: totalMessages,
      unread,
      calls: state.calls.length,
      statuses: state.statuses.length,
      communities: state.communities.length,
      countries,
    };
  }, [accounts, members, state]);

  const recentUsers = useMemo(
    () =>
      [...members]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [members],
  );

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    return accounts.filter((account) => {
      const matches =
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.username.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.phone.includes(query) ||
        account.countryName.toLowerCase().includes(query);
      if (!matches) return false;
      if (userFilter === 'active') return account.status === 'active';
      if (userFilter === 'suspended') return account.status === 'suspended';
      if (userFilter === 'verified') return account.verified;
      if (userFilter === 'admin') return account.role === 'admin';
      return true;
    });
  }, [accounts, userQuery, userFilter]);

  const audienceCount = (value: Broadcast['audience']) => {
    if (value === 'active') return stats.active;
    if (value === 'suspended') return stats.suspended;
    return stats.totalUsers;
  };

  const notify = (tone: 'ok' | 'error', text: string) => setToast({ tone, text });

  const submitBroadcast = async () => {
    const result = await sendBroadcast({
      title: broadcastTitle,
      message: broadcastMessage,
      audience,
    });
    if (!result.ok) {
      notify('error', result.error ?? 'Unable to send broadcast.');
      return;
    }
    setBroadcastTitle('');
    setBroadcastMessage('');
    notify('ok', 'Broadcast queued and delivered to the selected audience.');
  };

  const submitPassword = async () => {
    if (nextPassword !== confirmPassword) {
      notify('error', 'New passwords do not match.');
      return;
    }
    const result = await changeAdminPassword(currentPassword, nextPassword);
    if (!result.ok) {
      notify('error', result.error ?? 'Unable to update password.');
      return;
    }
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    notify('ok', 'Administrator password updated.');
  };

  const admin = currentUser;

  const navButton = (item: (typeof NAV)[number], mobile = false) => {
    const active = section === item.key;
    const Icon = item.icon;
    if (mobile) {
      return (
        <Pressable
          key={item.key}
          onPress={() => setSection(item.key)}
          style={({ pressed }) => [
            styles.mobileNavItem,
            {
              backgroundColor: active ? theme.accent : theme.chip,
            },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Icon color={active ? '#ffffff' : theme.textSecondary} size={14} />
          <Text
            style={[
              styles.mobileNavText,
              { color: active ? '#ffffff' : theme.textSecondary },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      );
    }
    return (
      <Pressable
        key={item.key}
        onPress={() => setSection(item.key)}
        style={({ pressed }) => [
          styles.navItem,
          active && { backgroundColor: theme.railSoft },
          pressed && { opacity: 0.78 },
        ]}
      >
        <Icon
          color={active ? theme.accent : theme.railText}
          size={18}
          strokeWidth={active ? 2.3 : 1.9}
        />
        <Text
          style={[styles.navText, { color: active ? '#ffffff' : theme.railText }]}
        >
          {item.label}
        </Text>
        {item.key === 'users' && stats.suspended > 0 ? (
          <View style={[styles.navBadge, { backgroundColor: theme.danger }]}>
            <Text style={styles.navBadgeText}>{stats.suspended}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const sectionContent = () => {
    if (section === 'overview') {
      return (
        <View style={styles.stack}>
          <View style={styles.statGrid}>
            <StatCard
              icon={Users}
              label="Total members"
              value={String(stats.totalUsers)}
              detail={`${stats.admins} administrator${stats.admins === 1 ? '' : 's'}`}
              tint="#00a884"
              theme={theme}
            />
            <StatCard
              icon={UserCheck}
              label="Active accounts"
              value={String(stats.active)}
              detail={`${stats.suspended} suspended`}
              tint="#2d9cdb"
              theme={theme}
            />
            <StatCard
              icon={BadgeCheck}
              label="Verified"
              value={String(stats.verified)}
              detail={`${stats.totalUsers ? Math.round((stats.verified / Math.max(stats.totalUsers, 1)) * 100) : 0}% of members`}
              tint="#9b51e0"
              theme={theme}
            />
            <StatCard
              icon={Globe2}
              label="Countries"
              value={String(stats.countries)}
              detail={`of ${COUNTRIES.length} supported`}
              tint="#f2994a"
              theme={theme}
            />
            <StatCard
              icon={MessageCircle}
              label="Chats"
              value={String(stats.chats)}
              detail={`${stats.groups} groups · ${stats.unread} unread`}
              tint="#00a884"
              theme={theme}
            />
            <StatCard
              icon={BarChart3}
              label="Messages"
              value={String(stats.messages)}
              detail="stored across all chats"
              tint="#5b6cff"
              theme={theme}
            />
            <StatCard
              icon={Phone}
              label="Calls"
              value={String(stats.calls)}
              detail="voice, video & group"
              tint="#eb5757"
              theme={theme}
            />
            <StatCard
              icon={CircleDashed}
              label="Status updates"
              value={String(stats.statuses)}
              detail={`${stats.communities} communities`}
              tint="#27ae60"
              theme={theme}
            />
          </View>

          <View style={styles.twoColumn}>
            <Panel title="Recent sign-ups" subtitle="Newest member accounts" theme={theme}>
              {recentUsers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  detail="Accounts created from the sign-up screen will appear here."
                  theme={theme}
                />
              ) : (
                recentUsers.map((account) => (
                  <View key={account.id} style={[styles.recentRow, { borderBottomColor: theme.border }]}>
                    <Avatar name={account.name} uri={account.avatar} size={38} />
                    <View style={styles.recentText}>
                      <View style={styles.recentNameRow}>
                        <Text style={[styles.recentName, { color: theme.text }]} numberOfLines={1}>
                          {account.name}
                        </Text>
                        {account.verified ? (
                          <BadgeCheck color={theme.accent} size={14} />
                        ) : null}
                      </View>
                      <Text style={[styles.recentMeta, { color: theme.textSecondary }]}>
                        {account.countryName} · {formatListDate(account.createdAt)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            account.status === 'active'
                              ? theme.mode === 'dark'
                                ? '#0f3d34'
                                : '#e7f8f1'
                              : theme.mode === 'dark'
                                ? '#3a1a1c'
                                : '#fdeceb',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              account.status === 'active' ? theme.accentDark : theme.danger,
                          },
                        ]}
                      >
                        {account.status}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Panel>

            <View style={styles.stack}>
              <Panel title="Platform health" subtitle="Account quality at a glance" theme={theme}>
                <HealthBar
                  label="Active members"
                  value={stats.active}
                  total={Math.max(stats.totalUsers, 1)}
                  tint="#00a884"
                  theme={theme}
                />
                <HealthBar
                  label="Verified accounts"
                  value={stats.verified}
                  total={Math.max(stats.totalUsers, 1)}
                  tint="#9b51e0"
                  theme={theme}
                />
                <HealthBar
                  label="Global coverage"
                  value={stats.countries}
                  total={COUNTRIES.length}
                  tint="#f2994a"
                  theme={theme}
                />
                <View style={[styles.healthNote, { backgroundColor: theme.chip }]}>
                  <ShieldCheck color={theme.accent} size={15} />
                  <Text style={[styles.healthNoteText, { color: theme.textSecondary }]}>
                    Suspended accounts cannot sign in until they are reactivated.
                  </Text>
                </View>
              </Panel>

              <Panel title="Quick actions" subtitle="Common admin tasks" theme={theme}>
                <View style={styles.quickGrid}>
                  <QuickAction
                    icon={Users}
                    label="Manage users"
                    onPress={() => setSection('users')}
                    theme={theme}
                  />
                  <QuickAction
                    icon={Megaphone}
                    label="Send broadcast"
                    onPress={() => setSection('broadcast')}
                    theme={theme}
                  />
                  <QuickAction
                    icon={MessageCircle}
                    label="Moderate chats"
                    onPress={() => setSection('content')}
                    theme={theme}
                  />
                  <QuickAction
                    icon={ArrowLeft}
                    label="Open messenger"
                    onPress={() => router.push('/(tabs)' as never)}
                    theme={theme}
                  />
                </View>
              </Panel>
            </View>
          </View>
        </View>
      );
    }

    if (section === 'users') {
      return (
        <View style={styles.stack}>
          <View style={styles.toolbar}>
            <View style={[styles.searchBox, { backgroundColor: theme.search }]}>
              <Search color={theme.textMuted} size={17} />
              <TextInput
                value={userQuery}
                onChangeText={setUserQuery}
                placeholder="Search name, username, email, phone or country"
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.text }]}
                autoCapitalize="none"
              />
              {userQuery ? (
                <Pressable onPress={() => setUserQuery('')}>
                  <X color={theme.textMuted} size={15} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.chipRow}>
              {(
                [
                  ['all', `All ${accounts.length}`],
                  ['active', `Active ${accounts.filter((item) => item.status === 'active').length}`],
                  ['suspended', `Suspended ${accounts.filter((item) => item.status === 'suspended').length}`],
                  ['verified', `Verified ${accounts.filter((item) => item.verified).length}`],
                  ['admin', `Admins ${accounts.filter((item) => item.role === 'admin').length}`],
                ] as [typeof userFilter, string][]
              ).map(([key, label]) => {
                const active = userFilter === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setUserFilter(key)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.accent : theme.chip,
                        borderColor: active ? theme.accent : theme.border,
                      },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? '#ffffff' : theme.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Panel
            title={`${filteredUsers.length} account${filteredUsers.length === 1 ? '' : 's'}`}
            subtitle="Changes are saved automatically"
            theme={theme}
          >
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No accounts match"
                detail="Try a different search term or filter."
                theme={theme}
              />
            ) : (
              filteredUsers.map((account) => (
                <UserRow
                  key={account.id}
                  account={account}
                  theme={theme}
                  onVerify={() => {
                    toggleUserVerified(account.id);
                    notify('ok', `${account.name} verification status updated.`);
                  }}
                  onToggleStatus={() => {
                    toggleUserStatus(account.id);
                    notify(
                      'ok',
                      `${account.name} ${account.status === 'active' ? 'suspended' : 'reactivated'}.`,
                    );
                  }}
                  onReset={async () => {
                    const result = await adminResetPassword(account.id);
                    if (!result.ok) {
                      notify('error', result.error ?? 'Unable to reset password.');
                    } else {
                      notify(
                        'ok',
                        `Temporary password for ${account.username}: ${result.error ?? ''}`,
                      );
                    }
                  }}
                  onDelete={() =>
                    setConfirm({
                      title: 'Delete account',
                      message: `Permanently remove ${account.name} (@${account.username})? This cannot be undone.`,
                      action: async () => {
                        const result = await adminDeleteUser(account.id);
                        setConfirm(null);
                        notify(
                          result.ok ? 'ok' : 'error',
                          result.ok ? 'Account deleted.' : result.error ?? 'Unable to delete.',
                        );
                      },
                    })
                  }
                />
              ))
            )}
          </Panel>
        </View>
      );
    }

    if (section === 'content') {
      return (
        <View style={styles.stack}>
          <Panel
            title="Conversations"
            subtitle={`${state.chats.length} chats · ${stats.messages} messages`}
            theme={theme}
          >
            {state.chats.map((chat) => {
              const count = state.messages[chat.id]?.length ?? 0;
              return (
                <View key={chat.id} style={[styles.contentRow, { borderBottomColor: theme.border }]}>
                  <Avatar name={chat.name} uri={chat.avatar} size={38} group={chat.group} />
                  <View style={styles.contentText}>
                    <Text style={[styles.contentName, { color: theme.text }]} numberOfLines={1}>
                      {chat.name}
                    </Text>
                    <Text style={[styles.contentMeta, { color: theme.textSecondary }]}>
                      {chat.group ? 'Group' : 'Direct'} · {count} messages ·{' '}
                      {chat.unread} unread
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() =>
                        setConfirm({
                          title: 'Clear messages',
                          message: `Delete all messages in “${chat.name}”? The chat itself stays.`,
                          action: () => {
                            clearChatMessages(chat.id);
                            setConfirm(null);
                            notify('ok', `Messages cleared in “${chat.name}”.`);
                          },
                        })
                      }
                      style={({ pressed }) => [
                        styles.smallButton,
                        { borderColor: theme.border },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Trash2 color={theme.textSecondary} size={14} />
                      <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                        Clear
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setConfirm({
                          title: 'Delete chat',
                          message: `Remove “${chat.name}” and all of its messages?`,
                          action: () => {
                            deleteChat(chat.id);
                            setConfirm(null);
                            notify('ok', `Chat “${chat.name}” deleted.`);
                          },
                        })
                      }
                      style={({ pressed }) => [
                        styles.smallButton,
                        { borderColor: theme.danger },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Trash2 color={theme.danger} size={14} />
                      <Text style={[styles.smallButtonText, { color: theme.danger }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </Panel>

          <View style={styles.twoColumn}>
            <Panel
              title="Status updates"
              subtitle={`${stats.statuses} active status groups`}
              theme={theme}
            >
              {state.statuses.map((status) => (
                <View key={status.id} style={[styles.contentRow, { borderBottomColor: theme.border }]}>
                  <Avatar name={status.name} uri={status.avatar} size={36} />
                  <View style={styles.contentText}>
                    <Text style={[styles.contentName, { color: theme.text }]} numberOfLines={1}>
                      {status.name}
                    </Text>
                    <Text style={[styles.contentMeta, { color: theme.textSecondary }]}>
                      {status.items.length} update{status.items.length === 1 ? '' : 's'} ·{' '}
                      {truncate(status.time, 22)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setConfirm({
                        title: 'Delete status',
                        message: `Remove all status updates from ${status.name}?`,
                        action: () => {
                          deleteStatusGroup(status.id);
                          setConfirm(null);
                          notify('ok', 'Status updates removed.');
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.iconAction,
                      { backgroundColor: theme.chip },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Trash2 color={theme.danger} size={15} />
                  </Pressable>
                </View>
              ))}
            </Panel>

            <Panel
              title="Communities"
              subtitle={`${stats.communities} communities`}
              theme={theme}
            >
              {state.communities.map((community) => (
                <View
                  key={community.id}
                  style={[styles.communityRow, { borderBottomColor: theme.border }]}
                >
                  <Avatar name={community.name} uri={community.avatar} size={36} group />
                  <View style={styles.contentText}>
                    <Text style={[styles.contentName, { color: theme.text }]} numberOfLines={1}>
                      {community.name}
                    </Text>
                    <Text style={[styles.contentMeta, { color: theme.textSecondary }]}>
                      {community.members} members · {community.groups.length} groups
                    </Text>
                    <Text
                      style={[styles.communityAnnouncement, { color: theme.textMuted }]}
                      numberOfLines={2}
                    >
                      {community.announcement}
                    </Text>
                  </View>
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => setAnnouncement({ id: community.id, value: community.announcement })}
                      style={({ pressed }) => [
                        styles.iconAction,
                        { backgroundColor: theme.chip },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Megaphone color={theme.textSecondary} size={15} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setConfirm({
                          title: 'Delete community',
                          message: `Remove “${community.name}” from the platform?`,
                          action: () => {
                            deleteCommunity(community.id);
                            setConfirm(null);
                            notify('ok', 'Community deleted.');
                          },
                        })
                      }
                      style={({ pressed }) => [
                        styles.iconAction,
                        { backgroundColor: theme.chip },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Trash2 color={theme.danger} size={15} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </Panel>
          </View>
        </View>
      );
    }

    if (section === 'calls') {
      return (
        <View style={styles.stack}>
          <View style={styles.callSummary}>
            <StatCard
              icon={Phone}
              label="Total calls"
              value={String(stats.calls)}
              detail="all call history"
              tint="#5b6cff"
              theme={theme}
            />
            <StatCard
              icon={Phone}
              label="Missed"
              value={String(state.calls.filter((call) => call.direction === 'missed').length)}
              detail="needs attention"
              tint="#eb5757"
              theme={theme}
            />
            <StatCard
              icon={Activity}
              label="Video calls"
              value={String(state.calls.filter((call) => call.type === 'video').length)}
              detail="with screen sharing"
              tint="#00a884"
              theme={theme}
            />
          </View>

          <Panel
            title="Call history"
            subtitle="Recent activity across the platform"
            theme={theme}
            action={
              <Pressable
                onPress={() =>
                  setConfirm({
                    title: 'Clear call history',
                    message: 'Delete the entire call log? This cannot be undone.',
                    action: () => {
                      clearCalls();
                      setConfirm(null);
                      notify('ok', 'Call history cleared.');
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.smallButton,
                  { borderColor: theme.danger },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Trash2 color={theme.danger} size={14} />
                <Text style={[styles.smallButtonText, { color: theme.danger }]}>Clear all</Text>
              </Pressable>
            }
          >
            {state.calls.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No calls recorded"
                detail="Voice, video and group calls will be listed here."
                theme={theme}
              />
            ) : (
              state.calls.map((call) => (
                <View key={call.id} style={[styles.contentRow, { borderBottomColor: theme.border }]}>
                  <Avatar name={call.name} uri={call.avatar} size={38} />
                  <View style={styles.contentText}>
                    <Text style={[styles.contentName, { color: theme.text }]} numberOfLines={1}>
                      {call.name}
                    </Text>
                    <Text style={[styles.contentMeta, { color: theme.textSecondary }]}>
                      {call.direction} {call.type} call · {formatListDate(call.at)}
                      {call.duration ? ` · ${call.duration}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          call.direction === 'missed'
                            ? theme.mode === 'dark'
                              ? '#3a1a1c'
                              : '#fdeceb'
                            : theme.mode === 'dark'
                              ? '#0f3d34'
                              : '#e7f8f1',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            call.direction === 'missed' ? theme.danger : theme.accentDark,
                        },
                      ]}
                    >
                      {call.direction}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Panel>
        </View>
      );
    }

    if (section === 'broadcast') {
      return (
        <View style={styles.stack}>
          <View style={styles.twoColumn}>
            <Panel title="Compose broadcast" subtitle="Delivered to selected accounts" theme={theme}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TITLE</Text>
              <TextInput
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
                placeholder="e.g. Scheduled maintenance"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.formInput,
                  { backgroundColor: theme.panelAlt, borderColor: theme.border, color: theme.text },
                ]}
              />
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                MESSAGE
              </Text>
              <TextInput
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
                placeholder="Write your announcement for members…"
                placeholderTextColor={theme.textMuted}
                multiline
                style={[
                  styles.formInput,
                  styles.textArea,
                  { backgroundColor: theme.panelAlt, borderColor: theme.border, color: theme.text },
                ]}
              />
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                AUDIENCE
              </Text>
              <View style={styles.chipRow}>
                {(
                  [
                    ['everyone', 'Everyone'],
                    ['active', 'Active only'],
                    ['suspended', 'Suspended'],
                  ] as [Broadcast['audience'], string][]
                ).map(([key, label]) => {
                  const active = audience === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setAudience(key)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: active ? theme.accent : theme.chip,
                          borderColor: active ? theme.accent : theme.border,
                        },
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: active ? '#ffffff' : theme.textSecondary },
                        ]}
                      >
                        {label} · {audienceCount(key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={submitBroadcast}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.82 },
                ]}
              >
                <Send color="#ffffff" size={16} />
                <Text style={styles.primaryButtonText}>Send broadcast</Text>
              </Pressable>
              <View style={[styles.infoNote, { backgroundColor: theme.chip }]}>
                <Bell color={theme.accent} size={15} />
                <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
                  Broadcasts are stored in the admin center and count toward platform activity.
                  Delivery is simulated in this environment.
                </Text>
              </View>
            </Panel>

            <Panel
              title="Broadcast history"
              subtitle={`${broadcasts.length} sent announcement${broadcasts.length === 1 ? '' : 's'}`}
              theme={theme}
            >
              {broadcasts.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No broadcasts yet"
                  detail="Your announcements will appear here after you send them."
                  theme={theme}
                />
              ) : (
                broadcasts.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.broadcastRow, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}
                  >
                    <View style={styles.broadcastTop}>
                      <View style={[styles.broadcastIcon, { backgroundColor: theme.chip }]}>
                        <Megaphone color={theme.accent} size={16} />
                      </View>
                      <View style={styles.broadcastText}>
                        <Text style={[styles.broadcastTitle, { color: theme.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.broadcastMeta, { color: theme.textMuted }]}>
                          {item.audience} · {formatListDate(item.createdAt)} · by {item.sentBy}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setConfirm({
                            title: 'Delete broadcast',
                            message: `Remove “${item.title}” from broadcast history?`,
                            action: () => {
                              deleteBroadcast(item.id);
                              setConfirm(null);
                              notify('ok', 'Broadcast removed.');
                            },
                          })
                        }
                        style={({ pressed }) => [pressed && { opacity: 0.6 }]}
                      >
                        <Trash2 color={theme.textMuted} size={15} />
                      </Pressable>
                    </View>
                    <Text style={[styles.broadcastMessage, { color: theme.textSecondary }]}>
                      {item.message}
                    </Text>
                  </View>
                ))
              )}
            </Panel>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stack}>
        <View style={styles.twoColumn}>
          <Panel title="Administrator" subtitle="Built-in platform owner" theme={theme}>
            <View style={styles.adminCard}>
              <Avatar name={admin?.name ?? 'Administrator'} uri={admin?.avatar} size={62} />
              <View style={styles.adminIdentity}>
                <Text style={[styles.adminName, { color: theme.text }]}>
                  {admin?.name ?? 'Administrator'}
                </Text>
                <Text style={[styles.adminUsername, { color: theme.textSecondary }]}>
                  @{admin?.username}
                </Text>
                <View style={styles.adminBadges}>
                  <View style={[styles.roleBadge, { backgroundColor: theme.accentSoft }]}>
                    <ShieldCheck color={theme.accentDark} size={12} />
                    <Text style={[styles.roleBadgeText, { color: theme.accentDark }]}>
                      SUPER ADMIN
                    </Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: theme.chip }]}>
                    <BadgeCheck color={theme.textSecondary} size={12} />
                    <Text style={[styles.roleBadgeText, { color: theme.textSecondary }]}>
                      VERIFIED
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.detailList}>
              <DetailRow icon={Mail} label="Email" value={admin?.email ?? '—'} theme={theme} />
              <DetailRow
                icon={Globe2}
                label="Country"
                value={admin?.countryName ?? '—'}
                theme={theme}
              />
              <DetailRow
                icon={Calendar}
                label="Account since"
                value={admin ? formatListDate(admin.createdAt) : '—'}
                theme={theme}
              />
            </View>
            <View style={styles.settingsActions}>
              <Pressable
                onPress={() => router.push('/(tabs)' as never)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MessageCircle color={theme.textSecondary} size={15} />
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Open messenger
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  signOut();
                  router.replace('/auth' as never);
                }}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.danger },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <LogOut color={theme.danger} size={15} />
                <Text style={[styles.secondaryButtonText, { color: theme.danger }]}>Sign out</Text>
              </Pressable>
            </View>
          </Panel>

          <View style={styles.stack}>
            <Panel title="Security" subtitle="Change the administrator password" theme={theme}>
              {(
                [
                  ['Current password', currentPassword, setCurrentPassword],
                  ['New password', nextPassword, setNextPassword],
                  ['Confirm new password', confirmPassword, setConfirmPassword],
                ] as [string, string, (value: string) => void][]
              ).map(([label, value, setter], index) => (
                <View key={label} style={index > 0 && { marginTop: 12 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    {label.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.passwordWrap,
                      { backgroundColor: theme.panelAlt, borderColor: theme.border },
                    ]}
                  >
                    <Lock color={theme.textMuted} size={15} />
                    <TextInput
                      value={value}
                      onChangeText={setter}
                      placeholder="••••••••"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry={!showPasswords}
                      autoCapitalize="none"
                      style={[styles.passwordInput, { color: theme.text }]}
                    />
                    {index === 0 ? (
                      <Pressable onPress={() => setShowPasswords((current) => !current)}>
                        {showPasswords ? (
                          <EyeOff color={theme.textMuted} size={16} />
                        ) : (
                          <Eye color={theme.textMuted} size={16} />
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
              <Pressable
                onPress={submitPassword}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.accent, marginTop: 16 },
                  pressed && { opacity: 0.82 },
                ]}
              >
                <KeyRound color="#ffffff" size={16} />
                <Text style={styles.primaryButtonText}>Update password</Text>
              </Pressable>
              <View style={[styles.infoNote, { backgroundColor: theme.chip }]}>
                <ShieldCheck color={theme.accent} size={15} />
                <Text style={[styles.infoNoteText, { color: theme.textSecondary }]}>
                  The built-in admin account is protected. Use the credentials configured for this
                  deployment to sign in.
                </Text>
              </View>
            </Panel>

            <Panel title="Appearance" subtitle="Admin center theme" theme={theme}>
              <View style={styles.themeRow}>
                {(
                  [
                    ['light', 'Light', Sun],
                    ['dark', 'Dark', Moon],
                  ] as const
                ).map(([mode, label, Icon]) => {
                  const active = theme.mode === mode;
                  return (
                    <Pressable
                      key={mode}
                      onPress={() => setTheme(mode)}
                      style={({ pressed }) => [
                        styles.themeOption,
                        {
                          borderColor: active ? theme.accent : theme.border,
                          backgroundColor: active ? theme.chipActive : theme.panelAlt,
                        },
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Icon color={active ? theme.accentDark : theme.textSecondary} size={18} />
                      <Text
                        style={[
                          styles.themeOptionText,
                          { color: active ? theme.text : theme.textSecondary },
                        ]}
                      >
                        {label}
                      </Text>
                      {active ? <Check color={theme.accentDark} size={15} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={toggleTheme}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { borderColor: theme.border, marginTop: 12 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {theme.mode === 'dark' ? (
                  <Sun color={theme.textSecondary} size={15} />
                ) : (
                  <Moon color={theme.textSecondary} size={15} />
                )}
                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                  Switch to {theme.mode === 'dark' ? 'light' : 'dark'} mode
                </Text>
              </Pressable>
            </Panel>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      {desktop ? (
        <View style={styles.desktopRow}>
          <View style={[styles.sidebar, { backgroundColor: theme.rail }]}>
            <View style={styles.sidebarBrand}>
              <View style={[styles.sidebarLogo, { backgroundColor: theme.accent }]}>
                <ShieldCheck color="#ffffff" size={20} strokeWidth={2.3} />
              </View>
              <View style={styles.sidebarBrandText}>
                <Text style={styles.sidebarTitle}>WhatsApp</Text>
                <Text style={styles.sidebarSub}>Admin Center</Text>
              </View>
            </View>

            <View style={styles.sidebarNav}>{NAV.map((item) => navButton(item))}</View>

            <View style={styles.sidebarBottom}>
              <View style={[styles.sidebarProfile, { backgroundColor: theme.railSoft }]}>
                <Avatar name={admin?.name ?? 'Administrator'} uri={admin?.avatar} size={36} />
                <View style={styles.sidebarProfileText}>
                  <Text style={styles.sidebarProfileName} numberOfLines={1}>
                    {admin?.name ?? 'Administrator'}
                  </Text>
                  <Text style={styles.sidebarProfileRole} numberOfLines={1}>
                    @{admin?.username}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)' as never)}
                style={({ pressed }) => [styles.sidebarAction, pressed && { opacity: 0.7 }]}
              >
                <MessageCircle color={theme.railText} size={16} />
                <Text style={styles.sidebarActionText}>Open messenger</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  signOut();
                  router.replace('/auth' as never);
                }}
                style={({ pressed }) => [styles.sidebarAction, pressed && { opacity: 0.7 }]}
              >
                <LogOut color={theme.railText} size={16} />
                <Text style={styles.sidebarActionText}>Sign out</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.main}>
            <View style={[styles.mainHeader, { borderBottomColor: theme.border }]}>
              <View style={styles.mainHeaderText}>
                <View style={styles.mainHeaderTitleRow}>
                  <Text style={[styles.mainTitle, { color: theme.text }]}>
                    {SECTION_TITLES[section].title}
                  </Text>
                  <View style={[styles.livePill, { backgroundColor: theme.accentSoft }]}>
                    <View style={[styles.liveDot, { backgroundColor: theme.accent }]} />
                    <Text style={[styles.liveText, { color: theme.accentDark }]}>LIVE</Text>
                  </View>
                </View>
                <Text style={[styles.mainSubtitle, { color: theme.textSecondary }]}>
                  {SECTION_TITLES[section].subtitle}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => setSection('broadcast')}
                  style={({ pressed }) => [
                    styles.headerButton,
                    { backgroundColor: theme.chip },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Megaphone color={theme.textSecondary} size={17} />
                </Pressable>
                <View style={[styles.headerDivider, { backgroundColor: theme.border }]} />
                <View style={styles.headerAdmin}>
                  <Avatar name={admin?.name ?? 'Administrator'} uri={admin?.avatar} size={34} />
                  <View>
                    <Text style={[styles.headerAdminName, { color: theme.text }]} numberOfLines={1}>
                      {admin?.name ?? 'Administrator'}
                    </Text>
                    <Text style={[styles.headerAdminRole, { color: theme.textMuted }]}>
                      Super admin
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mainScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.contentWidth}>{sectionContent()}</View>
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={styles.mobileShell}>
          <View style={[styles.mobileHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.mobileBrandRow}>
              <View style={[styles.mobileLogo, { backgroundColor: theme.accent }]}>
                <ShieldCheck color="#ffffff" size={17} />
              </View>
              <View style={styles.mobileBrandText}>
                <Text style={[styles.mobileTitle, { color: theme.text }]}>Admin Center</Text>
                <Text style={[styles.mobileSubtitle, { color: theme.textMuted }]}>
                  @{admin?.username}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => {
                signOut();
                router.replace('/auth' as never);
              }}
              style={({ pressed }) => [
                styles.iconAction,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.7 },
              ]}
            >
              <LogOut color={theme.danger} size={16} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mobileNavScroll}
            contentContainerStyle={styles.mobileNav}
          >
            {NAV.map((item) => navButton(item, true))}
          </ScrollView>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mobileScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.mobileSectionHeader}>
              <Text style={[styles.mobileSectionTitle, { color: theme.text }]}>
                {SECTION_TITLES[section].title}
              </Text>
              <Text style={[styles.mobileSectionSub, { color: theme.textSecondary }]}>
                {SECTION_TITLES[section].subtitle}
              </Text>
            </View>
            {sectionContent()}
            <Pressable
              onPress={() => router.push('/(tabs)' as never)}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.border, marginTop: 14 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <MessageCircle color={theme.textSecondary} size={15} />
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                Open messenger
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {toast ? (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: theme.mode === 'dark' ? '#202c33' : '#ffffff',
              borderColor: toast.tone === 'ok' ? theme.accent : theme.danger,
            },
          ]}
        >
          {toast.tone === 'ok' ? (
            <CheckCircle2 color={theme.accent} size={17} />
          ) : (
            <Ban color={theme.danger} size={17} />
          )}
          <Text style={[styles.toastText, { color: theme.text }]}>{toast.text}</Text>
          <Pressable onPress={() => setToast(null)}>
            <X color={theme.textMuted} size={15} />
          </Pressable>
        </View>
      ) : null}

      <Sheet
        visible={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        subtitle={confirm?.message}
        maxWidth={420}
        footer={
          <View style={styles.confirmFooter}>
            <Pressable
              onPress={() => setConfirm(null)}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.border, flex: 1 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => confirm?.action()}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.danger, flex: 1, marginTop: 0 },
                pressed && { opacity: 0.82 },
              ]}
            >
              <Trash2 color="#ffffff" size={15} />
              <Text style={styles.primaryButtonText}>Confirm</Text>
            </Pressable>
          </View>
        }
      >
        <View style={styles.confirmNote}>
          <Text style={[styles.confirmNoteText, { color: theme.textSecondary }]}>
            Please review this action carefully. Administrative changes take effect immediately.
          </Text>
        </View>
      </Sheet>

      <Sheet
        visible={Boolean(announcement)}
        onClose={() => setAnnouncement(null)}
        title="Community announcement"
        subtitle="Update the pinned announcement members see"
        maxWidth={440}
        footer={
          <Pressable
            onPress={() => {
              if (!announcement) return;
              updateCommunityAnnouncement(announcement.id, announcement.value.trim());
              setAnnouncement(null);
              notify('ok', 'Community announcement updated.');
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent },
              pressed && { opacity: 0.82 },
            ]}
          >
            <Text style={styles.primaryButtonText}>Save announcement</Text>
          </Pressable>
        }
      >
        <TextInput
          value={announcement?.value ?? ''}
          onChangeText={(value) =>
            setAnnouncement((prev) => (prev ? { ...prev, value } : prev))
          }
          multiline
          placeholder="Write the announcement…"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.formInput,
            styles.textArea,
            {
              backgroundColor: theme.panelAlt,
              borderColor: theme.border,
              color: theme.text,
              minHeight: 110,
            },
          ]}
        />
      </Sheet>
    </SafeAreaView>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tint,
  theme,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  detail: string;
  tint: string;
  theme: ReturnType<typeof useApp>['theme'];
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
      <View style={styles.statTop}>
        <View style={[styles.statIcon, { backgroundColor: `${tint}1f` }]}>
          <Icon color={tint} size={18} />
        </View>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statDetail, { color: theme.textMuted }]}>{detail}</Text>
    </View>
  );
}

function Panel({
  title,
  subtitle,
  action,
  theme,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  theme: ReturnType<typeof useApp>['theme'];
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
      <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.panelHeaderText}>
          <Text style={[styles.panelTitle, { color: theme.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.panelSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
          ) : null}
        </View>
        {action}
      </View>
      <View style={styles.panelBody}>{children}</View>
    </View>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  theme,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  title: string;
  detail: string;
  theme: ReturnType<typeof useApp>['theme'];
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.chip }]}>
        <Icon color={theme.textMuted} size={22} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyDetail, { color: theme.textSecondary }]}>{detail}</Text>
    </View>
  );
}

function HealthBar({
  label,
  value,
  total,
  tint,
  theme,
}: {
  label: string;
  value: number;
  total: number;
  tint: string;
  theme: ReturnType<typeof useApp>['theme'];
}) {
  const percent = Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  return (
    <View style={styles.healthRow}>
      <View style={styles.healthTop}>
        <Text style={[styles.healthLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.healthValue, { color: theme.text }]}>
          {percent}% <Text style={{ color: theme.textMuted }}>({value})</Text>
        </Text>
      </View>
      <View style={[styles.healthTrack, { backgroundColor: theme.chip }]}>
        <View style={[styles.healthFill, { width: `${percent}%`, backgroundColor: tint }]} />
      </View>
    </View>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onPress,
  theme,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useApp>['theme'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: theme.panelAlt, borderColor: theme.border },
        pressed && { opacity: 0.75 },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: theme.chipActive }]}>
        <Icon color={theme.accentDark} size={17} />
      </View>
      <Text style={[styles.quickLabel, { color: theme.text }]}>{label}</Text>
      <ChevronRight color={theme.textMuted} size={15} />
    </Pressable>
  );
}

function UserRow({
  account,
  theme,
  onVerify,
  onToggleStatus,
  onReset,
  onDelete,
}: {
  account: Account;
  theme: ReturnType<typeof useApp>['theme'];
  onVerify: () => void;
  onToggleStatus: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.userCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
      <View style={styles.userTop}>
        <Avatar name={account.name} uri={account.avatar} size={44} />
        <View style={styles.userIdentity}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {account.name}
            </Text>
            {account.verified ? <BadgeCheck color={theme.accent} size={15} /> : null}
            {account.role === 'admin' ? (
              <View style={[styles.miniBadge, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.miniBadgeText, { color: theme.accentDark }]}>ADMIN</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.userHandle, { color: theme.textSecondary }]} numberOfLines={1}>
            @{account.username} · {account.email}
          </Text>
          <Text style={[styles.userMeta, { color: theme.textMuted }]} numberOfLines={1}>
            {account.countryCode} {account.phone} · {account.countryName} · joined{' '}
            {formatListDate(account.createdAt)}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                account.status === 'active'
                  ? theme.mode === 'dark'
                    ? '#0f3d34'
                    : '#e7f8f1'
                  : theme.mode === 'dark'
                    ? '#3a1a1c'
                    : '#fdeceb',
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              { color: account.status === 'active' ? theme.accentDark : theme.danger },
            ]}
          >
            {account.status}
          </Text>
        </View>
      </View>

      <View style={styles.userActions}>
        <UserAction
          icon={account.verified ? X : UserCheck}
          label={account.verified ? 'Unverify' : 'Verify'}
          onPress={onVerify}
          theme={theme}
        />
        {account.role !== 'admin' ? (
          <>
            <UserAction
              icon={account.status === 'active' ? UserX : CheckCircle2}
              label={account.status === 'active' ? 'Suspend' : 'Activate'}
              onPress={onToggleStatus}
              theme={theme}
              danger={account.status === 'active'}
            />
            <UserAction icon={KeyRound} label="Reset password" onPress={onReset} theme={theme} />
            <UserAction
              icon={Trash2}
              label="Delete"
              onPress={onDelete}
              theme={theme}
              danger
            />
          </>
        ) : (
          <View style={styles.protectedNote}>
            <ShieldCheck color={theme.textMuted} size={13} />
            <Text style={[styles.protectedText, { color: theme.textMuted }]}>
              Protected administrator account
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function UserAction({
  icon: Icon,
  label,
  onPress,
  theme,
  danger = false,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useApp>['theme'];
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.userAction,
        { borderColor: danger ? theme.danger : theme.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon color={danger ? theme.danger : theme.textSecondary} size={13} />
      <Text style={[styles.userActionText, { color: danger ? theme.danger : theme.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  theme,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  theme: ReturnType<typeof useApp>['theme'];
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
      <Icon color={theme.textMuted} size={15} />
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 262,
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 16,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 8,
    marginBottom: 26,
  },
  sidebarLogo: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBrandText: {
    gap: 1,
  },
  sidebarTitle: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sidebarSub: {
    color: '#8696a0',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sidebarNav: {
    flex: 1,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
  },
  navText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  navBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  sidebarBottom: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a3942',
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    borderRadius: 11,
    marginBottom: 4,
  },
  sidebarProfileText: {
    flex: 1,
    minWidth: 0,
  },
  sidebarProfileName: {
    color: '#e9edef',
    fontSize: 12,
    fontWeight: '700',
  },
  sidebarProfileRole: {
    color: '#8696a0',
    fontSize: 10,
    marginTop: 1,
  },
  sidebarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  sidebarActionText: {
    color: '#aebac1',
    fontSize: 11.5,
    fontWeight: '600',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 18,
  },
  mainHeaderText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  mainHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  mainSubtitle: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
  },
  headerAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerAdminName: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 130,
  },
  headerAdminRole: {
    fontSize: 10,
    marginTop: 1,
  },
  mainScroll: {
    padding: 26,
    paddingBottom: 40,
  },
  contentWidth: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  stack: {
    gap: 18,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 200,
    minWidth: 160,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
    gap: 4,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 7,
  },
  statIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  statDetail: {
    fontSize: 10.5,
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 18,
  },
  panel: {
    flexGrow: 1,
    flexBasis: 420,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  panelHeaderText: {
    flex: 1,
    gap: 3,
  },
  panelTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  panelSubtitle: {
    fontSize: 11,
  },
  panelBody: {
    padding: 16,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  recentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  recentMeta: {
    fontSize: 10.5,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  healthRow: {
    gap: 6,
    marginBottom: 13,
  },
  healthTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthLabel: {
    fontSize: 11.5,
  },
  healthValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  healthTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9,
    padding: 10,
    marginTop: 2,
  },
  healthNoteText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  quickAction: {
    flexGrow: 1,
    flexBasis: 170,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 11,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
  },
  toolbar: {
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 44,
    borderRadius: 11,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  userCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  userTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  userIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
    maxWidth: 240,
  },
  miniBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  miniBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  userHandle: {
    fontSize: 10.5,
  },
  userMeta: {
    fontSize: 10,
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 54,
  },
  userAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  userActionText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  protectedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  protectedText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contentName: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  contentMeta: {
    fontSize: 10.5,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  smallButtonText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  communityAnnouncement: {
    fontSize: 9.5,
    lineHeight: 13,
    marginTop: 2,
  },
  callSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1.2,
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
  },
  textArea: {
    height: 110,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 42,
    borderRadius: 9,
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9,
    padding: 10,
    marginTop: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  broadcastRow: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 11,
    marginBottom: 9,
    gap: 7,
  },
  broadcastTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  broadcastIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  broadcastText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  broadcastTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  broadcastMeta: {
    fontSize: 9.5,
    textTransform: 'capitalize',
  },
  broadcastMessage: {
    fontSize: 11,
    lineHeight: 16,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 14,
  },
  adminIdentity: {
    flex: 1,
    gap: 2,
  },
  adminName: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  adminUsername: {
    fontSize: 11.5,
  },
  adminBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  roleBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  detailList: {
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: {
    width: 88,
    fontSize: 11,
  },
  detailValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'right',
  },
  settingsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 14,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 9,
    borderWidth: 1.2,
    paddingHorizontal: 11,
  },
  passwordInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 9,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.4,
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 42,
  },
  themeOptionText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 5,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyDetail: {
    fontSize: 10.5,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 15,
  },
  mobileShell: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mobileBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileLogo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileBrandText: {
    gap: 1,
  },
  mobileTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  mobileSubtitle: {
    fontSize: 10,
  },
  mobileNavScroll: {
    flexGrow: 0,
  },
  mobileNav: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  mobileNavText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  mobileScroll: {
    paddingHorizontal: 14,
    paddingBottom: 34,
  },
  mobileSectionHeader: {
    gap: 3,
    marginBottom: 14,
    marginTop: 4,
  },
  mobileSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  mobileSectionSub: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    borderRadius: 11,
    borderWidth: 1.2,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 12,
    maxWidth: 620,
    alignSelf: 'center',
  },
  toastText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
  },
  confirmFooter: {
    flexDirection: 'row',
    gap: 9,
  },
  confirmNote: {
    paddingVertical: 4,
  },
  confirmNoteText: {
    fontSize: 11.5,
    lineHeight: 17,
  },
});
