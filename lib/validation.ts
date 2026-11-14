import { z } from 'zod';

export const broadcastSchema = z.object({
  title: z.string().trim().min(1, 'Add a title.').max(140),
  message: z.string().trim().min(1, 'Add a message.').max(2000),
  audience: z.enum(['everyone', 'active', 'suspended']),
});

export const adminUpdateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update'),
    id: z.string().min(1),
    updates: z.object({
      name: z.string().trim().min(2).max(120).optional(),
      username: z.string().trim().regex(/^[a-zA-Z0-9._]{3,24}$/).optional(),
      phone: z.string().trim().max(20).optional(),
      about: z.string().trim().max(500).optional(),
      role: z.enum(['user', 'admin']).optional(),
    }),
  }),
  z.object({ action: z.literal('verify'), id: z.string().min(1) }),
  z.object({ action: z.literal('status'), id: z.string().min(1) }),
  z.object({ action: z.literal('resetPassword'), id: z.string().min(1) }),
]);

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: z.string().trim().regex(/^[a-zA-Z0-9._]{3,24}$/),
  email: z.email(),
  password: z.string().min(6).max(128),
  phone: z.string().trim().min(6).max(20),
  countryCode: z.string().trim().max(8),
  countryName: z.string().trim().max(120),
});

export const createChatSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('direct'),
    userId: z.string().min(1),
  }),
  z.object({
    kind: z.literal('group'),
    name: z.string().trim().min(1, 'Give the group a name.').max(120),
    memberIds: z.array(z.string().min(1)).min(1, 'Add at least one member.').max(200),
    avatar: z.string().max(2000).optional(),
  }),
]);

export const chatUpdateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('read'), id: z.string().min(1) }),
  z.object({
    action: z.literal('flag'),
    id: z.string().min(1),
    flag: z.enum(['pinned', 'muted', 'archived', 'favorite']),
    value: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('rename'),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    avatar: z.string().max(2000).optional(),
  }),
]);

export const sendMessageSchema = z
  .object({
    chatId: z.string().min(1),
    text: z.string().max(8000).optional().default(''),
    kind: z.enum(['text', 'image', 'voice', 'document', 'location']).optional().default('text'),
    image: z.string().max(3_000_000).optional(),
    duration: z.string().max(20).optional(),
    fileName: z.string().max(200).optional(),
    fileSize: z.string().max(40).optional(),
    replyToId: z.string().max(120).optional(),
  })
  .refine(
    (value) =>
      value.text.trim().length > 0 ||
      Boolean(value.image) ||
      Boolean(value.fileName) ||
      Boolean(value.duration),
    { message: 'Write a message first.' },
  );

export const messageDeleteSchema = z.union([
  z.object({ id: z.string().min(1) }),
  z.object({ chatId: z.string().min(1), all: z.literal(true) }),
]);

export const reactionSchema = z.object({
  id: z.string().min(1),
  emoji: z.string().min(1).max(16),
});

export const statusCreateSchema = z.object({
  caption: z.string().max(700).default(''),
  background: z.string().max(40).default('#1a6b5c'),
  image: z.string().max(3_000_000).optional(),
});

export const statusActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('view'), groupId: z.string().min(1).max(120) }),
  z.object({ action: z.literal('delete'), groupId: z.string().min(1).max(120) }),
]);

export const communityCreateSchema = z.object({
  name: z.string().trim().min(2, 'Give the community a name.').max(120),
  description: z.string().trim().max(500).default(''),
});

export const communityUpdateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('announcement'),
    id: z.string().min(1),
    announcement: z.string().trim().max(2000),
  }),
  z.object({
    action: z.literal('rename'),
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
  }),
]);

export const callCreateSchema = z.object({
  peerId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(200),
  avatar: z.string().max(2000).optional(),
  direction: z.enum(['incoming', 'outgoing', 'missed']),
  type: z.enum(['voice', 'video']),
  duration: z.string().max(20).optional(),
});

export const pushTokenSchema = z.object({
  token: z.string().min(8).max(400),
  platform: z.enum(['android', 'ios', 'web']).default('android'),
});

export const adminContentActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('clear_chat_messages'), id: z.string().min(1) }),
  z.object({ action: z.literal('delete_chat'), id: z.string().min(1) }),
  z.object({ action: z.literal('delete_status_user'), id: z.string().min(1) }),
  z.object({ action: z.literal('delete_community'), id: z.string().min(1) }),
  z.object({ action: z.literal('clear_calls') }),
  z.object({
    action: z.literal('set_announcement'),
    id: z.string().min(1),
    value: z.string().trim().max(2000),
  }),
]);

export const callSignalSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    peerId: z.string().min(1),
    chatId: z.string().min(1).optional(),
    type: z.enum(['voice', 'video']),
  }),
  z.object({ action: z.literal('accept'), id: z.string().min(1) }),
  z.object({ action: z.literal('decline'), id: z.string().min(1) }),
  z.object({ action: z.literal('end'), id: z.string().min(1) }),
]);

export const typingSchema = z.object({
  chatId: z.string().min(1),
  mode: z.enum(['typing', 'recording', 'idle']),
});
