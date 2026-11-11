import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Account, AccountStatus, Broadcast, Country } from '../lib/types';

const STORAGE_KEY = 'whatsapp-web-auth-v1';

export const ADMIN_USERNAME = 'GolamRabbi786';
const ADMIN_PASSWORD = 'G.rabbi3046';
const ADMIN_ID = 'admin-golam-rabbi';

const ADMIN_ACCOUNT: Account = {
  id: ADMIN_ID,
  name: 'Golam Rabbi',
  username: ADMIN_USERNAME,
  email: 'admin@whatsapp.app',
  phone: '1700000000',
  countryCode: '+880',
  countryName: 'Bangladesh',
  passwordHash: '',
  role: 'admin',
  status: 'active',
  verified: true,
  about: 'Platform administrator',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActiveAt: '2024-01-01T00:00:00.000Z',
};

interface StoredAuth {
  version: number;
  accounts: Account[];
  sessionId: string | null;
  broadcasts: Broadcast[];
  adminPassword: string;
}

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
  signIn: (identifier: string, password: string) => AuthResult;
  signUp: (input: SignUpInput) => AuthResult;
  signOut: () => void;
  updateProfile: (updates: Partial<Account>) => void;
  resetPassword: (identifier: string, newPassword: string) => AuthResult;
  adminUpdateUser: (id: string, updates: Partial<Account>) => AuthResult;
  adminDeleteUser: (id: string) => AuthResult;
  adminResetPassword: (id: string) => AuthResult;
  sendBroadcast: (input: {
    title: string;
    message: string;
    audience: Broadcast['audience'];
  }) => AuthResult;
  deleteBroadcast: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  toggleUserVerified: (id: string) => void;
  changeAdminPassword: (current: string, next: string) => AuthResult;
  adminPassword: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function hashPassword(value: string) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

function withAdmin(accounts: Account[], adminPassword: string): Account[] {
  const filtered = accounts.filter(
    (account) => account.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase(),
  );
  return [
    {
      ...ADMIN_ACCOUNT,
      passwordHash: hashPassword(adminPassword),
    },
    ...filtered,
  ];
}

const digits = (value: string) => value.replace(/\D/g, '');

const normalizePhone = (country: Country, phone: string) =>
  `${digits(country.dial)}${digits(phone)}`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => withAdmin([], ADMIN_PASSWORD));
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [adminPassword, setAdminPassword] = useState(ADMIN_PASSWORD);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw) as StoredAuth;
          const password = parsed.adminPassword || ADMIN_PASSWORD;
          const restored = withAdmin(parsed.accounts ?? [], password);
          if (parsed.adminPassword) setAdminPassword(parsed.adminPassword);
          setAccounts(restored);
          setBroadcasts(parsed.broadcasts ?? []);
          const session = parsed.sessionId
            ? restored.find((account) => account.id === parsed.sessionId)
            : null;
          setSessionId(session && session.status === 'active' ? session.id : null);
        } catch {
          setAccounts(withAdmin([], ADMIN_PASSWORD));
        }
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: StoredAuth = {
      version: 1,
      accounts,
      sessionId,
      broadcasts,
      adminPassword,
    };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, [accounts, sessionId, broadcasts, adminPassword, hydrated]);

  const currentUser = useMemo(
    () => accounts.find((account) => account.id === sessionId) ?? null,
    [accounts, sessionId],
  );

  const touch = useCallback((id: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === id ? { ...account, lastActiveAt: new Date().toISOString() } : account,
      ),
    );
  }, []);

  const signIn = useCallback(
    (identifier: string, password: string): AuthResult => {
      const value = identifier.trim();
      if (!value || !password) {
        return { ok: false, error: 'Enter your account and password to continue.' };
      }
      const needle = value.toLowerCase();
      const phoneNeedle = digits(value);
      const account = accounts.find(
        (item) =>
          item.username.toLowerCase() === needle ||
          item.email.toLowerCase() === needle ||
          (phoneNeedle.length >= 6 &&
            (digits(item.phone) === phoneNeedle ||
              normalizePhone(
                { iso: '', name: item.countryName, dial: digits(item.countryCode), flag: '' },
                item.phone,
              ) === phoneNeedle)),
      );

      if (!account) return { ok: false, error: 'No account found with those details.' };
      if (account.passwordHash !== hashPassword(password)) {
        return { ok: false, error: 'Incorrect password. Please try again.' };
      }
      if (account.status === 'suspended') {
        return {
          ok: false,
          error: 'This account is suspended. Please contact the platform administrator.',
        };
      }

      setSessionId(account.id);
      touch(account.id);
      return { ok: true, role: account.role };
    },
    [accounts, touch],
  );

  const signUp = useCallback(
    (input: SignUpInput): AuthResult => {
      const name = input.name.trim();
      const username = input.username.trim();
      const email = input.email.trim();
      const phoneDigits = digits(input.phone);

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
      if (accounts.some((item) => item.username.toLowerCase() === username.toLowerCase())) {
        return { ok: false, error: 'That username is already taken.' };
      }
      if (accounts.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, error: 'An account with that email already exists.' };
      }
      if (
        accounts.some(
          (item) =>
            `${digits(item.countryCode)}${digits(item.phone)}` ===
            normalizePhone(input.country, phoneDigits),
        )
      ) {
        return { ok: false, error: 'An account with that phone number already exists.' };
      }

      const account: Account = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        username,
        email,
        phone: phoneDigits,
        countryCode: `+${input.country.dial}`,
        countryName: input.country.name,
        passwordHash: hashPassword(input.password),
        role: 'user',
        status: 'active',
        verified: false,
        about: 'Hey there! I am using WhatsApp.',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      setAccounts((prev) => [account, ...prev]);
      setSessionId(account.id);
      return { ok: true, role: 'user' };
    },
    [accounts],
  );

  const signOut = useCallback(() => {
    setSessionId(null);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<Account>) => {
      if (!sessionId) return;
      setAccounts((prev) =>
        prev.map((account) => (account.id === sessionId ? { ...account, ...updates } : account)),
      );
    },
    [sessionId],
  );

  const resetPassword = useCallback(
    (identifier: string, newPassword: string): AuthResult => {
      const needle = identifier.trim().toLowerCase();
      if (!needle) return { ok: false, error: 'Enter your username or email.' };
      if (newPassword.length < 6) {
        return { ok: false, error: 'Password must be at least 6 characters.' };
      }
      const account = accounts.find(
        (item) =>
          item.username.toLowerCase() === needle || item.email.toLowerCase() === needle,
      );
      if (!account) return { ok: false, error: 'No account found with those details.' };
      if (account.role === 'admin') {
        return {
          ok: false,
          error: 'The built-in admin password is managed inside the admin panel.',
        };
      }
      setAccounts((prev) =>
        prev.map((item) =>
          item.id === account.id ? { ...item, passwordHash: hashPassword(newPassword) } : item,
        ),
      );
      return { ok: true };
    },
    [accounts],
  );

  const adminUpdateUser = useCallback(
    (id: string, updates: Partial<Account>): AuthResult => {
      const target = accounts.find((item) => item.id === id);
      if (!target) return { ok: false, error: 'Account not found.' };
      const safeUpdates = { ...updates };
      if (target.role === 'admin') {
        delete safeUpdates.role;
        delete safeUpdates.status;
        delete safeUpdates.username;
      }
      if (safeUpdates.username) {
        const username = safeUpdates.username;
        if (
          accounts.some(
            (item) => item.id !== id && item.username.toLowerCase() === username.toLowerCase(),
          )
        ) {
          return { ok: false, error: 'That username is already taken.' };
        }
      }
      setAccounts((prev) =>
        prev.map((account) => (account.id === id ? { ...account, ...safeUpdates } : account)),
      );
      return { ok: true };
    },
    [accounts],
  );

  const adminDeleteUser = useCallback(
    (id: string): AuthResult => {
      const target = accounts.find((item) => item.id === id);
      if (!target) return { ok: false, error: 'Account not found.' };
      if (target.role === 'admin') {
        return { ok: false, error: 'The built-in administrator cannot be deleted.' };
      }
      setAccounts((prev) => prev.filter((account) => account.id !== id));
      if (sessionId === id) setSessionId(null);
      return { ok: true };
    },
    [accounts, sessionId],
  );

  const adminResetPassword = useCallback(
    (id: string): AuthResult => {
      const target = accounts.find((item) => item.id === id);
      if (!target) return { ok: false, error: 'Account not found.' };
      if (target.role === 'admin') {
        return { ok: false, error: 'Use the admin security panel to change this password.' };
      }
      const temporary = `wa${Math.random().toString(36).slice(2, 8)}`;
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === id ? { ...account, passwordHash: hashPassword(temporary) } : account,
        ),
      );
      return { ok: true, error: temporary };
    },
    [accounts],
  );

  const toggleUserStatus = useCallback((id: string) => {
    setAccounts((prev) =>
      prev.map((account) => {
        if (account.id !== id || account.role === 'admin') return account;
        return {
          ...account,
          status: (account.status === 'active' ? 'suspended' : 'active') as AccountStatus,
        };
      }),
    );
  }, []);

  const toggleUserVerified = useCallback((id: string) => {
    setAccounts((prev) =>
      prev.map((account) =>
        account.id === id ? { ...account, verified: !account.verified } : account,
      ),
    );
  }, []);

  const changeAdminPassword = useCallback(
    (current: string, next: string): AuthResult => {
      if (current !== adminPassword) return { ok: false, error: 'Current password is incorrect.' };
      if (next.length < 6) return { ok: false, error: 'New password must be at least 6 characters.' };
      setAdminPassword(next);
      setAccounts((prev) => withAdmin(prev, next));
      return { ok: true };
    },
    [adminPassword],
  );

  const sendBroadcast = useCallback(
    (input: {
      title: string;
      message: string;
      audience: Broadcast['audience'];
    }): AuthResult => {
      const title = input.title.trim();
      const message = input.message.trim();
      if (!title || !message) return { ok: false, error: 'Add a title and a message.' };
      const broadcast: Broadcast = {
        id: `broadcast-${Date.now()}`,
        title,
        message,
        audience: input.audience,
        createdAt: new Date().toISOString(),
        sentBy: currentUser?.name ?? 'Administrator',
      };
      setBroadcasts((prev) => [broadcast, ...prev]);
      return { ok: true };
    },
    [currentUser?.name],
  );

  const deleteBroadcast = useCallback((id: string) => {
    setBroadcasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const isAdmin = currentUser?.role === 'admin';

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
      adminPassword,
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
      adminPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
