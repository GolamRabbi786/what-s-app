import {
  Archive,
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  CornerUpLeft,
  FileText,
  Image as ImageIcon,
  Info,
  Lock,
  MapPin,
  Mic,
  MoreVertical,
  Paperclip,
  Pause,
  Phone,
  Play,
  Search,
  Send,
  Smile,
  Star,
  Trash2,
  User,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { formatClock, formatDateLabel } from '../lib/format';
import { CallParticipant, Chat, Message, ReplyTo } from '../lib/types';
import { Avatar } from './Avatar';
import { CallOverlay } from './CallOverlay';
import { Sheet } from './Sheet';

interface ChatWindowProps {
  chat: Chat;
  onClose?: () => void;
}

type ListItem =
  | { type: 'date'; id: string; label: string }
  | { type: 'message'; id: string; message: Message };

const EMOJIS = ['😀', '😂', '🥰', '😍', '🤔', '😅', '👍', '🙏', '🔥', '❤️', '🎉', '✨', '😭', '🤯', '🥳', '😴', '☕', '🌅', '🎧', '💯', '👀', '🙌', '💚', '😎'];

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const SENDER_COLORS = ['#e17076', '#7bc862', '#65aadd', '#a695e7', '#ee7aae', '#faa774', '#00a884'];

const PHOTO_ATTACHMENTS = [
  'https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=1000',
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=1000',
  'https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=1000',
];

function senderColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash += name.charCodeAt(i);
  return SENDER_COLORS[hash % SENDER_COLORS.length];
}

function formatSeconds(value: number) {
  return `0:${String(value).padStart(2, '0')}`;
}

export function ChatWindow({ chat, onClose }: ChatWindowProps) {
  const {
    theme,
    state,
    typing,
    sendMessage,
    deleteMessage,
    toggleReaction,
    toggleChatFlag,
    clearChatMessages,
    closeChat,
  } = useApp();
  const { width } = useWindowDimensions();
  const [paneWidth, setPaneWidth] = useState(0);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTo | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const listRef = useRef<FlatList<ListItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const messages = state.messages[chat.id] ?? [];
  const chatIsTyping = typing?.chatId === chat.id;
  const effectiveWidth = paneWidth || width;
  const maxBubble = Math.min(560, effectiveWidth * (effectiveWidth < 620 ? 0.82 : 0.68));
  const imageWidth = Math.max(190, Math.min(310, maxBubble - 18));

  useEffect(() => {
    setDraft('');
    setReplyTo(null);
    setEmojiOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setPlayingId(null);
    setRecording(false);
    setCallType(null);
  }, [chat.id]);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const query = searchQuery.toLowerCase();
    return messages.filter(
      (message) =>
        message.text.toLowerCase().includes(query) ||
        message.senderName.toLowerCase().includes(query),
    );
  }, [messages, searchQuery]);

  const items = useMemo<ListItem[]>(() => {
    let lastDate = '';
    const output: ListItem[] = [];
    filteredMessages.forEach((message) => {
      const dateLabel = formatDateLabel(message.createdAt);
      if (dateLabel !== lastDate) {
        output.push({ type: 'date', id: `date-${dateLabel}-${message.id}`, label: dateLabel });
        lastDate = dateLabel;
      }
      output.push({ type: 'message', id: message.id, message });
    });
    return output;
  }, [filteredMessages]);

  useEffect(() => {
    if (searchQuery) return;
    const timeout = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 140);
    return () => clearTimeout(timeout);
  }, [messages.length, chat.id, chatIsTyping, searchQuery]);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(chat.id, draft, replyTo ? { replyTo } : undefined);
    setDraft('');
    setReplyTo(null);
    setEmojiOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const startReply = (message: Message) => {
    setReplyTo({
      id: message.id,
      senderName: message.senderId === 'me' ? 'You' : message.senderName,
      text:
        message.kind === 'image'
          ? 'Photo'
          : message.kind === 'voice'
            ? 'Voice message'
            : message.kind === 'document'
              ? message.fileName ?? 'Document'
              : message.text,
    });
    setActionMessage(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const copyMessage = (message: Message) => {
    const nav = (globalThis as unknown as { navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } } }).navigator;
    nav?.clipboard?.writeText?.(message.text).catch(() => undefined);
    setActionMessage(null);
  };

  const handleDelete = (message: Message) => {
    Alert.alert('Delete message?', 'This will remove the message from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(chat.id, message.id) },
    ]);
    setActionMessage(null);
  };

  const stopRecording = (discard = false) => {
    const duration = formatSeconds(Math.max(1, recordSeconds));
    setRecording(false);
    setRecordSeconds(0);
    if (!discard) {
      sendMessage(chat.id, '', { kind: 'voice', duration });
    }
  };

  const handleClearChat = () => {
    setMenuOpen(false);
    Alert.alert('Clear chat?', 'Messages will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearChatMessages(chat.id) },
    ]);
  };

  const handleArchive = () => {
    toggleChatFlag(chat.id, 'archived');
    setMenuOpen(false);
    closeChat();
  };

  const attachPhoto = (index: number) => {
    const captions = ['A little preview of tonight 🌇', 'Coffee and a quiet corner ☕', 'The view from the rooftop ✨'];
    sendMessage(chat.id, captions[index], {
      kind: 'image',
      image: PHOTO_ATTACHMENTS[index],
    });
    setAttachOpen(false);
  };

  const renderMessage = (message: Message) => {
    const mine = message.senderId === 'me';
    const showSender = chat.group && !mine;
    const reply = message.replyTo;

    return (
      <View
        style={[
          styles.messageRow,
          mine ? styles.messageRowMine : styles.messageRowTheirs,
        ]}
      >
        <Pressable
          onLongPress={() => setActionMessage(message)}
          delayLongPress={350}
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? theme.bubbleOut : theme.bubble,
              maxWidth: maxBubble,
              borderTopRightRadius: mine ? 5 : 14,
              borderTopLeftRadius: mine ? 14 : 5,
            },
            message.kind === 'image' && styles.mediaBubble,
          ]}
        >
          {showSender ? (
            <Text style={[styles.senderName, { color: senderColor(message.senderName) }]}>
              {message.senderName}
            </Text>
          ) : null}

          {reply ? (
            <View
              style={[
                styles.replyQuote,
                {
                  backgroundColor: mine ? 'rgba(0,0,0,0.08)' : 'rgba(0,168,132,0.12)',
                  borderLeftColor: theme.accent,
                },
              ]}
            >
              <Text style={[styles.replyAuthor, { color: theme.accentDark }]}>{reply.senderName}</Text>
              <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={2}>
                {reply.text}
              </Text>
            </View>
          ) : null}

          {message.kind === 'image' && message.image ? (
            <View style={styles.imageWrap}>
              <View
                style={[
                  styles.imagePlaceholder,
                  { width: imageWidth, height: imageWidth * 0.66, backgroundColor: theme.chip },
                ]}
              >
                <ImageIcon color={theme.textMuted} size={28} />
              </View>
              <View
                style={[
                  styles.imageOverlay,
                  { width: imageWidth, height: imageWidth * 0.66 },
                ]}
              >
                <View style={styles.imageLoadingDot} />
              </View>
              <View style={{ width: imageWidth, height: imageWidth * 0.66 }}>
                <ChatImage uri={message.image} width={imageWidth} height={imageWidth * 0.66} />
              </View>
            </View>
          ) : null}

          {message.kind === 'voice' ? (
            <View style={styles.voiceRow}>
              <Pressable
                onPress={() => setPlayingId((current) => (current === message.id ? null : message.id))}
                style={[styles.voicePlay, { backgroundColor: mine ? '#008069' : theme.accent }]}
              >
                {playingId === message.id ? (
                  <Pause color="#ffffff" size={16} fill="#ffffff" />
                ) : (
                  <Play color="#ffffff" size={16} fill="#ffffff" />
                )}
              </Pressable>
              <View style={styles.waveform}>
                {[8, 15, 22, 12, 18, 26, 10, 20, 14, 24, 9, 17, 23, 13, 19, 8, 16].map(
                  (height, index) => (
                    <View
                      key={`${message.id}-wave-${index}`}
                      style={[
                        styles.waveBar,
                        {
                          height,
                          backgroundColor: playingId === message.id && index < 9 ? theme.accentDark : theme.textMuted,
                          opacity: playingId === message.id && index < 9 ? 1 : 0.55,
                        },
                      ]}
                    />
                  ),
                )}
              </View>
              <Text style={[styles.voiceDuration, { color: theme.textSecondary }]}>
                {message.duration ?? '0:00'}
              </Text>
              <Avatar name={message.senderName} size={26} uri={mine ? state.user.avatar : chat.avatar} />
            </View>
          ) : null}

          {message.kind === 'document' ? (
            <View
              style={[
                styles.documentRow,
                { backgroundColor: mine ? 'rgba(0,0,0,0.06)' : 'rgba(0,168,132,0.08)' },
              ]}
            >
              <View style={[styles.documentIcon, { backgroundColor: theme.accent }]}>
                <FileText color="#ffffff" size={19} />
              </View>
              <View style={styles.documentInfo}>
                <Text style={[styles.documentName, { color: theme.bubbleText }]} numberOfLines={1}>
                  {message.fileName}
                </Text>
                <Text style={[styles.documentMeta, { color: theme.textSecondary }]}>
                  {message.fileSize ?? 'PDF'} · Document
                </Text>
              </View>
            </View>
          ) : null}

          {message.kind === 'location' ? (
            <View style={styles.locationRow}>
              <View style={[styles.locationIcon, { backgroundColor: theme.accentSoft }]}>
                <MapPin color={theme.accentDark} size={20} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={[styles.documentName, { color: theme.bubbleText }]}>Shared location</Text>
                <Text style={[styles.documentMeta, { color: theme.textSecondary }]}>
                  {message.text || 'Live location'}
                </Text>
              </View>
            </View>
          ) : null}

          {message.text && message.kind !== 'document' && message.kind !== 'location' ? (
            <Text
              style={[
                styles.messageText,
                {
                  color: theme.bubbleText,
                  marginTop: message.image ? 6 : 0,
                },
              ]}
            >
              {message.text}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text
              style={[
                styles.messageTime,
                { color: theme.mode === 'dark' ? 'rgba(233,237,239,0.58)' : 'rgba(17,27,33,0.5)' },
              ]}
            >
              {formatClock(message.createdAt)}
            </Text>
            {mine ? (
              <MessageTicks status={message.status} theme={theme} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Message options"
              onPress={() => setActionMessage(message)}
              hitSlop={6}
              style={styles.bubbleMore}
            >
              <ChevronDown
                color={theme.mode === 'dark' ? 'rgba(233,237,239,0.45)' : 'rgba(17,27,33,0.38)'}
                size={12}
              />
            </Pressable>
          </View>

          {message.reactions && message.reactions.length > 0 ? (
            <View
              style={[
                styles.reactionTag,
                { backgroundColor: theme.panel, borderColor: theme.border },
              ]}
            >
              <Text style={styles.reactionText}>{message.reactions.join(' ')}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    );
  };

  const lastImages = messages.filter((message) => message.image).slice(-4);

  const callParticipants: CallParticipant[] = chat.group
    ? state.chats
        .filter((item) => !item.group && item.id !== 'self' && item.id !== chat.id)
        .slice(0, 3)
        .map((item) => ({ id: item.id, name: item.name, avatar: item.avatar }))
    : [];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.chatBg }]}
      onLayout={(event) => setPaneWidth(event.nativeEvent.layout.width)}
    >
      <ChatBackdrop color={theme.mode === 'dark' ? '#2a3942' : '#c8beb2'} />

      <View
        style={[
          styles.header,
          { backgroundColor: theme.header, borderBottomColor: theme.border },
        ]}
      >
        {onClose ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            onPress={onClose}
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.65 }]}
          >
            <ArrowLeft color={theme.icon} size={22} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setInfoOpen(true)}
          style={({ pressed }) => [styles.headerIdentity, pressed && { opacity: 0.72 }]}
        >
          <Avatar
            name={chat.name}
            uri={chat.avatar}
            size={40}
            group={chat.group}
            online={chat.online}
            showOnline
          />
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerName, { color: theme.text }]} numberOfLines={1}>
              {chat.name}
            </Text>
            <Text
              style={[
                styles.headerStatus,
                { color: chatIsTyping ? theme.accent : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {chatIsTyping
                ? `${typing?.label} is typing…`
                : chat.group
                  ? `${chat.members ?? 0} members`
                  : chat.online
                    ? 'online'
                    : chat.lastSeen ?? ''}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Video call"
            onPress={() => setCallType('video')}
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.65 }]}
          >
            <Video color={theme.icon} size={20} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voice call"
            onPress={() => setCallType('voice')}
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.65 }]}
          >
            <Phone color={theme.icon} size={19} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search in conversation"
            onPress={() => {
              setSearchOpen((value) => !value);
              setSearchQuery('');
            }}
            style={({ pressed }) => [
              styles.headerIcon,
              searchOpen && { backgroundColor: theme.chip },
              pressed && { opacity: 0.65 },
            ]}
          >
            <Search color={searchOpen ? theme.accentDark : theme.icon} size={19} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chat menu"
            onPress={() => setMenuOpen(true)}
            style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.65 }]}
          >
            <MoreVertical color={theme.icon} size={20} />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.panel, borderBottomColor: theme.border },
          ]}
        >
          <Search color={theme.textMuted} size={17} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search messages"
            placeholderTextColor={theme.textMuted}
            autoFocus
            style={[styles.searchInput, { color: theme.text }]}
          />
          <Text style={[styles.searchCount, { color: theme.textSecondary }]}>
            {searchQuery ? `${filteredMessages.length} found` : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close search"
            onPress={() => {
              setSearchOpen(false);
              setSearchQuery('');
            }}
            style={styles.searchClose}
          >
            <X color={theme.textMuted} size={17} />
          </Pressable>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.type === 'date' ? (
            <View style={styles.dateWrap}>
              <View style={[styles.datePill, { backgroundColor: theme.panel, shadowColor: theme.shadow }]}>
                <Text style={[styles.dateText, { color: theme.textSecondary }]}>{item.label}</Text>
              </View>
            </View>
          ) : (
            renderMessage(item.message)
          )
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.panel }]}>
              {searchQuery ? (
                <Search color={theme.textMuted} size={28} />
              ) : (
                <ChatBubbleIcon color={theme.textMuted} />
              )}
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery ? 'No messages found' : 'No messages yet'}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'Try a different word or name.'
                : 'Send a message to start the conversation.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          chatIsTyping ? (
            <View style={[styles.typingBubble, { backgroundColor: theme.bubble }]}>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, { backgroundColor: theme.textMuted }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.textMuted, opacity: 0.65 }]} />
                <View style={[styles.typingDot, { backgroundColor: theme.textMuted, opacity: 0.35 }]} />
              </View>
              <Text style={[styles.typingText, { color: theme.textSecondary }]}>
                {typing?.label} is typing
              </Text>
            </View>
          ) : null
        }
        onContentSizeChange={() => {
          if (!searchQuery) listRef.current?.scrollToEnd({ animated: false });
        }}
      />

      {emojiOpen ? (
        <View
          style={[
            styles.emojiPanel,
            { backgroundColor: theme.panel, borderTopColor: theme.border },
          ]}
        >
          <View style={styles.emojiGrid}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setDraft((value) => `${value}${emoji}`)}
                style={({ pressed }) => [styles.emojiButton, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View
        style={[
          styles.composerWrap,
          { backgroundColor: theme.header, borderTopColor: theme.border },
        ]}
      >
        {replyTo ? (
          <View
            style={[
              styles.composerReply,
              { backgroundColor: theme.panel, borderLeftColor: theme.accent },
            ]}
          >
            <View style={styles.composerReplyText}>
              <Text style={[styles.composerReplyAuthor, { color: theme.accentDark }]}>
                {replyTo.senderName}
              </Text>
              <Text style={[styles.composerReplyBody, { color: theme.textSecondary }]} numberOfLines={1}>
                {replyTo.text}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
              onPress={() => setReplyTo(null)}
              style={styles.replyCancel}
            >
              <X color={theme.textMuted} size={16} />
            </Pressable>
          </View>
        ) : null}

        {recording ? (
          <View style={[styles.recordingBar, { backgroundColor: theme.panel }]}>
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingText, { color: theme.text }]}>
              Recording {formatSeconds(recordSeconds)}
            </Text>
            <Pressable onPress={() => stopRecording(true)} style={styles.recordingCancel}>
              <X color={theme.textSecondary} size={17} />
            </Pressable>
            <Pressable
              onPress={() => stopRecording(false)}
              style={[styles.recordingSend, { backgroundColor: theme.accent }]}
            >
              <Send color="#ffffff" size={17} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.composerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Emoji"
              onPress={() => {
                setEmojiOpen((value) => !value);
                setAttachOpen(false);
              }}
              style={({ pressed }) => [styles.composerIcon, pressed && { opacity: 0.62 }]}
            >
              <Smile color={emojiOpen ? theme.accentDark : theme.icon} size={23} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach"
              onPress={() => {
                setAttachOpen(true);
                setEmojiOpen(false);
              }}
              style={({ pressed }) => [styles.composerIcon, pressed && { opacity: 0.62 }]}
            >
              <Paperclip color={theme.icon} size={23} />
            </Pressable>
            <View style={[styles.inputWrap, { backgroundColor: theme.panel }]}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message"
                placeholderTextColor={theme.textMuted}
                multiline
                style={[styles.input, { color: theme.text }]}
                onKeyPress={(event) => {
                  const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
                    key?: string;
                    shiftKey?: boolean;
                  };
                  if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                    (event as unknown as { preventDefault?: () => void }).preventDefault?.();
                    handleSend();
                  }
                }}
              />
            </View>
            {draft.trim() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                onPress={handleSend}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.78 },
                ]}
              >
                <Send color="#ffffff" size={19} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Record voice message"
                onPress={() => {
                  setRecording(true);
                  setRecordSeconds(0);
                }}
                style={({ pressed }) => [
                  styles.sendButton,
                  { backgroundColor: theme.panel },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <Mic color={theme.icon} size={21} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Sheet visible={attachOpen} onClose={() => setAttachOpen(false)} title="Attach" subtitle="Share something with this chat" maxWidth={430}>
        <View style={styles.attachGrid}>
          <AttachOption
            icon={ImageIcon}
            label="Photos"
            color="#5b6cff"
            onPress={() => attachPhoto(0)}
            textColor={theme.text}
            secondary={theme.textSecondary}
          />
          <AttachOption
            icon={Camera}
            label="Camera"
            color="#e17076"
            onPress={() => attachPhoto(1)}
            textColor={theme.text}
            secondary={theme.textSecondary}
          />
          <AttachOption
            icon={FileText}
            label="Document"
            color="#00a884"
            onPress={() => {
              sendMessage(chat.id, '', {
                kind: 'document',
                fileName: 'project-brief.pdf',
                fileSize: '2.4 MB',
              });
              setAttachOpen(false);
            }}
            textColor={theme.text}
            secondary={theme.textSecondary}
          />
          <AttachOption
            icon={MapPin}
            label="Location"
            color="#f2994a"
            onPress={() => {
              sendMessage(chat.id, 'Indiranagar, Bengaluru', { kind: 'location' });
              setAttachOpen(false);
            }}
            textColor={theme.text}
            secondary={theme.textSecondary}
          />
          <AttachOption
            icon={User}
            label="Contact"
            color="#9b51e0"
            onPress={() => {
              sendMessage(chat.id, 'Maya Kapoor · +91 98765 43210', { kind: 'text' });
              setAttachOpen(false);
            }}
            textColor={theme.text}
            secondary={theme.textSecondary}
          />
          <AttachOption
            icon={Star}
            label="Sticker"
            color="#f0a30a"
            onPress={() => {
              sendMessage(chat.id, '✨', { kind: 'text' });
              setAttachOpen(false);
            }}
            textColor={theme.text}
            secondary={theme.textSecondary}
          />
        </View>
      </Sheet>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={chat.name} subtitle="Chat options" maxWidth={400}>
        <View style={styles.menuList}>
          <MenuRow
            icon={Info}
            label="Chat info"
            color={theme.text}
            iconColor={theme.icon}
            onPress={() => {
              setMenuOpen(false);
              setInfoOpen(true);
            }}
          />
          <MenuRow
            icon={BellOff}
            label={chat.muted ? 'Unmute notifications' : 'Mute notifications'}
            color={theme.text}
            iconColor={theme.icon}
            onPress={() => {
              toggleChatFlag(chat.id, 'muted');
              setMenuOpen(false);
            }}
          />
          <MenuRow
            icon={Star}
            label={chat.favorite ? 'Remove from favourites' : 'Add to favourites'}
            color={theme.text}
            iconColor={theme.icon}
            onPress={() => {
              toggleChatFlag(chat.id, 'favorite');
              setMenuOpen(false);
            }}
          />
          <MenuRow
            icon={Archive}
            label={chat.archived ? 'Unarchive chat' : 'Archive chat'}
            color={theme.text}
            iconColor={theme.icon}
            onPress={handleArchive}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <MenuRow
            icon={Trash2}
            label="Clear chat"
            color={theme.danger}
            iconColor={theme.danger}
            onPress={handleClearChat}
          />
        </View>
      </Sheet>

      <Sheet
        visible={!!actionMessage}
        onClose={() => setActionMessage(null)}
        title="Message options"
        subtitle={actionMessage ? `${actionMessage.senderName} · ${formatClock(actionMessage.createdAt)}` : undefined}
        maxWidth={420}
      >
        {actionMessage ? (
          <View>
            <View style={styles.reactionPicker}>
              {REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    toggleReaction(chat.id, actionMessage.id, emoji);
                    setActionMessage(null);
                  }}
                  style={({ pressed }) => [
                    styles.reactionButton,
                    { backgroundColor: theme.chip },
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.menuList}>
              <MenuRow
                icon={CornerUpLeft}
                label="Reply"
                color={theme.text}
                iconColor={theme.icon}
                onPress={() => startReply(actionMessage)}
              />
              <MenuRow
                icon={Copy}
                label="Copy text"
                color={theme.text}
                iconColor={theme.icon}
                onPress={() => copyMessage(actionMessage)}
              />
              <MenuRow
                icon={Trash2}
                label="Delete message"
                color={theme.danger}
                iconColor={theme.danger}
                onPress={() => handleDelete(actionMessage)}
              />
            </View>
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={infoOpen} onClose={() => setInfoOpen(false)} title="Chat info" maxWidth={480}>
        <View style={styles.infoHero}>
          <Avatar name={chat.name} uri={chat.avatar} size={92} group={chat.group} online={chat.online} showOnline />
          <Text style={[styles.infoName, { color: theme.text }]}>{chat.name}</Text>
          <Text style={[styles.infoSub, { color: theme.textSecondary }]}>
            {chat.group ? `Group · ${chat.members ?? 0} members` : chat.phone ?? 'WhatsApp contact'}
          </Text>
          {!chat.group && chat.about ? (
            <Text style={[styles.infoAbout, { color: theme.textSecondary }]}>{chat.about}</Text>
          ) : null}
        </View>

        <View style={styles.infoActions}>
          <Pressable
            onPress={() => toggleChatFlag(chat.id, 'muted')}
            style={[styles.infoAction, { backgroundColor: theme.chip }]}
          >
            {chat.muted ? <BellOff color={theme.accentDark} size={20} /> : <Bell color={theme.icon} size={20} />}
            <Text style={[styles.infoActionLabel, { color: theme.textSecondary }]}>
              {chat.muted ? 'Muted' : 'Mute'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => toggleChatFlag(chat.id, 'favorite')}
            style={[styles.infoAction, { backgroundColor: theme.chip }]}
          >
            <Star
              color={chat.favorite ? theme.accentDark : theme.icon}
              size={20}
              fill={chat.favorite ? theme.accentDark : 'transparent'}
            />
            <Text style={[styles.infoActionLabel, { color: theme.textSecondary }]}>
              {chat.favorite ? 'Starred' : 'Star'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setInfoOpen(false);
              setMenuOpen(true);
            }}
            style={[styles.infoAction, { backgroundColor: theme.chip }]}
          >
            <MoreVertical color={theme.icon} size={20} />
            <Text style={[styles.infoActionLabel, { color: theme.textSecondary }]}>More</Text>
          </Pressable>
        </View>

        {lastImages.length > 0 ? (
          <View style={styles.mediaSection}>
            <View style={styles.mediaHeader}>
              <Text style={[styles.mediaTitle, { color: theme.text }]}>Media, links and docs</Text>
              <Text style={[styles.mediaCount, { color: theme.textSecondary }]}>
                {lastImages.length}
              </Text>
            </View>
            <View style={styles.mediaGrid}>
              {lastImages.map((message) => (
                <View key={message.id} style={styles.mediaThumbWrap}>
                  <ChatImage uri={message.image ?? ''} width={96} height={96} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.infoRow, { borderTopColor: theme.border }]}>
          <Lock color={theme.textMuted} size={18} />
          <View style={styles.infoRowText}>
            <Text style={[styles.infoRowTitle, { color: theme.text }]}>Encryption</Text>
            <Text style={[styles.infoRowSub, { color: theme.textSecondary }]}>
              Messages and calls are end-to-end encrypted. No one outside of this chat can read or listen to them.
            </Text>
          </View>
        </View>
        {chat.group ? (
          <View style={[styles.infoRow, { borderTopColor: theme.border }]}>
            <Users color={theme.textMuted} size={18} />
            <View style={styles.infoRowText}>
              <Text style={[styles.infoRowTitle, { color: theme.text }]}>
                {chat.members} members
              </Text>
              <Text style={[styles.infoRowSub, { color: theme.textSecondary }]}>
                You, Maya, Rohan, Priya, Arjun and 7 others
              </Text>
            </View>
          </View>
        ) : null}
      </Sheet>

      {callType ? (
        <CallOverlay
          visible={Boolean(callType)}
          contactId={chat.id}
          name={chat.name}
          avatar={chat.avatar}
          type={callType}
          participants={callParticipants}
          onClose={() => setCallType(null)}
        />
      ) : null}
    </View>
  );
}

function MessageTicks({ status, theme }: { status: Message['status']; theme: ReturnType<typeof useApp>['theme'] }) {
  if (status === 'sent') {
    return <Check color={theme.textMuted} size={14} strokeWidth={2.2} />;
  }
  return (
    <CheckCheck
      color={status === 'read' ? '#53bdeb' : theme.textMuted}
      size={15}
      strokeWidth={2.2}
    />
  );
}

function ChatImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={[styles.imageFallback, { width, height }]}>
        <ImageIcon color="#8696a0" size={26} />
      </View>
    );
  }
  return (
    <View style={{ width, height, borderRadius: 9, overflow: 'hidden', backgroundColor: '#dfe5e7' }}>
      <ChatImageInner uri={uri} width={width} height={height} onFail={() => setFailed(true)} />
    </View>
  );
}

function ChatImageInner({
  uri,
  width,
  height,
  onFail,
}: {
  uri: string;
  width: number;
  height: number;
  onFail: () => void;
}) {
  return (
    <Image
      source={{ uri }}
      style={{ width, height }}
      resizeMode="cover"
      onError={onFail}
    />
  );
}

function ChatBubbleIcon({ color }: { color: string }) {
  return (
    <View style={{ width: 34, height: 30 }}>
      <View
        style={{
          width: 32,
          height: 24,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 6,
          bottom: 1,
          width: 7,
          height: 7,
          borderLeftWidth: 2,
          borderBottomWidth: 2,
          borderColor: color,
          transform: [{ rotate: '-35deg' }],
        }}
      />
    </View>
  );
}

function ChatBackdrop({ color }: { color: string }) {
  const doodles = [
    { top: '6%', left: '7%', rotate: '-12deg', size: 34 },
    { top: '13%', left: '72%', rotate: '18deg', size: 26 },
    { top: '24%', left: '38%', rotate: '8deg', size: 30 },
    { top: '31%', left: '88%', rotate: '-9deg', size: 24 },
    { top: '41%', left: '14%', rotate: '14deg', size: 28 },
    { top: '49%', left: '58%', rotate: '-15deg', size: 34 },
    { top: '58%', left: '28%', rotate: '6deg', size: 22 },
    { top: '68%', left: '78%', rotate: '-7deg', size: 30 },
    { top: '76%', left: '9%', rotate: '17deg', size: 25 },
    { top: '85%', left: '48%', rotate: '-12deg', size: 32 },
    { top: '18%', left: '52%', rotate: '-4deg', size: 22 },
    { top: '61%', left: '92%', rotate: '10deg', size: 22 },
    { top: '89%', left: '70%', rotate: '14deg', size: 24 },
  ] as const;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {doodles.map((doodle, index) => (
        <View
          key={`doodle-${index}`}
          style={{
            position: 'absolute',
            top: doodle.top,
            left: doodle.left,
            transform: [{ rotate: doodle.rotate }],
            opacity: 0.22,
          }}
        >
          <MessageDoodle color={color} size={doodle.size} />
        </View>
      ))}
    </View>
  );
}

function MessageDoodle({ color, size }: { color: string; size: number }) {
  return (
    <View style={{ width: size, height: size * 0.8, opacity: 0.55 }}>
      <View
        style={{
          width: size,
          height: size * 0.64,
          borderRadius: size * 0.22,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: size * 0.16,
          bottom: 0,
          width: size * 0.2,
          height: size * 0.2,
          borderLeftWidth: 1.5,
          borderBottomWidth: 1.5,
          borderColor: color,
          transform: [{ rotate: '-38deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.2,
          left: size * 0.18,
          width: size * 0.42,
          height: 1.5,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.34,
          left: size * 0.18,
          width: size * 0.3,
          height: 1.5,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

function AttachOption({
  icon: Icon,
  label,
  color,
  onPress,
  textColor,
  secondary,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  color: string;
  onPress: () => void;
  textColor: string;
  secondary: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.attachOption, pressed && { opacity: 0.68 }]}
    >
      <View style={[styles.attachIcon, { backgroundColor: color }]}>
        <Icon color="#ffffff" size={22} />
      </View>
      <Text style={[styles.attachLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.attachSub, { color: secondary }]}>Share</Text>
    </Pressable>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onPress,
  color,
  iconColor,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
  color: string;
  iconColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.62 }]}
    >
      <Icon color={iconColor} size={19} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 5,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 4,
    minWidth: 0,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchCount: {
    fontSize: 11,
  },
  searchClose: {
    padding: 4,
  },
  listContent: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  dateWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
    elevation: 1,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 1,
    elevation: 1,
    minWidth: 76,
  },
  mediaBubble: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 5,
  },
  senderName: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 3,
    paddingHorizontal: 2,
  },
  messageText: {
    fontSize: 14.4,
    lineHeight: 20,
    paddingHorizontal: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 2,
    paddingHorizontal: 2,
    minHeight: 15,
  },
  messageTime: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  bubbleMore: {
    marginLeft: 1,
    paddingVertical: 1,
    paddingHorizontal: 1,
  },
  replyQuote: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 5,
    marginHorizontal: 1,
  },
  replyAuthor: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 1,
  },
  replyText: {
    fontSize: 12,
  },
  imageWrap: {
    borderRadius: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  imageLoadingDot: {
    flex: 1,
  },
  imageFallback: {
    backgroundColor: '#dfe5e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 218,
  },
  voicePlay: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    flex: 1,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    marginVertical: 2,
    marginHorizontal: 2,
    minWidth: 210,
  },
  documentIcon: {
    width: 37,
    height: 37,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  documentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 7,
    marginHorizontal: 2,
  },
  locationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationInfo: {
    flex: 1,
  },
  reactionTag: {
    position: 'absolute',
    bottom: -10,
    right: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionText: {
    fontSize: 12,
  },
  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 3,
    marginBottom: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  typingText: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },
  dateWrapEmpty: {},
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 300,
    lineHeight: 19,
  },
  emojiPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  emojiButton: {
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 23,
  },
  composerWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  composerIcon: {
    width: 33,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 6,
    minHeight: 42,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14.3,
    lineHeight: 20,
    maxHeight: 108,
    minHeight: 25,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerReply: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  composerReplyText: {
    flex: 1,
  },
  composerReplyAuthor: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  composerReplyBody: {
    fontSize: 11.5,
    marginTop: 1,
  },
  replyCancel: {
    padding: 4,
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 12,
    gap: 10,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ea4335',
  },
  recordingText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  recordingCancel: {
    padding: 5,
  },
  recordingSend: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
  },
  attachOption: {
    width: '33.33%',
    alignItems: 'center',
    gap: 3,
  },
  attachIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  attachLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  attachSub: {
    fontSize: 10,
  },
  menuList: {
    gap: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  menuLabel: {
    fontSize: 14.5,
    fontWeight: '500',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
  },
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  reactionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  infoHero: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingBottom: 20,
  },
  infoName: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  infoSub: {
    fontSize: 12.5,
    marginTop: 3,
  },
  infoAbout: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 19,
  },
  infoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 20,
  },
  infoAction: {
    width: 82,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 5,
  },
  infoActionLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  mediaSection: {
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(134,150,160,0.25)',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mediaTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  mediaCount: {
    fontSize: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  mediaThumbWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoRowText: {
    flex: 1,
    gap: 3,
  },
  infoRowTitle: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  infoRowSub: {
    fontSize: 12,
    lineHeight: 17,
  },
});
