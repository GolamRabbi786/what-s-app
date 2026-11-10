export type ThemeMode = 'light' | 'dark';

export type ChatFilter = 'all' | 'unread' | 'favorites' | 'groups';

export type MessageKind = 'text' | 'image' | 'voice' | 'document' | 'location';

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
  unread: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  favorite?: boolean;
  lastMessageAt: string;
}

export interface StatusItem {
  id: string;
  type: 'image' | 'text';
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
  user: AppUser;
}
