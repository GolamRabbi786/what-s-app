import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Lock,
  MoreVertical,
  Phone,
  PhoneMissed,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppShell } from '../../components/AppShell';
import { Avatar } from '../../components/Avatar';
import { CallOverlay } from '../../components/CallOverlay';
import { Sheet } from '../../components/Sheet';
import { useApp } from '../../context/AppContext';
import { formatListDate } from '../../lib/format';
import { CallLog } from '../../lib/types';

export default function CallsScreen() {
  return (
    <AppShell active="calls">
      <CallsHome />
    </AppShell>
  );
}

type CallFilter = 'all' | 'missed' | 'voice' | 'video';

interface CallTarget {
  contactId: string;
  name: string;
  avatar?: string;
  type: 'voice' | 'video';
}

function CallsHome() {
  const { theme, state, clearCalls } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 1040;
  const [filter, setFilter] = useState<CallFilter>('all');
  const [newCallOpen, setNewCallOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callTarget, setCallTarget] = useState<CallTarget | null>(null);

  const contacts = state.chats.filter((chat) => !chat.group && chat.id !== 'self');

  const counts = {
    all: state.calls.length,
    missed: state.calls.filter((call) => call.direction === 'missed').length,
    voice: state.calls.filter((call) => call.type === 'voice').length,
    video: state.calls.filter((call) => call.type === 'video').length,
  };

  const filteredCalls = useMemo(() => {
    return [...state.calls]
      .filter((call) => {
        if (filter === 'missed') return call.direction === 'missed';
        if (filter === 'voice') return call.type === 'voice';
        if (filter === 'video') return call.type === 'video';
        return true;
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [state.calls, filter]);

  const groups = useMemo(() => {
    const output: { label: string; calls: CallLog[] }[] = [];
    filteredCalls.forEach((call) => {
      const label = formatListDate(call.at);
      const existing = output.find((entry) => entry.label === label);
      if (existing) existing.calls.push(call);
      else output.push({ label, calls: [call] });
    });
    return output;
  }, [filteredCalls]);

  const filteredContacts = contacts.filter((contact) => {
    const query = search.trim().toLowerCase();
    return !query || contact.name.toLowerCase().includes(query) || (contact.phone ?? '').includes(query);
  });

  const startCall = (target: CallTarget) => {
    setNewCallOpen(false);
    setSearch('');
    setCallTarget(target);
  };

  const chips: { key: CallFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'missed', label: 'Missed', count: counts.missed },
    { key: 'voice', label: 'Voice', count: counts.voice },
    { key: 'video', label: 'Video', count: counts.video },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.panel }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>Calls</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Recent voice and video calls
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setNewCallOpen(true)}
                style={({ pressed }) => [
                  styles.newButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Plus color="#ffffff" size={17} />
                {wide ? <Text style={styles.newButtonText}>New call</Text> : null}
              </Pressable>
              <Pressable
                onPress={() => setMenuOpen(true)}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MoreVertical color={theme.icon} size={20} />
              </Pressable>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.chip }]}>
                <Phone color={theme.accentDark} size={18} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>{counts.all}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total calls</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(234,67,53,0.12)' }]}>
                <PhoneMissed color={theme.danger} size={18} />
              </View>
              <View>
                <Text style={[styles.statValue, { color: theme.text }]}>{counts.missed}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Missed calls</Text>
              </View>
            </View>
            <View
              style={[
                styles.statCard,
                styles.secureStat,
                { backgroundColor: theme.panelAlt, borderColor: theme.border },
              ]}
            >
              <View style={[styles.statIcon, { backgroundColor: theme.chip }]}>
                <Lock color={theme.accentDark} size={18} />
              </View>
              <View style={styles.secureStatText}>
                <Text style={[styles.statValue, { color: theme.text }]}>Encrypted</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Calls stay between you
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.searchBox, { backgroundColor: theme.search }]}>
            <Search color={theme.textMuted} size={18} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search calls"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <X color={theme.textMuted} size={16} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {chips.map((chip) => {
              const active = filter === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setFilter(chip.key)}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? theme.chipActive : theme.chip },
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

          {groups.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.chip }]}>
                <PhoneMissed color={theme.textMuted} size={28} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {search ? 'No matching calls' : `No ${filter === 'all' ? '' : filter} calls`}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {search
                  ? 'Try a different name or number.'
                  : 'Your call history will appear here once you make or receive a call.'}
              </Text>
              <Pressable
                onPress={() => setNewCallOpen(true)}
                style={({ pressed }) => [
                  styles.emptyButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Plus color="#ffffff" size={15} />
                <Text style={styles.emptyButtonText}>Start a call</Text>
              </Pressable>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.label}>
                <Text style={[styles.groupLabel, { color: theme.textMuted }]}>{group.label}</Text>
                <View style={[styles.callList, { borderColor: theme.border }]}>
                  {group.calls
                    .filter((call) => {
                      if (!search.trim()) return true;
                      return call.name.toLowerCase().includes(search.trim().toLowerCase());
                    })
                    .map((call) => (
                      <CallRow
                        key={call.id}
                        call={call}
                        onVoice={() =>
                          startCall({
                            contactId: call.contactId,
                            name: call.name,
                            avatar: call.avatar,
                            type: 'voice',
                          })
                        }
                        onVideo={() =>
                          startCall({
                            contactId: call.contactId,
                            name: call.name,
                            avatar: call.avatar,
                            type: 'video',
                          })
                        }
                      />
                    ))}
                </View>
              </View>
            ))
          )}

          <View style={[styles.footerNote, { borderTopColor: theme.border }]}>
            <Lock color={theme.textMuted} size={14} />
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Personal calls are secured with end-to-end encryption.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Sheet
        visible={newCallOpen}
        onClose={() => {
          setNewCallOpen(false);
          setSearch('');
        }}
        title="New call"
        subtitle="Choose a contact and call type"
        maxWidth={450}
      >
        <View style={[styles.callTypeToggle, { backgroundColor: theme.chip }]}>
          <Pressable
            onPress={() => setCallType('voice')}
            style={[
              styles.callTypeOption,
              callType === 'voice' && { backgroundColor: theme.panel },
            ]}
          >
            <Phone
              color={callType === 'voice' ? theme.accentDark : theme.textSecondary}
              size={16}
            />
            <Text
              style={[
                styles.callTypeText,
                { color: callType === 'voice' ? theme.accentDark : theme.textSecondary },
              ]}
            >
              Voice
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCallType('video')}
            style={[
              styles.callTypeOption,
              callType === 'video' && { backgroundColor: theme.panel },
            ]}
          >
            <Video
              color={callType === 'video' ? theme.accentDark : theme.textSecondary}
              size={16}
            />
            <Text
              style={[
                styles.callTypeText,
                { color: callType === 'video' ? theme.accentDark : theme.textSecondary },
              ]}
            >
              Video
            </Text>
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: theme.search, marginTop: 12 }]}>
          <Search color={theme.textMuted} size={17} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts"
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        <Text style={[styles.contactsLabel, { color: theme.textMuted }]}>CONTACTS</Text>
        {filteredContacts.length === 0 ? (
          <View style={styles.contactEmpty}>
            <Search color={theme.textMuted} size={26} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No contacts found</Text>
          </View>
        ) : (
          filteredContacts.map((contact) => (
            <Pressable
              key={contact.id}
              onPress={() =>
                startCall({
                  contactId: contact.id,
                  name: contact.name,
                  avatar: contact.avatar,
                  type: callType,
                })
              }
              style={({ pressed }) => [
                styles.contactRow,
                { borderColor: theme.border },
                pressed && { opacity: 0.68 },
              ]}
            >
              <Avatar
                name={contact.name}
                uri={contact.avatar}
                size={42}
                online={contact.online}
                showOnline
              />
              <View style={styles.contactText}>
                <Text style={[styles.contactName, { color: theme.text }]}>{contact.name}</Text>
                <Text style={[styles.contactSub, { color: theme.textSecondary }]}>
                  {contact.online ? 'online now' : contact.about ?? 'WhatsApp contact'}
                </Text>
              </View>
              <View style={[styles.contactCallIcon, { backgroundColor: theme.accentSoft }]}>
                {callType === 'video' ? (
                  <Video color={theme.accentDark} size={16} />
                ) : (
                  <Phone color={theme.accentDark} size={16} />
                )}
              </View>
            </Pressable>
          ))
        )}
      </Sheet>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Call options" maxWidth={400}>
        <View style={styles.menuList}>
          <MenuOption
            icon={Plus}
            label="Start a new call"
            onPress={() => {
              setMenuOpen(false);
              setNewCallOpen(true);
            }}
          />
          <MenuOption
            icon={Trash2}
            label="Clear call log"
            danger
            onPress={() => {
              clearCalls();
              setMenuOpen(false);
            }}
          />
          <View style={[styles.menuNote, { backgroundColor: theme.chip }]}>
            <Clock color={theme.textMuted} size={15} />
            <Text style={[styles.menuNoteText, { color: theme.textSecondary }]}>
              Call logs are stored on this device. Clearing them won’t delete calls on linked devices.
            </Text>
          </View>
        </View>
      </Sheet>

      {callTarget ? (
        <CallOverlay
          visible={Boolean(callTarget)}
          contactId={callTarget.contactId}
          name={callTarget.name}
          avatar={callTarget.avatar}
          type={callTarget.type}
          onClose={() => setCallTarget(null)}
        />
      ) : null}
    </View>
  );
}

function CallRow({
  call,
  onVoice,
  onVideo,
}: {
  call: CallLog;
  onVoice: () => void;
  onVideo: () => void;
}) {
  const { theme } = useApp();
  const missed = call.direction === 'missed';
  const DirectionIcon =
    call.direction === 'missed'
      ? PhoneMissed
      : call.direction === 'incoming'
        ? ArrowDownLeft
        : ArrowUpRight;
  const directionLabel =
    call.direction === 'missed'
      ? 'Missed'
      : call.direction === 'incoming'
        ? 'Incoming'
        : 'Outgoing';
  const directionColor = missed ? theme.danger : theme.accentDark;

  return (
    <View style={[styles.callRow, { borderColor: theme.border }]}>
      <Avatar name={call.name} uri={call.avatar} size={45} />
      <View style={styles.callText}>
        <Text style={[styles.callName, { color: missed ? theme.danger : theme.text }]} numberOfLines={1}>
          {call.name}
        </Text>
        <View style={styles.callMetaRow}>
          <DirectionIcon color={directionColor} size={14} />
          <Text style={[styles.callMeta, { color: directionColor }]}>
            {directionLabel} {call.type} call
          </Text>
          {call.duration ? (
            <Text style={[styles.callDuration, { color: theme.textMuted }]}>· {call.duration}</Text>
          ) : null}
        </View>
      </View>
      <Text style={[styles.callTime, { color: theme.textMuted }]}>
        {new Date(call.at).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
      <View style={styles.callActions}>
        <Pressable
          onPress={onVoice}
          style={({ pressed }) => [
            styles.callAction,
            { backgroundColor: theme.chip },
            pressed && { opacity: 0.65 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Call ${call.name}`}
        >
          <Phone color={theme.accentDark} size={16} />
        </Pressable>
        <Pressable
          onPress={onVideo}
          style={({ pressed }) => [
            styles.callAction,
            { backgroundColor: theme.chip },
            pressed && { opacity: 0.65 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Video call ${call.name}`}
        >
          <Video color={theme.accentDark} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function MenuOption({
  icon: Icon,
  label,
  onPress,
  danger = false,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuOption, pressed && { opacity: 0.62 }]}
    >
      <Icon color={danger ? theme.danger : theme.icon} size={19} />
      <Text style={[styles.menuOptionText, { color: danger ? theme.danger : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 34,
  },
  page: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minWidth: 0,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9.5,
    marginTop: 1,
  },
  secureStat: {
    flex: 1.25,
  },
  secureStatText: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  chipRow: {
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
  groupLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 7,
  },
  callList: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  callText: {
    flex: 1,
    minWidth: 0,
  },
  callName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  callMeta: {
    fontSize: 10.5,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  callDuration: {
    fontSize: 10,
  },
  callTime: {
    fontSize: 9.5,
  },
  callActions: {
    flexDirection: 'row',
    gap: 6,
  },
  callAction: {
    width: 31,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 34,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 320,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
    marginTop: 14,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 10,
    textAlign: 'center',
  },
  callTypeToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 9,
  },
  callTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 33,
    borderRadius: 7,
  },
  callTypeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  contactsLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 14,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactText: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '600',
  },
  contactSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  contactCallIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
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
  menuNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 10,
    padding: 11,
    marginTop: 7,
  },
  menuNoteText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14.5,
  },
});
