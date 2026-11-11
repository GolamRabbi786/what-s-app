import { z } from 'zod';

const chatSchema = z
  .object({
    id: z.string().min(1).max(120),
    name: z.string().max(200),
    group: z.boolean(),
    unread: z.number().int().min(0),
    lastMessageAt: z.string(),
  })
  .passthrough();

const messageSchema = z
  .object({
    id: z.string().min(1).max(120),
    chatId: z.string().min(1).max(120),
    senderId: z.string().max(120),
    text: z.string().max(8000),
    createdAt: z.string(),
    kind: z.string().max(20),
    status: z.string().max(20),
  })
  .passthrough();

const statusGroupSchema = z
  .object({
    id: z.string().min(1).max(120),
    name: z.string().max(200),
    items: z.array(z.unknown()).max(50),
  })
  .passthrough();

const callSchema = z
  .object({
    id: z.string().min(1).max(120),
    name: z.string().max(200),
    direction: z.string().max(20),
    type: z.string().max(20),
    at: z.string(),
  })
  .passthrough();

const communitySchema = z
  .object({
    id: z.string().min(1).max(120),
    name: z.string().max(200),
    groups: z.array(z.unknown()).max(200),
  })
  .passthrough();

export const appStateSchema = z.object({
  version: z.number().int(),
  theme: z.enum(['light', 'dark']),
  chats: z.array(chatSchema).max(500),
  messages: z.record(z.string().max(120), z.array(messageSchema).max(5000)),
  statuses: z.array(statusGroupSchema).max(200),
  calls: z.array(callSchema).max(500),
  communities: z.array(communitySchema).max(200),
  user: z
    .object({
      name: z.string().max(120),
      about: z.string().max(500),
      phone: z.string().max(40),
      avatar: z.string().max(2000),
    })
    .passthrough(),
});

export const statePayloadSchema = z.object({
  state: appStateSchema,
});

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
