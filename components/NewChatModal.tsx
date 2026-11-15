import {
  ArrowLeft,
  Check,
  ChevronRight,
  Link2,
  MessageSquarePlus,
  Search,
  UserPlus,
  Users,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';
import { Sheet } from './Sheet';

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NewChatModal({ visible, onClose }: NewChatModalProps) {
  const { theme, state, openChat, createGroup, startDirectChat } = useApp();
  const [step, setStep] = useState<'contacts' | 'group'>('contacts');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const contacts = state.contacts;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.about.toLowerCase().includes(query) ||
        contact.phone.includes(query) ||
        contact.username.toLowerCase().includes(query),
    );
  }, [contacts, search]);

  const reset = () => {
    setStep('contacts');
    setSearch('');
    setSelected([]);
    setGroupName('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const startChat = async (id: string) => {
    const chatId = await startDirectChat(id);
    close();
    if (chatId) openChat(chatId);
  };

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    const id = await createGroup(groupName.trim(), selected);
    reset();
    onClose();
    if (id) openChat(id);
  };

  const invite = () => {
    Alert.alert(
      'Invite a friend',
      'Ask them to join this WhatsApp workspace and search for your name or username to start chatting.',
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={step === 'contacts' ? 'New chat' : 'New group'}
      subtitle={
        step === 'contacts'
          ? 'Start a conversation with someone'
          : 'Choose people and give your group a name'
      }
      maxWidth={480}
      footer={
        step === 'group' ? (
          <Pressable
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || selected.length === 0}
            style={({ pressed }) => [
              styles.createButton,
              {
                backgroundColor:
                  groupName.trim() && selected.length > 0 ? theme.accent : theme.chip,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text
              style={[
                styles.createButtonText,
                {
                  color:
                    groupName.trim() && selected.length > 0
                      ? '#ffffff'
                      : theme.textMuted,
                },
              ]}
            >
              Create group {selected.length > 0 ? `· ${selected.length + 1}` : ''}
            </Text>
          </Pressable>
        ) : undefined
      }
    >
      {step === 'contacts' ? (
        <View>
          <View style={[styles.searchBox, { backgroundColor: theme.search }]}>
            <Search color={theme.textMuted} size={18} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, @username or number"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
          <Text style={[styles.searchHint, { color: theme.textMuted }]}>
            Find anyone by their phone number or @username.
          </Text>

          <Pressable
            onPress={() => setStep('group')}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.68 }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.accent }]}>
              <Users color="#ffffff" size={21} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>New group</Text>
              <Text style={[styles.actionSub, { color: theme.textSecondary }]}>
                Bring a few people together
              </Text>
            </View>
            <ChevronRight color={theme.textMuted} size={18} />
          </Pressable>

          <Pressable
            onPress={invite}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.68 }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#5b6cff' }]}>
              <Link2 color="#ffffff" size={20} />
            </View>
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Invite a friend</Text>
              <Text style={[styles.actionSub, { color: theme.textSecondary }]}>
                Share your invite link
              </Text>
            </View>
            <ChevronRight color={theme.textMuted} size={18} />
          </Pressable>

          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            {search ? 'Search results' : `${filtered.length} contacts`}
          </Text>

          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <UserPlus color={theme.textMuted} size={32} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No contacts found</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Try another name or phone number.
              </Text>
            </View>
          ) : (
            filtered.map((contact) => (
              <Pressable
                key={contact.id}
                onPress={() => startChat(contact.id)}
                style={({ pressed }) => [
                  styles.contactRow,
                  { borderBottomColor: theme.border },
                  pressed && { backgroundColor: theme.panelHover },
                ]}
              >
                <Avatar
                  name={contact.name}
                  uri={contact.avatar}
                  size={44}
                  online={contact.online}
                  showOnline
                />
                <View style={styles.contactText}>
                  <Text style={[styles.contactName, { color: theme.text }]}>{contact.name}</Text>
                  <Text style={[styles.contactSub, { color: theme.textSecondary }]} numberOfLines={1}>
                    {contact.online
                      ? 'online'
                      : search.trim()
                        ? contact.phone
                          ? `${contact.phone} · @${contact.username}`
                          : `@${contact.username}`
                        : contact.about || contact.phone || 'WhatsApp contact'}
                  </Text>
                  {search.trim() ? (
                    <Text style={[styles.contactUser, { color: theme.textMuted }]} numberOfLines={1}>
                      @{contact.username}
                      {contact.phone ? ` · ${contact.phone}` : ''}
                    </Text>
                  ) : null}
                </View>
                <MessageSquarePlus color={theme.textMuted} size={18} />
              </Pressable>
            ))
          )}
        </View>
      ) : (
        <View>
          <Pressable
            onPress={() => setStep('contacts')}
            style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.65 }]}
          >
            <ArrowLeft color={theme.accentDark} size={17} />
            <Text style={[styles.backText, { color: theme.accentDark }]}>Back to contacts</Text>
          </Pressable>

          <View style={[styles.groupNameBox, { backgroundColor: theme.search }]}>
            <Users color={theme.textMuted} size={20} />
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              placeholderTextColor={theme.textMuted}
              style={[styles.groupNameInput, { color: theme.text }]}
              autoFocus
            />
          </View>

          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            Add members · {selected.length} selected
          </Text>

          <ScrollView style={styles.groupList} nestedScrollEnabled>
            {contacts.map((contact) => {
              const active = selected.includes(contact.id);
              return (
                <Pressable
                  key={contact.id}
                  onPress={() => toggleSelected(contact.id)}
                  style={({ pressed }) => [
                    styles.groupRow,
                    { borderBottomColor: theme.border },
                    pressed && { backgroundColor: theme.panelHover },
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
                    <Text style={[styles.contactSub, { color: theme.textSecondary }]} numberOfLines={1}>
                      {contact.about || 'WhatsApp contact'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.checkCircle,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accent : 'transparent',
                      },
                    ]}
                  >
                    {active ? <Check color="#ffffff" size={15} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 10,
    paddingHorizontal: 13,
    height: 42,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchHint: {
    fontSize: 11,
    marginTop: -9,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  contactUser: {
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  actionSub: {
    fontSize: 11.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 18,
    marginBottom: 7,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  contactText: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
  },
  contactSub: {
    fontSize: 12,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 5,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  emptyText: {
    fontSize: 12,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  groupNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 10,
    paddingHorizontal: 13,
    height: 48,
  },
  groupNameInput: {
    flex: 1,
    fontSize: 15,
  },
  groupList: {
    maxHeight: 270,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    height: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
