import { Chat, Message } from './types';

const pad = (value: number) => String(value).padStart(2, '0');

export function formatClock(iso: string) {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatChatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return formatClock(iso);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const diff = now.getTime() - date.getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }

  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatDateLabel(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const diff = now.getTime() - date.getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function formatListDate(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  const diff = now.getTime() - date.getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function getLastMessage(chatId: string, messages: Record<string, Message[]>) {
  const list = messages[chatId];
  if (!list || list.length === 0) return undefined;
  return list[list.length - 1];
}

export function getChatPreview(chat: Chat, messages: Record<string, Message[]>) {
  const last = getLastMessage(chat.id, messages);
  if (!last) return 'No messages yet';

  if (last.kind === 'voice') return `Voice message (${last.duration ?? '0:00'})`;
  if (last.kind === 'image' && !last.text) return 'Photo';
  if (last.kind === 'document') return last.fileName ?? 'Document';
  if (last.kind === 'location') return 'Location';

  const isGroupMessage = chat.group && last.senderId !== 'me';
  return isGroupMessage ? `${last.senderName}: ${last.text}` : last.text;
}

export function initialsFor(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function truncate(text: string, length: number) {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}…`;
}
