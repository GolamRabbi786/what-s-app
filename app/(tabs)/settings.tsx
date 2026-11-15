import {
  Archive,
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  HardDrive,
  Info,
  KeyRound,
  Laptop,
  Link2,
  Lock,
  LogOut,
  MessageCircle,
  Moon,
  Palette,
  Pencil,
  Send,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  User,
  Users,
  Volume2,
  Wifi,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppShell } from '../../components/AppShell';
import { Avatar } from '../../components/Avatar';
import { FadeSlideIn } from '../../components/Motion';
import { Sheet } from '../../components/Sheet';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { BACKGROUND_PRESETS } from '../../lib/backgrounds';
import { AVATARS } from '../../lib/data';

export default function SettingsScreen() {
  return (
    <AppShell active="settings">
      <SettingsHome />
    </AppShell>
  );
}

type ToggleKey =
  | 'readReceipts'
  | 'lastSeen'
  | 'profilePhoto'
  | 'aboutVisibility'
  | 'messageNotifications'
  | 'groupNotifications'
  | 'previews'
  | 'sounds'
  | 'enterToSend'
  | 'keepArchived'
  | 'mediaAutoDownload'
  | 'twoStep'
  | 'fingerprint'
  | 'appLock';

const DEFAULT_TOGGLES: Record<ToggleKey, boolean> = {
  readReceipts: true,
  lastSeen: true,
  profilePhoto: true,
  aboutVisibility: true,
  messageNotifications: true,
  groupNotifications: true,
  previews: true,
  sounds: true,
  enterToSend: true,
  keepArchived: false,
  mediaAutoDownload: true,
  twoStep: false,
  fingerprint: true,
  appLock: false,
};

const FAQS = [
  {
    question: 'How do I back up my chats?',
    answer:
      'Chat backups are managed from your phone. Open WhatsApp on your phone, go to Settings → Chats → Chat backup to choose a backup schedule and storage location.',
  },
  {
    question: 'Why are my messages not syncing?',
    answer:
      'Make sure your phone has an active internet connection and is charged. This demo stores conversations locally in your browser, so refreshing the page keeps your latest changes.',
  },
  {
    question: 'How do I delete my account?',
    answer:
      'Contact the platform administrator to delete your account. Once removed, you will no longer be able to sign in with those details.',
  },
];

function SettingsHome() {
  const { theme, state, setTheme, updateUser, background, setBackground } = useApp();
  const { currentUser, isAdmin, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 1060;
  const [editOpen, setEditOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);
  const [editName, setEditName] = useState(state.user.name);
  const [editAbout, setEditAbout] = useState(state.user.about);
  const [editAvatar, setEditAvatar] = useState(state.user.avatar);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [faqOpen, setFaqOpen] = useState<string | null>(null);
  const [linkedDevices, setLinkedDevices] = useState(() => [
    {
      id: 'current',
      name: Platform.OS === 'web' ? 'This browser' : 'This device',
      detail: `${
        Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web'
      } · Active now`,
      current: true,
    },
  ]);
  const [linkHelp, setLinkHelp] = useState(false);

  const toggle = (key: ToggleKey) =>
    setToggles((current) => ({ ...current, [key]: !current[key] }));

  const groupCount = state.chats.filter((chat) => chat.group).length;
  const statusCount = state.statuses.filter((status) => status.id !== 'my-status').length;

  const openEdit = () => {
    setEditName(state.user.name);
    setEditAbout(state.user.about);
    setEditAvatar(state.user.avatar);
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!editName.trim() || savingProfile) return;
    setSavingProfile(true);
    const result = await updateProfile({
      name: editName.trim(),
      about: editAbout.trim(),
      avatar: editAvatar ?? '',
    });
    setSavingProfile(false);
    if (!result.ok) {
      Alert.alert('Profile not saved', result.error ?? 'Please try again in a moment.');
      return;
    }
    updateUser({
      name: editName.trim(),
      about: editAbout.trim(),
      avatar: editAvatar,
    });
    setEditOpen(false);
  };

  const prepareAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    let uri = asset.uri;
    try {
      const context = ImageManipulator.manipulate(uri).resize({ width: 320 });
      const image = await context.renderAsync();
      const result = await image.saveAsync({
        compress: 0.62,
        format: SaveFormat.JPEG,
        base64: true,
      });
      if (result.base64) uri = `data:image/jpeg;base64,${result.base64}`;
    } catch {
      if (asset.base64) {
        uri = `data:image/${asset.mimeType?.split('/')[1] ?? 'jpeg'};base64,${asset.base64}`;
      }
    }
    if (uri.length > 1_600_000) {
      Alert.alert('Photo is too large', 'Choose a smaller photo to use as your profile picture.');
      return;
    }
    setEditAvatar(uri);
  };

  const pickFromLibrary = async () => {
    if (avatarBusy) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Photo access needed',
          'Allow photo access so you can choose a profile picture from your device.',
        );
        return;
      }
      setAvatarBusy(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) await prepareAvatar(result.assets[0]);
    } catch {
      Alert.alert('Could not open photos', 'Please try again from your device gallery.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const takePhoto = async () => {
    if (avatarBusy) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Camera access needed',
          'Allow camera access to take a new profile picture.',
        );
        return;
      }
      setAvatarBusy(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) await prepareAvatar(result.assets[0]);
    } catch {
      Alert.alert('Could not open camera', 'Please try again or upload a photo instead.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const invite = () => {
    const digits = state.user.phone.replace(/[^0-9]/g, '');
    const link = digits ? `https://wa.me/${digits}` : currentUser?.email ?? 'WhatsApp';
    Alert.alert('Invite a friend', `Share your invite link: ${link}`);
  };

  const themeOptions = [
    { key: 'light' as const, label: 'Light', icon: Sun, bg: '#f0f2f5', accent: '#00a884' },
    { key: 'dark' as const, label: 'Dark', icon: Moon, bg: '#111b21', accent: '#005c4b' },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.panel }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <FadeSlideIn style={styles.page} offset={10}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
                Manage your profile, privacy, and preferences
              </Text>
            </View>
            <View style={[styles.demoPill, styles.demoPillFixed, { backgroundColor: theme.chip }]}>
              <Info color={theme.textMuted} size={13} />
              <Text style={[styles.demoPillText, { color: theme.textSecondary }]} numberOfLines={1}>
                @{currentUser?.username ?? 'account'}
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={theme.mode === 'dark' ? ['#0f3d34', '#005c4b'] : ['#075e54', '#00a884']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileHero}
          >
            <View style={styles.profileGlowOne} />
            <View style={styles.profileGlowTwo} />
            <View style={styles.profileHeroTop}>
              <View style={styles.profileAvatarWrap}>
                <Avatar name={state.user.name} uri={state.user.avatar} size={82} />
                <Pressable
                  onPress={openEdit}
                  style={({ pressed }) => [styles.avatarEdit, pressed && { opacity: 0.75 }]}
                >
                  <Camera color="#ffffff" size={14} />
                </Pressable>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{state.user.name}</Text>
                <Text style={styles.profileAbout} numberOfLines={2}>
                  {state.user.about}
                </Text>
                <Text style={styles.profilePhone}>{state.user.phone}</Text>
              </View>
              <Pressable
                onPress={openEdit}
                style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.75 }]}
              >
                <Pencil color="#075e54" size={14} />
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.profileStats}>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{state.chats.length}</Text>
                <Text style={styles.profileStatLabel}>Chats</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{groupCount}</Text>
                <Text style={styles.profileStatLabel}>Groups</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{statusCount}</Text>
                <Text style={styles.profileStatLabel}>Statuses</Text>
              </View>
              <View style={styles.profileStatDivider} />
              <View style={styles.profileStat}>
                <Text style={styles.profileStatValue}>{state.calls.length}</Text>
                <Text style={styles.profileStatLabel}>Calls</Text>
              </View>
              <View style={styles.profilePlan}>
                <Text style={styles.profilePlanLabel}>FREE · PERSONAL</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.columns, !wide && styles.columnsStacked]}>
            <View style={styles.mainColumn}>
              <SettingsSection title="Account" theme={theme}>
                <SettingsRow
                  icon={ShieldCheck}
                  iconBg="rgba(0,168,132,0.14)"
                  iconColor={theme.accentDark}
                  title="Privacy"
                  subtitle="Last seen, profile photo, read receipts"
                  onPress={() => setPrivacyOpen(true)}
                />
                <SettingsRow
                  icon={Lock}
                  iconBg="rgba(91,108,255,0.14)"
                  iconColor="#5b6cff"
                  title="Security"
                  subtitle="Two-step verification and app lock"
                  onPress={() => setSecurityOpen(true)}
                />
                <SettingsRow
                  icon={Bell}
                  iconBg="rgba(240,163,10,0.15)"
                  iconColor={theme.warning}
                  title="Notifications"
                  subtitle="Messages, groups, and sounds"
                  onPress={() => setNotificationsOpen(true)}
                />
                <SettingsRow
                  icon={Smartphone}
                  iconBg="rgba(155,81,224,0.14)"
                  iconColor="#9b51e0"
                  title="Linked devices"
                  subtitle={`${linkedDevices.length} device${linkedDevices.length === 1 ? '' : 's'} linked`}
                  onPress={() => setDevicesOpen(true)}
                  last
                />
              </SettingsSection>

              <SettingsSection title="Chats" theme={theme}>
                <SettingsRow
                  icon={Palette}
                  iconBg="rgba(0,168,132,0.14)"
                  iconColor={theme.accentDark}
                  title="Appearance"
                  subtitle={`${theme.mode === 'dark' ? 'Dark' : 'Light'} theme`}
                  onPress={() => setChatSettingsOpen(true)}
                />
                <SettingsRow
                  icon={MessageCircle}
                  iconBg="rgba(45,156,219,0.14)"
                  iconColor="#2d9cdb"
                  title="Chat settings"
                  subtitle="Enter to send, media auto-download"
                  onPress={() => setChatSettingsOpen(true)}
                />
                <SettingsRow
                  icon={Database}
                  iconBg="rgba(242,153,74,0.16)"
                  iconColor="#f2994a"
                  title="Storage and data"
                  subtitle={cacheCleared ? 'Cache cleared · 0 MB' : '1.9 GB used · 620 MB cache'}
                  onPress={() => setStorageOpen(true)}
                  last
                />
              </SettingsSection>

              <SettingsSection title="Support" theme={theme}>
                <SettingsRow
                  icon={CircleHelp}
                  iconBg="rgba(91,108,255,0.14)"
                  iconColor="#5b6cff"
                  title="Help and support"
                  subtitle="FAQs, tips, and contact options"
                  onPress={() => setHelpOpen(true)}
                />
                <SettingsRow
                  icon={Link2}
                  iconBg="rgba(0,168,132,0.14)"
                  iconColor={theme.accentDark}
                  title="Invite a friend"
                  subtitle="Share your invite link"
                  onPress={invite}
                />
                <SettingsRow
                  icon={Info}
                  iconBg="rgba(134,150,160,0.15)"
                  iconColor={theme.textMuted}
                  title="About WhatsApp"
                  subtitle="Version 2.26.4 · Demo build"
                  onPress={() =>
                    Alert.alert(
                      'About this build',
                      'A WhatsApp-inspired web experience built with Expo and React Native. All conversations are securely synced to your account.',
                    )
                  }
                  last
                />
              </SettingsSection>

              <SettingsSection title="Session" theme={theme}>
                {isAdmin ? (
                  <SettingsRow
                    icon={ShieldCheck}
                    iconBg="rgba(0,168,132,0.14)"
                    iconColor={theme.accentDark}
                    title="Admin panel"
                    subtitle="Manage users, content, calls and broadcasts"
                    onPress={() => router.push('/admin' as never)}
                  />
                ) : null}
                <SettingsRow
                  icon={LogOut}
                  iconBg="rgba(234,67,53,0.12)"
                  iconColor={theme.danger}
                  title="Log out"
                  subtitle={
                    currentUser
                      ? `Signed in as @${currentUser.username}`
                      : 'Sign out of this device'
                  }
                  onPress={() => {
                    signOut();
                    router.replace('/auth' as never);
                  }}
                  last
                />
              </SettingsSection>
            </View>

            <View style={[styles.sideColumn, !wide && styles.sideColumnStacked]}>
              <View style={[styles.sideCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                <View style={styles.sideCardHeader}>
                  <View style={[styles.sideCardIcon, { backgroundColor: theme.chip }]}>
                    <Palette color={theme.accentDark} size={17} />
                  </View>
                  <View>
                    <Text style={[styles.sideCardTitle, { color: theme.text }]}>Appearance</Text>
                    <Text style={[styles.sideCardSub, { color: theme.textSecondary }]}>
                      Choose how the app looks
                    </Text>
                  </View>
                </View>
                <View style={styles.themeOptions}>
                  {themeOptions.map((option) => {
                    const active = theme.mode === option.key;
                    const ThemeIcon = option.icon;
                    return (
                      <Pressable
                        key={option.key}
                        onPress={() => setTheme(option.key)}
                        style={({ pressed }) => [
                          styles.themeOption,
                          {
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: theme.panel,
                          },
                          pressed && { opacity: 0.75 },
                        ]}
                      >
                        <View style={[styles.themePreview, { backgroundColor: option.bg }]}>
                          <View style={[styles.themePreviewSidebar, { backgroundColor: option.accent }]} />
                          <View style={styles.themePreviewBody}>
                            <View
                              style={[
                                styles.themePreviewBubble,
                                { backgroundColor: option.accent },
                              ]}
                            />
                            <View
                              style={[
                                styles.themePreviewBubble,
                                styles.themePreviewBubbleAlt,
                                { borderColor: option.accent },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.themeLabelRow}>
                          <ThemeIcon color={theme.textSecondary} size={13} />
                          <Text style={[styles.themeLabel, { color: theme.text }]}>
                            {option.label}
                          </Text>
                          {active ? (
                            <View style={[styles.themeCheck, { backgroundColor: theme.accent }]}>
                              <Check color="#ffffff" size={10} strokeWidth={3} />
                            </View>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.sideCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                <View style={styles.sideCardHeader}>
                  <View style={[styles.sideCardIcon, { backgroundColor: theme.chip }]}>
                    <Info color={theme.accentDark} size={17} />
                  </View>
                  <View>
                    <Text style={[styles.sideCardTitle, { color: theme.text }]}>Account</Text>
                    <Text style={[styles.sideCardSub, { color: theme.textSecondary }]}>
                      Local demo · no server
                    </Text>
                  </View>
                </View>
                <View style={styles.accountDetail}>
                  <Text style={[styles.accountDetailLabel, { color: theme.textSecondary }]}>
                    Phone number
                  </Text>
                  <Text style={[styles.accountDetailValue, { color: theme.text }]}>
                    {state.user.phone}
                  </Text>
                </View>
                <View style={[styles.accountDivider, { backgroundColor: theme.border }]} />
                <View style={styles.accountDetail}>
                  <Text style={[styles.accountDetailLabel, { color: theme.textSecondary }]}>
                    About
                  </Text>
                  <Text style={[styles.accountDetailValue, { color: theme.text }]}>
                    {state.user.about}
                  </Text>
                </View>
                <View style={[styles.accountDivider, { backgroundColor: theme.border }]} />
                <View style={styles.accountDetail}>
                  <Text style={[styles.accountDetailLabel, { color: theme.textSecondary }]}>
                    Data storage
                  </Text>
                  <Text style={[styles.accountDetailValue, { color: theme.text }]}>
                    Saved in this browser
                  </Text>
                </View>
              </View>

              <View style={[styles.sideCard, styles.securityCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                <View style={[styles.securityIcon, { backgroundColor: theme.chip }]}>
                  <ShieldCheck color={theme.accentDark} size={22} />
                </View>
                <Text style={[styles.securityTitle, { color: theme.text }]}>
                  Your messages are private
                </Text>
                <Text style={[styles.securityText, { color: theme.textSecondary }]}>
                  Personal messages and calls are end-to-end encrypted. Not even WhatsApp can read
                  or listen to them.
                </Text>
                <Pressable
                  onPress={() =>
                    Alert.alert(
                      'End-to-end encryption',
                      'Your personal messages are secured with end-to-end encryption. This demo simulates that experience with local storage.',
                    )
                  }
                  style={({ pressed }) => [styles.learnButton, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.learnText, { color: theme.accentDark }]}>Learn more</Text>
                  <ChevronRight color={theme.accentDark} size={14} />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              WhatsApp Web · Demo experience · Built with Expo
            </Text>
          </View>
        </FadeSlideIn>
      </ScrollView>

      <Sheet
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        subtitle="Update how you appear to others"
        maxWidth={460}
        footer={
          <Pressable
            onPress={() => void saveProfile()}
            disabled={!editName.trim() || savingProfile}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: editName.trim() ? theme.accent : theme.chip },
              pressed && { opacity: 0.8 },
            ]}
          >
            {savingProfile ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Check color={editName.trim() ? '#ffffff' : theme.textMuted} size={17} />
            )}
            <Text
              style={[
                styles.saveButtonText,
                { color: editName.trim() ? '#ffffff' : theme.textMuted },
              ]}
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </Text>
          </Pressable>
        }
      >
        <View style={styles.editAvatarWrap}>
          <Avatar name={editName || state.user.name} uri={editAvatar} size={92} />
          <View style={[styles.editCameraBadge, { backgroundColor: theme.accent }]}>
            <Camera color="#ffffff" size={16} />
          </View>
        </View>
        <Text style={[styles.avatarChoicesLabel, { color: theme.textMuted }]}>
          CHOOSE A PROFILE PHOTO
        </Text>
        <View style={styles.avatarChoices}>
          {[AVATARS.me, AVATARS.maya, AVATARS.rohan, AVATARS.zara, AVATARS.dev].map((uri) => (
            <Pressable
              key={uri}
              onPress={() => setEditAvatar(uri)}
              style={[
                styles.avatarChoice,
                { borderColor: editAvatar === uri ? theme.accent : 'transparent' },
              ]}
            >
              <Avatar name="Profile option" uri={uri} size={48} />
              {editAvatar === uri ? (
                <View style={[styles.avatarChoiceCheck, { backgroundColor: theme.accent }]}>
                  <Check color="#ffffff" size={10} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.avatarActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload profile photo"
            disabled={avatarBusy}
            onPress={() => void pickFromLibrary()}
            style={({ pressed }) => [
              styles.avatarAction,
              { backgroundColor: theme.chip },
              pressed && { opacity: 0.75 },
            ]}
          >
            {avatarBusy ? (
              <ActivityIndicator color={theme.accentDark} size="small" />
            ) : (
              <Camera color={theme.accentDark} size={16} />
            )}
            <Text style={[styles.avatarActionText, { color: theme.text }]}>Upload photo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take profile photo"
            disabled={avatarBusy}
            onPress={() => void takePhoto()}
            style={({ pressed }) => [
              styles.avatarAction,
              { backgroundColor: theme.chip },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Camera color={theme.accentDark} size={16} />
            <Text style={[styles.avatarActionText, { color: theme.text }]}>Take photo</Text>
          </Pressable>
          {editAvatar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove profile photo"
              onPress={() => setEditAvatar('')}
              style={({ pressed }) => [
                styles.avatarRemove,
                { borderColor: theme.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Trash2 color={theme.danger ?? '#ea4335'} size={15} />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Your name</Text>
        <View style={[styles.fieldBox, { backgroundColor: theme.search }]}>
          <User color={theme.textMuted} size={17} />
          <TextInput
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            placeholderTextColor={theme.textMuted}
            style={[styles.fieldInput, { color: theme.text }]}
          />
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>About</Text>
        <View style={[styles.fieldBox, { backgroundColor: theme.search }]}>
          <Info color={theme.textMuted} size={17} />
          <TextInput
            value={editAbout}
            onChangeText={setEditAbout}
            placeholder="Write something about yourself"
            placeholderTextColor={theme.textMuted}
            style={[styles.fieldInput, { color: theme.text }]}
            maxLength={90}
          />
        </View>
        <Text style={[styles.charCount, { color: theme.textMuted }]}>{editAbout.length}/90</Text>

        <View style={[styles.fieldBox, styles.readonlyField, { backgroundColor: theme.chip }]}>
          <Smartphone color={theme.textMuted} size={17} />
          <Text style={[styles.readonlyText, { color: theme.textSecondary }]}>
            {state.user.phone} · Verified
          </Text>
          <Lock color={theme.textMuted} size={14} />
        </View>
      </Sheet>

      <Sheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Privacy"
        subtitle="Control who sees your information"
        maxWidth={460}
      >
        <Text style={[styles.sheetSectionLabel, { color: theme.textMuted }]}>WHO CAN SEE</Text>
        <ToggleRow
          title="Last seen and online"
          subtitle="Show when you were last active"
          value={toggles.lastSeen}
          onToggle={() => toggle('lastSeen')}
        />
        <ToggleRow
          title="Profile photo"
          subtitle="Let contacts see your profile photo"
          value={toggles.profilePhoto}
          onToggle={() => toggle('profilePhoto')}
        />
        <ToggleRow
          title="About"
          subtitle="Show your about text to contacts"
          value={toggles.aboutVisibility}
          onToggle={() => toggle('aboutVisibility')}
        />
        <Text style={[styles.sheetSectionLabel, { color: theme.textMuted, marginTop: 16 }]}>
          MESSAGING
        </Text>
        <ToggleRow
          title="Read receipts"
          subtitle="If turned off, you won’t send or receive read receipts"
          value={toggles.readReceipts}
          onToggle={() => toggle('readReceipts')}
        />
        <View style={[styles.privacyNote, { backgroundColor: theme.chip }]}>
          <Eye color={theme.textMuted} size={16} />
          <Text style={[styles.privacyNoteText, { color: theme.textSecondary }]}>
            Read receipts are always sent for group chats and calls.
          </Text>
        </View>
      </Sheet>

      <Sheet
        visible={securityOpen}
        onClose={() => setSecurityOpen(false)}
        title="Security"
        subtitle="Keep your account and messages safe"
        maxWidth={460}
      >
        <View style={[styles.securityBanner, { backgroundColor: theme.chip }]}>
          <ShieldCheck color={theme.accentDark} size={27} />
          <View style={styles.securityBannerText}>
            <Text style={[styles.securityBannerTitle, { color: theme.text }]}>
              Your account is protected
            </Text>
            <Text style={[styles.securityBannerSub, { color: theme.textSecondary }]}>
              End-to-end encryption is on for all personal messages.
            </Text>
          </View>
        </View>
        <ToggleRow
          title="Two-step verification"
          subtitle="Add an extra PIN when registering your number"
          value={toggles.twoStep}
          onToggle={() => toggle('twoStep')}
        />
        <ToggleRow
          title="Fingerprint lock"
          subtitle="Unlock this app with your fingerprint"
          value={toggles.fingerprint}
          onToggle={() => toggle('fingerprint')}
        />
        <ToggleRow
          title="App lock"
          subtitle="Require a PIN after 1 minute away"
          value={toggles.appLock}
          onToggle={() => toggle('appLock')}
        />
        <Pressable
          onPress={() =>
            Alert.alert(
              'Security checkup',
              'No suspicious activity found. Your device is the only active browser session for this demo account.',
            )
          }
          style={({ pressed }) => [
            styles.securityCheck,
            { borderColor: theme.border },
            pressed && { opacity: 0.7 },
          ]}
        >
          <KeyRound color={theme.accentDark} size={18} />
          <Text style={[styles.securityCheckText, { color: theme.text }]}>
            Run a security checkup
          </Text>
          <ChevronRight color={theme.textMuted} size={17} />
        </Pressable>
      </Sheet>

      <Sheet
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notifications"
        subtitle="Choose what you want to be notified about"
        maxWidth={460}
      >
        <ToggleRow
          title="Message notifications"
          subtitle="Show notifications for new messages"
          value={toggles.messageNotifications}
          onToggle={() => toggle('messageNotifications')}
        />
        <ToggleRow
          title="Group notifications"
          subtitle="Show notifications for group messages"
          value={toggles.groupNotifications}
          onToggle={() => toggle('groupNotifications')}
        />
        <ToggleRow
          title="Show previews"
          subtitle="Preview message text in notifications"
          value={toggles.previews}
          onToggle={() => toggle('previews')}
        />
        <ToggleRow
          title="Notification sounds"
          subtitle="Play a sound for incoming messages"
          value={toggles.sounds}
          onToggle={() => toggle('sounds')}
        />
        <View style={[styles.privacyNote, { backgroundColor: theme.chip }]}>
          <Volume2 color={theme.textMuted} size={16} />
          <Text style={[styles.privacyNoteText, { color: theme.textSecondary }]}>
            Notification preferences are stored locally and can be changed at any time.
          </Text>
        </View>
      </Sheet>

      <Sheet
        visible={chatSettingsOpen}
        onClose={() => setChatSettingsOpen(false)}
        title="Chat settings"
        subtitle="Appearance and conversation behaviour"
        maxWidth={460}
      >
        <Text style={[styles.sheetSectionLabel, { color: theme.textMuted }]}>APPEARANCE</Text>
        <View style={styles.sheetThemeRow}>
          {themeOptions.map((option) => {
            const active = theme.mode === option.key;
            const Icon = option.icon;
            return (
              <Pressable
                key={option.key}
                onPress={() => setTheme(option.key)}
                style={[
                  styles.sheetThemeOption,
                  {
                    borderColor: active ? theme.accent : theme.border,
                    backgroundColor: active ? theme.accentSoft : theme.panel,
                  },
                ]}
              >
                <Icon color={active ? theme.accentDark : theme.icon} size={18} />
                <Text style={[styles.sheetThemeText, { color: theme.text }]}>{option.label}</Text>
                {active ? <Check color={theme.accentDark} size={15} /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.sheetSectionLabel, { color: theme.textMuted, marginTop: 16 }]}>
          CHAT BACKGROUND
        </Text>
        <Text style={[styles.bgHint, { color: theme.textSecondary }]}>
          Pick an animated wallpaper for your conversations. It stays on this device.
        </Text>
        <View style={styles.bgGrid}>
          {BACKGROUND_PRESETS.map((preset) => {
            const active = background.id === preset.id;
            const inner = (
              <>
                <View style={styles.bgSwatchScrim} />
                <View style={styles.bgSwatchInner}>
                  <Text style={styles.bgSwatchLabel} numberOfLines={1}>
                    {preset.label}
                  </Text>
                </View>
                {active ? (
                  <View style={[styles.bgCheck, { backgroundColor: theme.accent }]}>
                    <Check color="#ffffff" size={11} strokeWidth={3} />
                  </View>
                ) : null}
              </>
            );
            return (
              <Pressable
                key={preset.id}
                onPress={() => setBackground(preset)}
                accessibilityRole="button"
                accessibilityLabel={`Use ${preset.label} chat background`}
                style={({ pressed }) => [
                  styles.bgSwatch,
                  { borderColor: active ? theme.accent : theme.border },
                  pressed && { opacity: 0.78 },
                ]}
              >
                {preset.kind === 'image' && preset.image ? (
                  <ImageBackground
                    source={{ uri: preset.image }}
                    style={styles.bgSwatchImage}
                    imageStyle={styles.bgSwatchRadius}
                  >
                    {inner}
                  </ImageBackground>
                ) : (
                  <LinearGradient
                    colors={preset.colors ?? ['#061b20', '#0d3b3a', '#155e63']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bgSwatchImage}
                  >
                    {inner}
                  </LinearGradient>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, { color: theme.textMuted, marginTop: 16 }]}>
          CONVERSATIONS
        </Text>
        <ToggleRow
          title="Enter is send"
          subtitle="Press Enter to send a message"
          value={toggles.enterToSend}
          onToggle={() => toggle('enterToSend')}
        />
        <ToggleRow
          title="Keep chats archived"
          subtitle="Keep archived chats archived when new messages arrive"
          value={toggles.keepArchived}
          onToggle={() => toggle('keepArchived')}
        />
        <ToggleRow
          title="Media auto-download"
          subtitle="Automatically download photos and documents"
          value={toggles.mediaAutoDownload}
          onToggle={() => toggle('mediaAutoDownload')}
        />
      </Sheet>

      <Sheet
        visible={storageOpen}
        onClose={() => setStorageOpen(false)}
        title="Storage and data"
        subtitle="Manage what this demo stores locally"
        maxWidth={460}
      >
        <View style={[styles.storageTotal, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
          <View style={[styles.storageIcon, { backgroundColor: theme.chip }]}>
            <HardDrive color={theme.accentDark} size={22} />
          </View>
          <View style={styles.storageTotalText}>
            <Text style={[styles.storageValue, { color: theme.text }]}>
              {cacheCleared ? '1.28 GB' : '1.90 GB'}
            </Text>
            <Text style={[styles.storageLabel, { color: theme.textSecondary }]}>
              Total storage used
            </Text>
          </View>
          <View style={[styles.storageBadge, { backgroundColor: theme.chip }]}>
            <Text style={[styles.storageBadgeText, { color: theme.textSecondary }]}>LOCAL</Text>
          </View>
        </View>

        {[
          { label: 'Photos', value: '1.12 GB', percent: 58, color: '#00a884', icon: Camera },
          { label: 'Videos', value: '520 MB', percent: 27, color: '#5b6cff', icon: Download },
          { label: 'Documents', value: '164 MB', percent: 9, color: '#f2994a', icon: Database },
          { label: 'Storage cache', value: cacheCleared ? '0 MB' : '620 MB', percent: cacheCleared ? 0 : 32, color: '#9b51e0', icon: Wifi },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.label} style={styles.storageRow}>
              <View style={[styles.storageRowIcon, { backgroundColor: theme.chip }]}>
                <Icon color={item.color} size={17} />
              </View>
              <View style={styles.storageRowText}>
                <View style={styles.storageRowTop}>
                  <Text style={[styles.storageRowLabel, { color: theme.text }]}>{item.label}</Text>
                  <Text style={[styles.storageRowValue, { color: theme.textSecondary }]}>
                    {item.value}
                  </Text>
                </View>
                <View style={[styles.storageTrack, { backgroundColor: theme.chip }]}>
                  <View
                    style={[
                      styles.storageFill,
                      { width: `${item.percent}%` as `${number}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}

        <Pressable
          onPress={() => setCacheCleared(true)}
          disabled={cacheCleared}
          style={({ pressed }) => [
            styles.clearCacheButton,
            { backgroundColor: cacheCleared ? theme.chip : theme.accentSoft },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Trash2 color={cacheCleared ? theme.textMuted : theme.accentDark} size={16} />
          <Text
            style={[
              styles.clearCacheText,
              { color: cacheCleared ? theme.textMuted : theme.accentDark },
            ]}
          >
            {cacheCleared ? 'Cache cleared' : 'Clear storage cache'}
          </Text>
        </Pressable>
        <Text style={[styles.storageFootnote, { color: theme.textMuted }]}>
          Clearing cache won’t delete your conversations.
        </Text>
      </Sheet>

      <Sheet
        visible={devicesOpen}
        onClose={() => setDevicesOpen(false)}
        title="Linked devices"
        subtitle="Devices signed in to this account"
        maxWidth={460}
      >
        {linkedDevices.map((device) => (
          <View
            key={device.id}
            style={[styles.deviceRow, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}
          >
            <View style={[styles.deviceIcon, { backgroundColor: theme.chip }]}>
              {device.current ? (
                <Laptop color={theme.accentDark} size={22} />
              ) : (
                <Smartphone color={theme.textSecondary} size={22} />
              )}
            </View>
            <View style={styles.deviceText}>
              <View style={styles.deviceNameRow}>
                <Text style={[styles.deviceName, { color: theme.text }]}>{device.name}</Text>
                {device.current ? (
                  <View style={[styles.currentBadge, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.currentBadgeText, { color: theme.accentDark }]}>
                      THIS DEVICE
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.deviceDetail, { color: theme.textSecondary }]}>
                {device.detail}
              </Text>
            </View>
            {!device.current ? (
              <Pressable
                onPress={() =>
                  setLinkedDevices((current) => current.filter((item) => item.id !== device.id))
                }
                style={({ pressed }) => [styles.unlinkButton, pressed && { opacity: 0.65 }]}
              >
                <Text style={[styles.unlinkText, { color: theme.danger }]}>Log out</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        {linkHelp ? (
          <View style={[styles.linkHelp, { backgroundColor: theme.chip }]}>
            <Globe color={theme.accentDark} size={18} />
            <Text style={[styles.linkHelpText, { color: theme.textSecondary }]}>
              Open WhatsApp on your phone, go to Settings → Linked devices → Link a device, then
              scan the code shown on your computer.
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => setLinkHelp(true)}
            style={({ pressed }) => [
              styles.linkDeviceButton,
              { borderColor: theme.accent },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Link2 color={theme.accentDark} size={16} />
            <Text style={[styles.linkDeviceText, { color: theme.accentDark }]}>
              Link a device
            </Text>
          </Pressable>
        )}
        <Text style={[styles.storageFootnote, { color: theme.textMuted }]}>
          You can log out of linked devices at any time. This demo does not connect to a real
          WhatsApp account.
        </Text>
      </Sheet>

      <Sheet
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Help and support"
        subtitle="Answers to common questions"
        maxWidth={480}
      >
        {FAQS.map((faq) => {
          const open = faqOpen === faq.question;
          return (
            <Pressable
              key={faq.question}
              onPress={() => setFaqOpen(open ? null : faq.question)}
              style={[
                styles.faqRow,
                { borderColor: theme.border, backgroundColor: theme.panelAlt },
              ]}
            >
              <View style={styles.faqTop}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>{faq.question}</Text>
                <ChevronDown
                  color={theme.textMuted}
                  size={17}
                  style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
                />
              </View>
              {open ? (
                <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{faq.answer}</Text>
              ) : null}
            </Pressable>
          );
        })}

        <View style={styles.helpActions}>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Contact support',
                'This is a local demo. For real WhatsApp support, visit faq.whatsapp.com.',
              )
            }
            style={({ pressed }) => [
              styles.helpAction,
              { backgroundColor: theme.accentSoft },
              pressed && { opacity: 0.75 },
            ]}
          >
            <MessageCircle color={theme.accentDark} size={17} />
            <Text style={[styles.helpActionText, { color: theme.accentDark }]}>
              Contact support
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Terms and privacy policy',
                'This demo is not affiliated with WhatsApp. Conversations stay in your browser.',
              )
            }
            style={({ pressed }) => [
              styles.helpAction,
              { backgroundColor: theme.chip },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Info color={theme.icon} size={17} />
            <Text style={[styles.helpActionText, { color: theme.text }]}>Terms & privacy</Text>
          </Pressable>
        </View>
      </Sheet>
    </View>
  );
}

function SettingsSection({
  title,
  theme,
  children,
}: {
  title: string;
  theme: ReturnType<typeof useApp>['theme'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.sectionCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  onPress,
  last = false,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.panelHover },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={19} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <ChevronRight color={theme.textMuted} size={17} />
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onToggle,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { theme } = useApp();
  return (
    <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 34,
  },
  page: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  headerText: {
    flexShrink: 1,
    minWidth: 0,
  },
  demoPillFixed: {
    flexShrink: 0,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 3,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 27,
    borderRadius: 14,
  },
  demoPillText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  profileHero: {
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 22,
  },
  profileGlowOne: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -180,
    right: -70,
  },
  profileGlowTwo: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: -120,
    left: 120,
  },
  profileHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  profileAvatarWrap: {
    position: 'relative',
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(11,20,26,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  profileAbout: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11.5,
    marginTop: 3,
    lineHeight: 16,
  },
  profilePhone: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10.5,
    marginTop: 5,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    height: 33,
    paddingHorizontal: 12,
    borderRadius: 17,
  },
  editButtonText: {
    color: '#075e54',
    fontSize: 11,
    fontWeight: '800',
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 10,
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  profileStat: {
    alignItems: 'center',
    minWidth: 42,
  },
  profileStatValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  profileStatLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 8.5,
    marginTop: 1,
  },
  profileStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginHorizontal: 10,
  },
  profilePlan: {
    marginLeft: 'auto',
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },
  profilePlanLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  columns: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  columnsStacked: {
    flexDirection: 'column',
    gap: 6,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  sideColumn: {
    width: 310,
    gap: 14,
  },
  sideColumnStacked: {
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 7,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 10.5,
    marginTop: 2,
  },
  sideCard: {
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  sideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sideCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  sideCardSub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 11,
    padding: 7,
  },
  themePreview: {
    height: 54,
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  themePreviewSidebar: {
    width: 9,
    opacity: 0.9,
  },
  themePreviewBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 7,
  },
  themePreviewBubble: {
    height: 8,
    width: '64%',
    borderRadius: 4,
    alignSelf: 'flex-start',
    opacity: 0.78,
  },
  themePreviewBubbleAlt: {
    alignSelf: 'flex-end',
    backgroundColor: 'transparent',
    borderWidth: 1,
    opacity: 0.45,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
    paddingHorizontal: 1,
  },
  themeLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  themeCheck: {
    marginLeft: 'auto',
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountDetail: {
    gap: 2,
    paddingVertical: 8,
  },
  accountDetailLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  accountDetailValue: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  accountDivider: {
    height: StyleSheet.hairlineWidth,
  },
  securityCard: {
    alignItems: 'flex-start',
  },
  securityIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  securityTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  securityText: {
    fontSize: 10.5,
    lineHeight: 15.5,
    marginTop: 4,
  },
  learnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 9,
  },
  learnText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 15,
    marginTop: 4,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9.5,
  },
  saveButton: {
    height: 43,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  saveButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  editAvatarWrap: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 18,
  },
  editCameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  avatarAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
  avatarActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  avatarRemove: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChoicesLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  avatarChoices: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 14,
  },
  avatarChoice: {
    borderWidth: 2,
    borderRadius: 999,
    padding: 2,
    position: 'relative',
  },
  avatarChoiceCheck: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 9,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 43,
  },
  fieldInput: {
    flex: 1,
    fontSize: 13.5,
  },
  charCount: {
    fontSize: 9,
    textAlign: 'right',
    marginTop: 3,
  },
  readonlyField: {
    marginTop: 13,
  },
  readonlyText: {
    flex: 1,
    fontSize: 12,
  },
  sheetSectionLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 4,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  toggleSubtitle: {
    fontSize: 10,
    lineHeight: 14.5,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 9,
    padding: 10,
    marginTop: 12,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 9.5,
    lineHeight: 14,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 11,
    padding: 12,
    marginBottom: 8,
  },
  securityBannerText: {
    flex: 1,
  },
  securityBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  securityBannerSub: {
    fontSize: 9.5,
    lineHeight: 13.5,
    marginTop: 2,
  },
  securityCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginTop: 13,
  },
  securityCheckText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
  },
  sheetThemeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sheetThemeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sheetThemeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  bgHint: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  bgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bgSwatch: {
    width: '31.5%',
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  bgSwatchImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bgSwatchRadius: {
    borderRadius: 10,
  },
  bgSwatchScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  bgSwatchInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 7,
  },
  bgSwatchLabel: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
  bgCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 11,
    padding: 12,
    marginBottom: 14,
  },
  storageIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageTotalText: {
    flex: 1,
  },
  storageValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  storageLabel: {
    fontSize: 9.5,
    marginTop: 1,
  },
  storageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  storageBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },
  storageRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageRowText: {
    flex: 1,
  },
  storageRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  storageRowLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  storageRowValue: {
    fontSize: 9.5,
  },
  storageTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageFill: {
    height: '100%',
    borderRadius: 3,
  },
  clearCacheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 9,
    marginTop: 4,
  },
  clearCacheText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  storageFootnote: {
    fontSize: 9,
    lineHeight: 13.5,
    textAlign: 'center',
    marginTop: 9,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 11,
    padding: 11,
    marginBottom: 9,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceText: {
    flex: 1,
    minWidth: 0,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  deviceName: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 6.5,
    fontWeight: '800',
    letterSpacing: 0.35,
  },
  deviceDetail: {
    fontSize: 9.5,
    marginTop: 2,
  },
  unlinkButton: {
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  unlinkText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  linkDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 4,
  },
  linkDeviceText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  linkHelp: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 9,
    padding: 11,
    marginTop: 4,
  },
  linkHelpText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  faqRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  faqTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: 10.5,
    lineHeight: 16,
    marginTop: 8,
  },
  helpActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  helpAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 9,
  },
  helpActionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});
