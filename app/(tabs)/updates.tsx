import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  CheckCheck,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Lock,
  MessageCircle,
  MoreVertical,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppShell } from '../../components/AppShell';
import { Avatar } from '../../components/Avatar';
import { FadeSlideIn } from '../../components/Motion';
import { NewStatusModal } from '../../components/NewStatusModal';
import { Sheet } from '../../components/Sheet';
import { StatusViewer } from '../../components/StatusViewer';
import { useApp } from '../../context/AppContext';
import { StatusGroup } from '../../lib/types';

export default function UpdatesScreen() {
  return (
    <AppShell active="updates">
      <UpdatesHome />
    </AppShell>
  );
}

const PRIVACY_OPTIONS = [
  {
    key: 'contacts',
    label: 'My contacts',
    detail: 'Everyone in your address book can see your status',
  },
  {
    key: 'except',
    label: 'My contacts except…',
    detail: 'Hide your status from selected contacts',
  },
  {
    key: 'only',
    label: 'Only share with…',
    detail: 'Choose exactly who can see your updates',
  },
];

function UpdatesHome() {
  const { theme, state, markStatusViewed, setTheme } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 1120;
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [newStatusOpen, setNewStatusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState('contacts');

  const myStatus = state.statuses.find((status) => status.id === 'my-status');
  const recent = useMemo(
    () => state.statuses.filter((status) => !status.viewed && status.id !== 'my-status'),
    [state.statuses],
  );
  const viewed = useMemo(
    () => state.statuses.filter((status) => status.viewed && status.id !== 'my-status'),
    [state.statuses],
  );
  const totalUpdates = recent.reduce((total, status) => total + status.items.length, 0);

  const markAllViewed = () => {
    recent.forEach((status) => markStatusViewed(status.id));
    setMenuOpen(false);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.panel }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.text }]}>Status</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Share moments that disappear after 24 hours
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a status"
                onPress={() => setNewStatusOpen(true)}
                style={({ pressed }) => [
                  styles.newButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Plus color="#ffffff" size={17} />
                {wide ? <Text style={styles.newButtonText}>New status</Text> : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Status menu"
                onPress={() => setMenuOpen(true)}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MoreVertical color={theme.icon} size={20} />
              </Pressable>
            </View>
          </View>

          <View style={styles.banner}>
            <View style={[styles.bannerIcon, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Sparkles color="#ffffff" size={18} />
            </View>
            <Text style={styles.bannerText}>
              {totalUpdates > 0
                ? `${totalUpdates} new updates from ${recent.length} people`
                : 'You’re all caught up on updates'}
            </Text>
            {recent.length > 0 ? (
              <Pressable
                onPress={markAllViewed}
                style={({ pressed }) => [
                  styles.bannerAction,
                  { backgroundColor: 'rgba(255,255,255,0.16)' },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <CheckCheck color="#ffffff" size={14} />
                <Text style={styles.bannerActionText}>Mark viewed</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.columns, !wide && styles.columnsStacked]}>
            <View style={styles.mainColumn}>
              <View
                style={[
                  styles.myStatusCard,
                  { backgroundColor: theme.panelAlt, borderColor: theme.border },
                ]}
              >
                <Pressable
                  onPress={() => (myStatus ? setViewerId(myStatus.id) : setNewStatusOpen(true))}
                  style={({ pressed }) => [styles.myStatusIdentity, pressed && { opacity: 0.75 }]}
                >
                  <View style={[styles.myRing, { borderColor: theme.accent }]}>
                    <Avatar name={state.user.name} uri={state.user.avatar} size={52} showOnline online />
                  </View>
                  <View style={styles.myStatusText}>
                    <Text style={[styles.myStatusTitle, { color: theme.text }]}>My status</Text>
                    <Text style={[styles.myStatusSub, { color: theme.textSecondary }]}>
                      {myStatus
                        ? `${myStatus.time} · ${myStatus.items.length} update${myStatus.items.length === 1 ? '' : 's'}`
                        : 'Tap to add a status update'}
                    </Text>
                  </View>
                </Pressable>

                {myStatus ? (
                  <Pressable
                    onPress={() => setViewerId(myStatus.id)}
                    style={({ pressed }) => [
                      styles.viewStatusButton,
                      { backgroundColor: theme.chip },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Eye color={theme.accentDark} size={15} />
                    <Text style={[styles.viewStatusText, { color: theme.accentDark }]}>View</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => setNewStatusOpen(true)}
                  style={({ pressed }) => [
                    styles.addStatusButton,
                    { backgroundColor: theme.accent },
                    pressed && { opacity: 0.78 },
                  ]}
                >
                  <Plus color="#ffffff" size={18} />
                </Pressable>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent updates</Text>
                <View style={[styles.sectionCount, { backgroundColor: theme.chip }]}>
                  <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
                    {recent.length}
                  </Text>
                </View>
              </View>

              {recent.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.chip }]}>
                    <Camera color={theme.textMuted} size={25} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    No new updates
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    When your contacts share a status, it will appear here.
                  </Text>
                  <Pressable
                    onPress={() => setNewStatusOpen(true)}
                    style={({ pressed }) => [
                      styles.emptyButton,
                      { borderColor: theme.accent },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Plus color={theme.accentDark} size={15} />
                    <Text style={[styles.emptyButtonText, { color: theme.accentDark }]}>
                      Create your own
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.statusList, { borderColor: theme.border }]}>
                  {recent.map((status, index) => (
                    <FadeSlideIn key={status.id} delay={Math.min(index, 8) * 45}>
                      <StatusRow status={status} onPress={() => setViewerId(status.id)} />
                    </FadeSlideIn>
                  ))}
                </View>
              )}

              {viewed.length > 0 ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Viewed updates</Text>
                    <View style={[styles.sectionCount, { backgroundColor: theme.chip }]}>
                      <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
                        {viewed.length}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusList, { borderColor: theme.border }]}>
                    {viewed.map((status, index) => (
                      <FadeSlideIn key={status.id} delay={Math.min(index, 8) * 40}>
                        <StatusRow
                          status={status}
                          viewed
                          onPress={() => setViewerId(status.id)}
                        />
                      </FadeSlideIn>
                    ))}
                  </View>
                </>
              ) : null}
            </View>

            <View style={[styles.sideColumn, !wide && styles.sideColumnStacked]}>
              <View style={[styles.sideCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                <View style={styles.sideHeader}>
                  <View style={[styles.sideIcon, { backgroundColor: theme.chip }]}>
                    <Lock color={theme.accentDark} size={17} />
                  </View>
                  <View style={styles.sideHeaderText}>
                    <Text style={[styles.sideTitle, { color: theme.text }]}>Status privacy</Text>
                    <Text style={[styles.sideSub, { color: theme.textSecondary }]}>
                      {PRIVACY_OPTIONS.find((option) => option.key === privacy)?.label}
                    </Text>
                  </View>
                  <ChevronRight color={theme.textMuted} size={17} />
                </View>

                {PRIVACY_OPTIONS.map((option) => {
                  const active = option.key === privacy;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setPrivacy(option.key)}
                      style={({ pressed }) => [
                        styles.privacyRow,
                        { borderTopColor: theme.border },
                        pressed && { opacity: 0.68 },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: active ? theme.accent : theme.border,
                            backgroundColor: active ? theme.accent : 'transparent',
                          },
                        ]}
                      >
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={styles.privacyText}>
                        <Text style={[styles.privacyLabel, { color: theme.text }]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.privacyDetail, { color: theme.textSecondary }]}>
                          {option.detail}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => setPrivacyOpen(true)}
                  style={({ pressed }) => [
                    styles.manageButton,
                    { backgroundColor: theme.chip },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.manageText, { color: theme.accentDark }]}>
                    Manage status privacy
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.sideCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                <Text style={[styles.tipsTitle, { color: theme.text }]}>Good to know</Text>
                <View style={styles.tipRow}>
                  <Clock color={theme.accentDark} size={17} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    Status updates disappear automatically after 24 hours.
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <ShieldCheck color={theme.accentDark} size={17} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    Only people in your chosen privacy list can see your updates.
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <EyeOff color={theme.accentDark} size={17} />
                  <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                    You can hide your status from specific contacts at any time.
                  </Text>
                </View>
              </View>

              {myStatus ? (
                <View style={[styles.sideCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
                  <Text style={[styles.tipsTitle, { color: theme.text }]}>Recent viewers</Text>
                  <Text style={[styles.viewerSub, { color: theme.textSecondary }]}>
                    {myStatus.viewers && myStatus.viewers.length > 0
                      ? `${myStatus.viewers.length} ${
                          myStatus.viewers.length === 1 ? 'person' : 'people'
                        } viewed your status`
                      : 'No views yet — your status is live for 24 hours'}
                  </Text>
                  {myStatus.viewers && myStatus.viewers.length > 0 ? (
                    <View style={styles.viewerAvatars}>
                      {myStatus.viewers.slice(0, 5).map((viewer, index) => (
                        <View
                          key={viewer.name}
                          style={[
                            styles.viewerAvatar,
                            { borderColor: theme.panelAlt, marginLeft: index === 0 ? 0 : -8 },
                          ]}
                        >
                          <Avatar name={viewer.name} uri={viewer.avatar} size={30} />
                        </View>
                      ))}
                      {myStatus.viewers.length > 5 ? (
                        <View
                          style={[
                            styles.viewerMore,
                            { backgroundColor: theme.chip, borderColor: theme.panelAlt },
                          ]}
                        >
                          <Text style={[styles.viewerMoreText, { color: theme.textSecondary }]}>
                            +{myStatus.viewers.length - 5}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>

          <View style={[styles.footerNote, { borderTopColor: theme.border }]}>
            <ShieldCheck color={theme.textMuted} size={14} />
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Your status updates are end-to-end encrypted and only visible to people you choose.
            </Text>
          </View>
        </View>
      </ScrollView>

      <StatusViewer
        visible={Boolean(viewerId)}
        statusId={viewerId}
        onClose={() => setViewerId(null)}
      />
      <NewStatusModal visible={newStatusOpen} onClose={() => setNewStatusOpen(false)} />

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Status options" maxWidth={400}>
        <View style={styles.menuList}>
          <MenuOption
            icon={Camera}
            label="Create a new status"
            onPress={() => {
              setMenuOpen(false);
              setNewStatusOpen(true);
            }}
          />
          <MenuOption
            icon={CheckCheck}
            label="Mark all as viewed"
            onPress={markAllViewed}
          />
          <MenuOption
            icon={Lock}
            label="Status privacy"
            onPress={() => {
              setMenuOpen(false);
              setPrivacyOpen(true);
            }}
          />
          <MenuOption
            icon={theme.mode === 'dark' ? Eye : EyeOff}
            label={theme.mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onPress={() => {
              setTheme(theme.mode === 'dark' ? 'light' : 'dark');
              setMenuOpen(false);
            }}
          />
        </View>
      </Sheet>

      <Sheet
        visible={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Status privacy"
        subtitle="Choose who can see your status updates"
        maxWidth={460}
      >
        {PRIVACY_OPTIONS.map((option) => {
          const active = option.key === privacy;
          return (
            <Pressable
              key={option.key}
              onPress={() => setPrivacy(option.key)}
              style={({ pressed }) => [
                styles.privacySheetRow,
                { borderColor: active ? theme.accent : theme.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <View
                style={[
                  styles.privacySheetIcon,
                  { backgroundColor: active ? theme.accentSoft : theme.chip },
                ]}
              >
                {option.key === 'contacts' ? (
                  <Users color={active ? theme.accentDark : theme.icon} size={19} />
                ) : option.key === 'except' ? (
                  <EyeOff color={active ? theme.accentDark : theme.icon} size={19} />
                ) : (
                  <Eye color={active ? theme.accentDark : theme.icon} size={19} />
                )}
              </View>
              <View style={styles.privacySheetText}>
                <Text style={[styles.privacyLabel, { color: theme.text }]}>{option.label}</Text>
                <Text style={[styles.privacyDetail, { color: theme.textSecondary }]}>
                  {option.detail}
                </Text>
              </View>
              {active ? (
                <View style={[styles.selectedBadge, { backgroundColor: theme.accent }]}>
                  <CheckCheck color="#ffffff" size={14} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
        <View style={[styles.privacyNote, { backgroundColor: theme.chip }]}>
          <Lock color={theme.textMuted} size={16} />
          <Text style={[styles.privacyNoteText, { color: theme.textSecondary }]}>
            Changes to your privacy settings won’t affect statuses you’ve already shared.
          </Text>
        </View>
      </Sheet>
    </View>
  );
}

function StatusRow({
  status,
  viewed = false,
  onPress,
}: {
  status: StatusGroup;
  viewed?: boolean;
  onPress: () => void;
}) {
  const { theme } = useApp();
  const preview = status.items[status.items.length - 1];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statusRow, pressed && { backgroundColor: theme.panelHover }]}
    >
      <View
        style={[
          styles.statusRing,
          { borderColor: viewed ? theme.border : theme.accent },
        ]}
      >
        <Avatar name={status.name} uri={status.avatar} size={46} />
      </View>
      <View style={styles.statusText}>
        <Text
          style={[
            styles.statusName,
            { color: theme.text, fontWeight: viewed ? '500' : '700' },
          ]}
        >
          {status.name}
        </Text>
        <Text style={[styles.statusMeta, { color: theme.textSecondary }]}>
          {status.time} · {status.items.length} update{status.items.length === 1 ? '' : 's'}
        </Text>
      </View>
      {preview?.type === 'image' && preview.image ? (
        <Image source={{ uri: preview.image }} style={styles.statusThumb} resizeMode="cover" />
      ) : preview?.type === 'video' ? (
        <View style={[styles.statusTextPreview, { backgroundColor: '#0b141a' }]}>
          <VideoIcon color="#ffffff" size={13} />
        </View>
      ) : (
        <View style={[styles.statusTextPreview, { backgroundColor: preview?.background ?? theme.chip }]}>
          <MessageCircle color="#ffffff" size={13} />
        </View>
      )}
      {!viewed ? <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} /> : null}
    </Pressable>
  );
}

function MenuOption({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuOption, pressed && { opacity: 0.62 }]}
    >
      <Icon color={theme.icon} size={19} />
      <Text style={[styles.menuOptionText, { color: theme.text }]}>{label}</Text>
    </Pressable>
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
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  headerText: {
    flex: 1,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#075e54',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 20,
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '600',
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bannerActionText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '600',
  },
  columns: {
    flexDirection: 'row',
    gap: 22,
    alignItems: 'flex-start',
  },
  columnsStacked: {
    flexDirection: 'column',
    gap: 20,
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    width: '100%',
  },
  sideColumn: {
    width: 306,
    gap: 14,
  },
  sideColumnStacked: {
    width: '100%',
  },
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  myStatusIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  myRing: {
    borderWidth: 2.5,
    borderRadius: 999,
    padding: 2,
  },
  myStatusText: {
    flex: 1,
    minWidth: 0,
  },
  myStatusTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  myStatusSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  viewStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 31,
    borderRadius: 16,
  },
  viewStatusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  addStatusButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  sectionCount: {
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  sectionCountText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusList: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  statusRing: {
    borderWidth: 2.2,
    borderRadius: 999,
    padding: 2.5,
  },
  statusText: {
    flex: 1,
    minWidth: 0,
  },
  statusName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  statusThumb: {
    width: 42,
    height: 42,
    borderRadius: 9,
  },
  statusTextPreview: {
    width: 42,
    height: 42,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 30,
    paddingHorizontal: 22,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 300,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    marginTop: 13,
  },
  emptyButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sideCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  },
  sideIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideHeaderText: {
    flex: 1,
  },
  sideTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  sideSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  radio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  privacyText: {
    flex: 1,
    gap: 1,
  },
  privacyLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  privacyDetail: {
    fontSize: 10,
    lineHeight: 14,
  },
  manageButton: {
    height: 32,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  manageText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 9,
  },
  tipText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15.5,
  },
  viewerSub: {
    fontSize: 10.5,
    lineHeight: 15,
    marginBottom: 10,
  },
  viewerAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerAvatar: {
    borderWidth: 2,
    borderRadius: 999,
  },
  viewerMore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  viewerMoreText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 28,
    paddingTop: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    fontSize: 10,
    textAlign: 'center',
  },
  menuList: {
    gap: 2,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 5,
    borderRadius: 8,
  },
  menuOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacySheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 11,
    padding: 12,
    marginBottom: 9,
  },
  privacySheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacySheetText: {
    flex: 1,
    gap: 2,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 10,
    padding: 11,
    marginTop: 5,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
  },
});
