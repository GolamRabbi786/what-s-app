import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authClient, type SessionProfile } from '../lib/auth-client';
import { apiRequest } from '../lib/client';
import { Account, AccountStatus, Broadcast, Country } from '../lib/types';

export const ADMIN_USERNAME = 'GolamRabbi786';

export interface AuthResult {
  ok: boolean;
  error?: string;
  role?: 'user' | 'admin';
}

export interface SignUpInput {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  country: Country;
}

interface AuthContextValue {
  hydrated: boolean;
  currentUser: Account | null;
  accounts: Account[];
  broadcasts: Broadcast[];
  isAdmin: boolean;
  signIn: (identifier: string, password: string) => Promise<AuthResult>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Account>) => void;
  resetPassword: (identifier: string, newPassword: string) => AuthResult;
  adminUpdateUser: (id: string, updates: Partial<Account>) => Promise<AuthResult>;
  adminDeleteUser: (id: string) => Promise<AuthResult>;
  adminResetPassword: (id: string) => Promise<AuthResult>;
  sendBroadcast: (input: {
    title: string;
    message: string;
    audience: Broadcast['audience'];
  }) => Promise<AuthResult>;
  deleteBroadcast: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  toggleUserVerified: (id: string) => Promise<void>;
  changeAdminPassword: (current: string, next: string) => Promise<AuthResult>;
  adminPassword: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const digits = (value: string) => value.replace(/\D/g, '');

function toAccount(user: SessionProfile): Account {
  return {
    id: user.id,
    name: user.name,
    username: user.username ?? user.email.split('@')[0],
    email: user.email,
    phone: user.phone ?? '',
    countryCode: user.countryCode ?? '',
    countryName: user.countryName ?? '',
    passwordHash: '',
    role: user.role === 'admin' ? 'admin' : 'user',
    status: (user.status === 'suspended' ? 'suspended' : 'active') as AccountStatus,
    verified: Boolean(user.verified ?? user.emailVerified),
    about: user.about ?? 'Hey there! I am using WhatsApp.',
    avatar: user.image ?? undefined,
    createdAt: new Date(user.createdAt).toISOString(),
    lastActiveAt: new Date(user.lastActiveAt ?? user.createdAt).toISOString(),
  };
}

function friendlyAuthError(message: string, byEmail: boolean) {
  const value = message.toLowerCase();

  if (value.includes('already exists') || value.includes('already taken')) {
    return 'An account with those details already exists.';
  }
  if (value.includes('invalid username or password') || value.includes('invalid email or password')) {
    return 'Incorrect details. Please check and try again.';
  }
  if (value.includes('user not found')) {
    return 'No account found with those details.';
  }
  if (value.includes('password')) {
    return byEmail ? message : 'Incorrect details. Please check and try again.';
  }
  if (value.includes('username')) {
    return 'Username must be 3–24 characters (letters, numbers, dots or underscores).';
  }

  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  const currentUser = useMemo<Account | null>(() => {
    if (!session?.user) return null;
    return toAccount(session.user as SessionProfile);
  }, [session?.user]);

  const isAdmin = currentUser?.role === 'admin';
  const hydrated = !isPending;

  const refreshAccounts = useCallback(async () => {
    try {
      const result = await apiRequest<{ accounts: Account[] }>('/api/admin/users');
      setAccounts(result.accounts);
    } catch {
      setAccounts((previous) => previous);
    }
  }, []);

  const refreshBroadcasts = useCallback(async () => {
    try {
      const result = await apiRequest<{ broadcasts: Broadcast[] }>('/api/broadcasts');
      setBroadcasts(result.broadcasts);
    } catch {
      setBroadcasts((previous) => previous);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setAccounts([]);
      setBroadcasts([]);
      return;
    }

    void refreshBroadcasts();
  }, [session?.user?.id, refreshBroadcasts, session?.user]);

  useEffect(() => {
    if (!session?.user || !isAdmin) {
      setAccounts([]);
      return;
    }

    void refreshAccounts();
  }, [session?.user?.id, isAdmin, refreshAccounts, session?.user]);

  const signIn = useCallback(
    async (identifier: string, password: string): Promise<AuthResult> => {
      const value = identifier.trim();
      if (!value || !password) {
        return { ok: false, error: 'Enter your account and password to continue.' };
      }

      const byEmail = value.includes('@');
      const result = byEmail
        ? await authClient.signIn.email({ email: value, password })
        : await authClient.signIn.username({ username: value, password });

      if (result.error) {
        return {
          ok: false,
          error: friendlyAuthError(result.error.message ?? 'Unable to sign in.', byEmail),
        };
      }

      const user = result.data?.user as SessionProfile | undefined;
      if (!user) {
        return { ok: false, error: 'Unable to sign in. Please try again.' };
      }

      const account = toAccount(user);
      if (account.status === 'suspended') {
        await authClient.signOut();
        return {
          ok: false,
          error: 'This account is suspended. Please contact the platform administrator.',
        };
      }

      await refetch();
      return { ok: true, role: account.role };
    },
    [refetch],
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<AuthResult> => {
      const name = input.name.trim();
      const username = input.username.trim();
      const email = input.email.trim();
      const phoneDigits = digits(input.phone);
      const countryCode = `+${digits(input.country.dial)}`;

      if (name.length < 2) return { ok: false, error: 'Please enter your full name.' };
      if (!/^[a-zA-Z0-9._]{3,24}$/.test(username)) {
        return {
          ok: false,
          error: 'Username must be 3–24 characters (letters, numbers, dots or underscores).',
        };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, error: 'Please enter a valid email address.' };
      }
      if (phoneDigits.length < 6) return { ok: false, error: 'Please enter a valid phone number.' };
      if (input.password.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }
      if (username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
        return { ok: false, error: 'That username is reserved.' };
      }

      const result = await authClient.signUp.email({
        name,
        email,
        password: input.password,
        username,
        displayUsername: username,
        phone: phoneDigits,
        phoneFull: `${countryCode}${phoneDigits}`,
        countryCode,
        countryName: input.country.name,
        about: 'Hey there! I am using WhatsApp.',
      });

      if (result.error) {
        const message = result.error.message ?? 'Unable to create the account.';
        const lower = message.toLowerCase();
        if (lower.includes('user already exists') || lower.includes('email')) {
          return { ok: false, error: 'An account with that email already exists.' };
        }
        if (lower.includes('username')) {
          return { ok: false, error: 'That username is already taken.' };
        }
        return { ok: false, error: message };
      }

      await refetch();
      return { ok: true, role: 'user' };
    },
    [refetch],
  );

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setAccounts([]);
    setBroadcasts([]);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Account>) => {
      const payload: Record<string, unknown> = {};
      if (updates.name) payload.name = updates.name;
      if (updates.avatar !== undefined) payload.image = updates.avatar;
      if (updates.about !== undefined) payload.about = updates.about;

      if (Object.keys(payload).length === 0) return;

      void authClient
        .updateUser(payload as never)
        .then(() => refetch())
        .catch(() => undefined);
    },
    [refetch],
  );

  const resetPassword = useCallback((identifier: string, newPassword: string): AuthResult => {
    if (!identifier.trim()) return { ok: false, error: 'Enter your username or email.' };
    if (newPassword.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }
    return {
      ok: false,
      error:
        'Self-service password reset needs email delivery. Ask the platform administrator to reset it for you from the Admin Center.',
    };
  }, []);

  const adminUpdateUser = useCallback(
    async (id: string, updates: Partial<Account>): Promise<AuthResult> => {
      try {
        const result = await apiRequest<{ account: Account | null }>('/api/admin/users', {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'update',
            id,
            updates: {
              name: updates.name,
              username: updates.username,
              phone: updates.phone,
              about: updates.about,
              role: updates.role,
            },
          }),
        });
        if (result.account) {
          setAccounts((previous) =>
            previous.map((item) => (item.id === id ? result.account! : item)),
          );
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Unable to update.' };
      }
    },
    [],
  );

  const adminDeleteUser = useCallback(
    async (id: string): Promise<AuthResult> => {
      try {
        await apiRequest('/api/admin/users', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });
        setAccounts((previous) => previous.filter((item) => item.id !== id));
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Unable to delete.' };
      }
    },
    [],
  );

  const adminResetPassword = useCallback(async (id: string): Promise<AuthResult> => {
    try {
      const result = await apiRequest<{ temporaryPassword: string }>('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'resetPassword', id }),
      });
      return { ok: true, error: result.temporaryPassword };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unable to reset.' };
    }
  }, []);

  const sendBroadcast = useCallback(
    async (input: {
      title: string;
      message: string;
      audience: Broadcast['audience'];
    }): Promise<AuthResult> => {
      try {
        const result = await apiRequest<{ broadcast: Broadcast }>('/api/broadcasts', {
          method: 'POST',
          body: JSON.stringify(input),
        });
        setBroadcasts((previous) => [result.broadcast, ...previous]);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : 'Unable to send broadcast.',
        };
      }
    },
    [],
  );

  const deleteBroadcast = useCallback(async (id: string) => {
    try {
      await apiRequest('/api/broadcasts', {
        method: 'DELETE',
        body: JSON.stringify({ id }),
      });
      setBroadcasts((previous) => previous.filter((item) => item.id !== id));
    } catch {
      // Keep the broadcast visible when the server rejects the removal.
    }
  }, []);

  const toggleUserStatus = useCallback(async (id: string) => {
    try {
      const result = await apiRequest<{ account: Account | null }>('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'status', id }),
      });
      if (result.account) {
        setAccounts((previous) =>
          previous.map((item) => (item.id === id ? result.account! : item)),
        );
      }
    } catch {
      // Leave the row untouched when the request fails.
    }
  }, []);

  const toggleUserVerified = useCallback(async (id: string) => {
    try {
      const result = await apiRequest<{ account: Account | null }>('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'verify', id }),
      });
      if (result.account) {
        setAccounts((previous) =>
          previous.map((item) => (item.id === id ? result.account! : item)),
        );
      }
    } catch {
      // Leave the row untouched when the request fails.
    }
  }, []);

  const changeAdminPassword = useCallback(
    async (current: string, next: string): Promise<AuthResult> => {
      if (next.length < 6) {
        return { ok: false, error: 'New password must be at least 6 characters.' };
      }
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: false,
      });
      if (result.error) {
        const message = result.error.message ?? 'Unable to update password.';
        return {
          ok: false,
          error: message.toLowerCase().includes('invalid')
            ? 'Current password is incorrect.'
            : message,
        };
      }
      return { ok: true };
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      hydrated,
      currentUser,
      accounts,
      broadcasts,
      isAdmin,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
      adminUpdateUser,
      adminDeleteUser,
      adminResetPassword,
      sendBroadcast,
      deleteBroadcast,
      toggleUserStatus,
      toggleUserVerified,
      changeAdminPassword,
      adminPassword: '',
    }),
    [
      hydrated,
      currentUser,
      accounts,
      broadcasts,
      isAdmin,
      signIn,
      signUp,
      signOut,
      updateProfile,
      resetPassword,
      adminUpdateUser,
      adminDeleteUser,
      adminResetPassword,
      sendBroadcast,
      deleteBroadcast,
      toggleUserStatus,
      toggleUserVerified,
      changeAdminPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
