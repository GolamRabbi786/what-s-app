export type ThemeMode = 'light' | 'dark';

export type ChatFilter = 'all' | 'unread' | 'favorites' | 'groups';

export type MessageKind = 'text' | 'image' | 'video' | 'voice' | 'document' | 'location' | 'call';

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ReplyTo {
  id: string;
  senderName: string;
  text: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  status: MessageStatus;
  kind: MessageKind;
  image?: string;
  duration?: string;
  fileName?: string;
  fileSize?: string;
  replyTo?: ReplyTo;
  reactions?: string[];
  forwarded?: boolean;
  editedAt?: string;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  group: boolean;
  members?: number;
  online?: boolean;
  lastSeen?: string;
  about?: string;
  phone?: string;
  peerId?: string;
  username?: string;
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  favorite?: boolean;
  lastMessageAt: string;
}

export interface Contact {
  id: string;
  name: string;
  username: string;
  phone: string;
  about: string;
  avatar?: string;
  online: boolean;
  lastSeen?: string;
}

export interface StatusItem {
  id: string;
  type: 'image' | 'video' | 'text';
  image?: string;
  caption?: string;
  background?: string;
  duration: number;
}

export interface StatusGroup {
  id: string;
  name: string;
  avatar?: string;
  time: string;
  viewed: boolean;
  items: StatusItem[];
  viewers?: { name: string; avatar?: string }[];
}

export interface CallLog {
  id: string;
  contactId: string;
  name: string;
  avatar?: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  type: 'voice' | 'video';
  at: string;
  duration?: string;
}

export interface Community {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  members: number;
  unread: number;
  announcement: string;
  groups: { id: string; name: string; members: number; avatar?: string }[];
  accent: string;
}

export interface AppUser {
  name: string;
  about: string;
  phone: string;
  avatar: string;
}

export interface AppState {
  version: number;
  theme: ThemeMode;
  chats: Chat[];
  messages: Record<string, Message[]>;
  statuses: StatusGroup[];
  calls: CallLog[];
  communities: Community[];
  contacts: Contact[];
  typing: TypingPeer[];
  blocked: string[];
  user: AppUser;
}

export type AccountRole = 'user' | 'admin';

export type AccountStatus = 'active' | 'suspended';

export interface Account {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  countryCode: string;
  countryName: string;
  passwordHash: string;
  role: AccountRole;
  status: AccountStatus;
  verified: boolean;
  about: string;
  avatar?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  audience: 'everyone' | 'active' | 'suspended';
  createdAt: string;
  sentBy: string;
}

export interface Country {
  iso: string;
  name: string;
  dial: string;
  flag: string;
}

export interface CallParticipant {
  id: string;
  name: string;
  avatar?: string;
  muted?: boolean;
}

export interface AdminStats {
  totalUsers: number;
  active: number;
  suspended: number;
  verified: number;
  admins: number;
  countries: number;
  chats: number;
  groups: number;
  messages: number;
  calls: number;
  statuses: number;
  communities: number;
  updatedAt: string;
}

export interface AdminChatSummary {
  id: string;
  name: string;
  kind: 'direct' | 'group';
  avatar?: string;
  members: number;
  messages: number;
  createdAt: string;
}

export interface AdminStatusItem {
  id: string;
  type: 'image' | 'video' | 'text';
  caption?: string;
  image?: string;
  createdAt: string;
}

export interface AdminStatusGroup {
  id: string;
  name: string;
  avatar?: string;
  items: AdminStatusItem[];
}

export interface AdminCommunitySummary {
  id: string;
  name: string;
  avatar?: string;
  description: string;
  announcement: string;
  members: number;
  groups: number;
  createdAt: string;
}

export interface AdminCallSummary {
  id: string;
  name: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  type: 'voice' | 'video';
  at: string;
  duration?: string;
  owner: string;
}

export interface AdminContent {
  chats: AdminChatSummary[];
  statusGroups: AdminStatusGroup[];
  communities: AdminCommunitySummary[];
  calls: AdminCallSummary[];
}

export interface TypingPeer {
  userId: string;
  name: string;
  mode: 'typing' | 'recording';
  chatId: string;
}

export interface CallSession {
  id: string;
  chatId: string | null;
  callerId: string;
  calleeId: string;
  callerName: string;
  callerAvatar?: string;
  calleeName: string;
  calleeAvatar?: string;
  type: 'voice' | 'video';
  status: 'calling' | 'ringing' | 'connected' | 'ended' | 'declined' | 'missed';
  createdAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
}

export interface CallBackground {
  id: string;
  label: string;
  kind: 'animated' | 'image';
  colors?: [string, string, string];
  image?: string;
}
