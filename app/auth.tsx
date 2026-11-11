import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AtSign,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Globe2,
  Lock,
  MessageCircle,
  Phone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Users,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountryPicker } from '../components/CountryPicker';
import { Sheet } from '../components/Sheet';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, DEFAULT_COUNTRY } from '../lib/countries';
import { Country } from '../lib/types';

type Mode = 'login' | 'signup';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  right?: React.ReactNode;
  theme: ReturnType<typeof useApp>['theme'];
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon: Icon,
  secure = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  right,
  theme,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.panelAlt,
            borderColor: focused ? theme.accent : theme.border,
          },
        ]}
      >
        <Icon color={focused ? theme.accent : theme.textMuted} size={17} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: theme.text }]}
        />
        {right}
      </View>
    </View>
  );
}

export default function AuthScreen() {
  const { theme, theme: palette } = useApp();
  const { signIn, signUp, resetPassword } = useAuth();
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const desktop = width >= 1000;

  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [terms, setTerms] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotPass, setForgotPass] = useState('');
  const [forgotConfirm, setForgotConfirm] = useState('');
  const [forgotMessage, setForgotMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(
    null,
  );

  const countriesLabel = useMemo(() => COUNTRIES.length, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirm('');
  };

  const submit = () => {
    setError('');

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setError('Enter your username, email or phone number and password.');
        return;
      }
      setBusy(true);
      const result = signIn(identifier, password);
      setBusy(false);
      if (!result.ok) {
        setError(result.error ?? 'Unable to sign in.');
        return;
      }
      router.replace((result.role === 'admin' ? '/admin' : '/(tabs)') as never);
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!terms) {
      setError('Please accept the terms to create your account.');
      return;
    }

    setBusy(true);
    const result = signUp({
      name,
      username,
      email,
      phone,
      password,
      country,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Unable to create the account.');
      return;
    }
    router.replace('/(tabs)' as never);
  };

  const submitForgot = () => {
    if (forgotPass !== forgotConfirm) {
      setForgotMessage({ tone: 'error', text: 'Passwords do not match.' });
      return;
    }
    const result = resetPassword(forgotId, forgotPass);
    if (!result.ok) {
      setForgotMessage({ tone: 'error', text: result.error ?? 'Unable to reset password.' });
      return;
    }
    setForgotMessage({
      tone: 'success',
      text: 'Password updated. You can now sign in with your new password.',
    });
    setForgotId('');
    setForgotPass('');
    setForgotConfirm('');
  };

  const form = (
    <View style={[styles.formCard, { backgroundColor: theme.panel, borderColor: theme.border }]}>
      <View style={[styles.segment, { backgroundColor: theme.chip }]}>
        {(['login', 'signup'] as Mode[]).map((item) => {
          const active = mode === item;
          return (
            <Pressable
              key={item}
              onPress={() => switchMode(item)}
              style={({ pressed }) => [
                styles.segmentItem,
                active && { backgroundColor: theme.panel },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? theme.text : theme.textSecondary },
                ]}
              >
                {item === 'login' ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.formHeading}>
        <Text style={[styles.formTitle, { color: theme.text }]}>
          {mode === 'login' ? 'Welcome back' : 'Get started on WhatsApp'}
        </Text>
        <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>
          {mode === 'login'
            ? 'Sign in to continue your conversations from any country.'
            : 'Create your account — works with phone numbers from every country.'}
        </Text>
      </View>

      {error ? (
        <View style={[styles.alert, { backgroundColor: theme.mode === 'dark' ? '#3a1a1c' : '#fdeceb' }]}>
          <Text style={[styles.alertText, { color: theme.danger }]}>{error}</Text>
        </View>
      ) : null}

      {mode === 'login' ? (
        <>
          <Field
            label="Username, email or phone"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="e.g. maya.k or +8801712345678"
            icon={AtSign}
            autoCapitalize="none"
            theme={palette}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            icon={Lock}
            secure={!showPassword}
            autoCapitalize="none"
            theme={palette}
            right={
              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeOff color={theme.textMuted} size={17} />
                ) : (
                  <Eye color={theme.textMuted} size={17} />
                )}
              </Pressable>
            }
          />
          <View style={styles.helperRow}>
            <Pressable onPress={() => setForgotOpen(true)}>
              <Text style={[styles.link, { color: theme.accent }]}>Forgot password?</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            icon={User}
            autoCapitalize="words"
            theme={palette}
          />
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Field
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="maya.k"
                icon={AtSign}
                autoCapitalize="none"
                theme={palette}
              />
            </View>
            <View style={styles.rowField}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                icon={AtSign}
                autoCapitalize="none"
                keyboardType="email-address"
                theme={palette}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Country</Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [
                styles.countryButton,
                { backgroundColor: theme.panelAlt, borderColor: theme.border },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={styles.countryFlag}>{country.flag}</Text>
              <Text style={[styles.countryName, { color: theme.text }]} numberOfLines={1}>
                {country.name}
              </Text>
              <Text style={[styles.countryDial, { color: theme.textSecondary }]}>
                +{country.dial}
              </Text>
              <ChevronDown color={theme.textMuted} size={16} />
            </Pressable>
          </View>

          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="1712 345 678"
            icon={Phone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            theme={palette}
          />

          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                icon={Lock}
                secure={!showPassword}
                autoCapitalize="none"
                theme={palette}
                right={
                  <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                    {showPassword ? (
                      <EyeOff color={theme.textMuted} size={17} />
                    ) : (
                      <Eye color={theme.textMuted} size={17} />
                    )}
                  </Pressable>
                }
              />
            </View>
            <View style={styles.rowField}>
              <Field
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                placeholder="Repeat password"
                icon={Lock}
                secure={!showConfirm}
                autoCapitalize="none"
                theme={palette}
                right={
                  <Pressable onPress={() => setShowConfirm((value) => !value)} hitSlop={8}>
                    {showConfirm ? (
                      <EyeOff color={theme.textMuted} size={17} />
                    ) : (
                      <Eye color={theme.textMuted} size={17} />
                    )}
                  </Pressable>
                }
              />
            </View>
          </View>

          <Pressable
            onPress={() => setTerms((value) => !value)}
            style={styles.termsRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: terms }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: terms ? theme.accent : 'transparent',
                  borderColor: terms ? theme.accent : theme.textMuted,
                },
              ]}
            >
              {terms ? <Check color="#ffffff" size={12} strokeWidth={3} /> : null}
            </View>
            <Text style={[styles.termsText, { color: theme.textSecondary }]}>
              I agree to the Terms of Service and Privacy Policy.
            </Text>
          </Pressable>
        </>
      )}

      <Pressable
        onPress={submit}
        disabled={busy}
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: theme.accent },
          (pressed || busy) && { opacity: 0.82 },
        ]}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : mode === 'login' ? (
          <Lock color="#ffffff" size={16} />
        ) : (
          <UserPlus color="#ffffff" size={16} />
        )}
        <Text style={styles.submitText}>
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Text>
      </Pressable>

      <View style={[styles.securityNote, { backgroundColor: theme.chip }]}>
        <ShieldCheck color={theme.accent} size={16} />
        <Text style={[styles.securityText, { color: theme.textSecondary }]}>
          {countriesLabel} countries supported · encrypted local session · admin-managed accounts
        </Text>
      </View>

      <Text style={[styles.switchText, { color: theme.textSecondary }]}>
        {mode === 'login' ? 'New to WhatsApp? ' : 'Already have an account? '}
        <Text
          style={[styles.link, { color: theme.accent }]}
          onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login' ? 'Create an account' : 'Sign in'}
        </Text>
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, desktop && styles.scrollDesktop]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {desktop ? (
            <View style={styles.desktopRow}>
              <LinearGradient
                colors={theme.mode === 'dark' ? ['#0b3b33', '#111b21'] : ['#075e54', '#00a884']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.hero, { minHeight: height - 72 }]}
              >
                <View style={styles.heroGlowOne} />
                <View style={styles.heroGlowTwo} />
                <View style={styles.brandRow}>
                  <View style={styles.brandMark}>
                    <MessageCircle color="#ffffff" size={24} strokeWidth={2.4} />
                  </View>
                  <Text style={styles.brandName}>WhatsApp</Text>
                </View>

                <View style={styles.heroBody}>
                  <View style={styles.heroPill}>
                    <Sparkles color="#d9fdd3" size={13} />
                    <Text style={styles.heroPillText}>Trusted by people in every country</Text>
                  </View>
                  <Text style={styles.heroTitle}>The whole world,{'\n'}one conversation.</Text>
                  <Text style={styles.heroText}>
                    Share messages, photos, status updates and calls with the people who matter —
                    across {countriesLabel} countries, on one beautifully simple platform.
                  </Text>

                  <View style={styles.featureList}>
                    {[
                      { icon: ShieldCheck, title: 'Private by design', detail: 'End-to-end encrypted messaging' },
                      { icon: Globe2, title: 'Works everywhere', detail: 'Any country, any phone number' },
                      { icon: PhoneCall, title: 'Voice, video & groups', detail: 'Calls and screen sharing built in' },
                      { icon: Users, title: 'Communities & status', detail: 'Stay close to your people' },
                    ].map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <View key={feature.title} style={styles.featureRow}>
                          <View style={styles.featureIcon}>
                            <Icon color="#d9fdd3" size={17} />
                          </View>
                          <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureDetail}>{feature.detail}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.heroFooter}>
                  <View style={styles.avatarStack}>
                    {['#d9fdd3', '#f9c7a0', '#c6d8ff', '#f7b6cc'].map((bg, index) => (
                      <View key={bg} style={[styles.heroAvatar, { backgroundColor: bg, marginLeft: index === 0 ? 0 : -10 }]}>
                        <User color="#075e54" size={16} />
                      </View>
                    ))}
                  </View>
                  <Text style={styles.heroFooterText}>
                    Millions of conversations happening right now.
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.formPanel}>
                <View style={styles.formPanelInner}>{form}</View>
              </View>
            </View>
          ) : (
            <View style={styles.mobileWrap}>
              <View style={styles.mobileBrand}>
                <View style={[styles.brandMark, { backgroundColor: theme.accent }]}>
                  <MessageCircle color="#ffffff" size={22} strokeWidth={2.4} />
                </View>
                <Text style={[styles.mobileBrandName, { color: theme.text }]}>WhatsApp</Text>
                <Text style={[styles.mobileBrandSub, { color: theme.textSecondary }]}>
                  Simple, reliable, private messaging
                </Text>
              </View>
              {form}
              <Text style={[styles.footerNote, { color: theme.textMuted }]}>
                Works with phone numbers from {countriesLabel} countries and regions.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CountryPicker
        visible={pickerOpen}
        selected={country}
        onSelect={setCountry}
        onClose={() => setPickerOpen(false)}
      />

      <Sheet
        visible={forgotOpen}
        onClose={() => {
          setForgotOpen(false);
          setForgotMessage(null);
        }}
        title="Reset your password"
        subtitle="Set a new password for your account"
        maxWidth={420}
        footer={
          <Pressable
            onPress={submitForgot}
            style={({ pressed }) => [
              styles.sheetAction,
              { backgroundColor: theme.accent },
              pressed && { opacity: 0.82 },
            ]}
          >
            <Text style={styles.sheetActionText}>Update password</Text>
          </Pressable>
        }
      >
        {forgotMessage ? (
          <View
            style={[
              styles.alert,
              {
                backgroundColor:
                  forgotMessage.tone === 'error'
                    ? theme.mode === 'dark'
                      ? '#3a1a1c'
                      : '#fdeceb'
                    : theme.mode === 'dark'
                      ? '#0f3d34'
                      : '#e7f8f1',
                marginBottom: 14,
              },
            ]}
          >
            <Text
              style={[
                styles.alertText,
                { color: forgotMessage.tone === 'error' ? theme.danger : theme.accentDark },
              ]}
            >
              {forgotMessage.text}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.sheetLabel, { color: theme.textSecondary }]}>USERNAME OR EMAIL</Text>
        <TextInput
          value={forgotId}
          onChangeText={setForgotId}
          placeholder="Your username or email"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          style={[styles.sheetInput, { backgroundColor: theme.chip, color: theme.text }]}
        />
        <Text style={[styles.sheetLabel, { color: theme.textSecondary, marginTop: 14 }]}>
          NEW PASSWORD
        </Text>
        <TextInput
          value={forgotPass}
          onChangeText={setForgotPass}
          placeholder="At least 6 characters"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.sheetInput, { backgroundColor: theme.chip, color: theme.text }]}
        />
        <Text style={[styles.sheetLabel, { color: theme.textSecondary, marginTop: 14 }]}>
          CONFIRM PASSWORD
        </Text>
        <TextInput
          value={forgotConfirm}
          onChangeText={setForgotConfirm}
          placeholder="Repeat new password"
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.sheetInput, { backgroundColor: theme.chip, color: theme.text }]}
        />
        <Text style={[styles.sheetNote, { color: theme.textMuted }]}>
          Admin accounts are protected — the built-in administrator password can be changed from
          the admin panel.
        </Text>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollDesktop: {
    padding: 18,
  },
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 18,
    maxWidth: 1440,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    flex: 1.05,
    borderRadius: 26,
    padding: 40,
    overflow: 'hidden',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  heroGlowOne: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -140,
    right: -120,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0,0,0,0.12)',
    bottom: -120,
    left: -80,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  brandName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroBody: {
    marginVertical: 28,
    maxWidth: 520,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 20,
  },
  heroPillText: {
    color: '#e7fff8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    letterSpacing: -1.4,
  },
  heroText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14.5,
    lineHeight: 22,
    marginTop: 16,
    maxWidth: 430,
  },
  featureList: {
    marginTop: 28,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    gap: 2,
  },
  featureTitle: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  featureDetail: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11.5,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFooterText: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 11.5,
    flex: 1,
  },
  formPanel: {
    flex: 0.95,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0,
  },
  formPanelInner: {
    width: '100%',
    maxWidth: 480,
  },
  mobileWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 24,
  },
  mobileBrand: {
    alignItems: 'center',
    marginBottom: 22,
    gap: 6,
  },
  mobileBrandName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginTop: 4,
  },
  mobileBrandSub: {
    fontSize: 12.5,
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 18,
  },
  formCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 6,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formHeading: {
    marginBottom: 18,
    gap: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  formSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  alert: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  field: {
    marginBottom: 13,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.4,
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -2,
    marginBottom: 10,
  },
  link: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  rowField: {
    flex: 1,
    minWidth: 0,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 46,
    borderRadius: 11,
    borderWidth: 1.4,
    paddingHorizontal: 12,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  countryDial: {
    fontSize: 13,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 2,
    marginBottom: 16,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 48,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#00a884',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 4,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 16,
  },
  securityText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 12.5,
    marginTop: 18,
  },
  sheetAction: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 10,
  },
  sheetActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sheetLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  sheetInput: {
    height: 44,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  sheetNote: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14,
  },
});
