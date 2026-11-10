import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Lock,
  Megaphone,
  MoreVertical,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppShell } from '../../components/AppShell';
import { Avatar } from '../../components/Avatar';
import { Sheet } from '../../components/Sheet';
import { useApp } from '../../context/AppContext';
import { Community } from '../../lib/types';

export default function CommunitiesScreen() {
  return (
    <AppShell active="communities">
      <CommunitiesHome />
    </AppShell>
  );
}

const EXPLORE = [
  {
    id: 'photography',
    name: 'Street Photography',
    category: 'Photography',
    members: '12.4k members',
    image:
      'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    id: 'travel',
    name: 'Weekend Wanderers',
    category: 'Travel',
    members: '8.1k members',
    image:
      'https://images.pexels.com/photos/346885/pexels-photo-346885.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    id: 'technology',
    name: 'Builders & Makers',
    category: 'Technology',
    members: '21.7k members',
    image:
      'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
];

function CommunitiesHome() {
  const { theme, state, createCommunity } = useApp();
  const { width } = useWindowDimensions();
  const wide = width >= 1120;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [joinedExplore, setJoinedExplore] = useState<string[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const selected = state.communities.find((community) => community.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return state.communities;
    return state.communities.filter(
      (community) =>
        community.name.toLowerCase().includes(normalized) ||
        community.description.toLowerCase().includes(normalized),
    );
  }, [state.communities, search]);

  const totalUnread = state.communities.reduce((total, item) => total + item.unread, 0);

  const toggleMute = (id: string) => {
    setMutedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = createCommunity(
      name.trim(),
      description.trim() || 'A new community for people to connect and share updates.',
    );
    setName('');
    setDescription('');
    setCreateOpen(false);
    setSelectedId(id);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setName('');
    setDescription('');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.panel }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.text }]}>Communities</Text>
                {totalUnread > 0 ? (
                  <View style={[styles.titleBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.titleBadgeText}>{totalUnread}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Bring related groups together in one place
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => [
                  styles.newButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Plus color="#ffffff" size={17} />
                {wide ? <Text style={styles.newButtonText}>New community</Text> : null}
              </Pressable>
              <Pressable
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

          <LinearGradient
            colors={['#075e54', '#0f766e', '#00a884']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroGlowTwo} />
            <View style={styles.heroContent}>
              <View style={styles.heroIcon}>
                <Users color="#ffffff" size={25} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Your groups, in one place</Text>
                <Text style={styles.heroSubtitle}>
                  Create a community for your neighbourhood, team, or favourite hobby.
                </Text>
              </View>
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.heroButtonText}>Get started</Text>
                <ArrowRight color="#075e54" size={15} />
              </Pressable>
            </View>
          </LinearGradient>

          <View style={[styles.searchBox, { backgroundColor: theme.search }]}>
            <Search color={theme.textMuted} size={18} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search communities"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <X color={theme.textMuted} size={16} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {search ? 'Search results' : 'Your communities'}
            </Text>
            <View style={[styles.sectionCount, { backgroundColor: theme.chip }]}>
              <Text style={[styles.sectionCountText, { color: theme.textSecondary }]}>
                {filtered.length}
              </Text>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.panelAlt, borderColor: theme.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.chip }]}>
                <Users color={theme.textMuted} size={28} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {search ? 'No communities found' : 'No communities yet'}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {search
                  ? 'Try a different name or keyword.'
                  : 'Create a community and invite people to join.'}
              </Text>
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => [
                  styles.emptyButton,
                  { backgroundColor: theme.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Plus color="#ffffff" size={15} />
                <Text style={styles.emptyButtonText}>Create community</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.communityGrid}>
              {filtered.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  wide={wide}
                  muted={mutedIds.includes(community.id)}
                  onPress={() => {
                    setExpandedGroup(null);
                    setSelectedId(community.id);
                  }}
                />
              ))}
              {!search ? (
                <Pressable
                  onPress={() => setCreateOpen(true)}
                  style={({ pressed }) => [
                    styles.createCard,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.panelAlt,
                      width: wide ? '48.8%' : '100%',
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={[styles.createCardIcon, { backgroundColor: theme.chip }]}>
                    <Plus color={theme.accentDark} size={24} />
                  </View>
                  <View style={styles.createCardText}>
                    <Text style={[styles.createCardTitle, { color: theme.text }]}>
                      Create a community
                    </Text>
                    <Text style={[styles.createCardSub, { color: theme.textSecondary }]}>
                      Organise groups and share announcements
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Explore communities</Text>
            <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
              Find your people
            </Text>
          </View>

          <View style={styles.exploreGrid}>
            {EXPLORE.map((item) => {
              const joined = joinedExplore.includes(item.id);
              return (
                <ImageBackground
                  key={item.id}
                  source={{ uri: item.image }}
                  style={[styles.exploreCard, { width: wide ? '31.9%' : '100%' }]}
                  imageStyle={styles.exploreImage}
                >
                  <LinearGradient
                    colors={['rgba(11,20,26,0.05)', 'rgba(11,20,26,0.85)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.exploreTop}>
                    <View style={styles.exploreCategory}>
                      <Text style={styles.exploreCategoryText}>{item.category}</Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        setJoinedExplore((current) =>
                          current.includes(item.id)
                            ? current.filter((value) => value !== item.id)
                            : [...current, item.id],
                        )
                      }
                      style={[
                        styles.joinButton,
                        { backgroundColor: joined ? '#00a884' : 'rgba(255,255,255,0.92)' },
                      ]}
                    >
                      {joined ? (
                        <Check color="#ffffff" size={13} />
                      ) : (
                        <UserPlus color="#075e54" size={13} />
                      )}
                      <Text
                        style={[
                          styles.joinButtonText,
                          { color: joined ? '#ffffff' : '#075e54' },
                        ]}
                      >
                        {joined ? 'Joined' : 'Join'}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.exploreBottom}>
                    <Text style={styles.exploreName}>{item.name}</Text>
                    <View style={styles.exploreMeta}>
                      <Globe color="rgba(255,255,255,0.75)" size={12} />
                      <Text style={styles.exploreMembers}>{item.members}</Text>
                    </View>
                  </View>
                </ImageBackground>
              );
            })}
          </View>

          <View style={[styles.footerNote, { borderTopColor: theme.border }]}>
            <Lock color={theme.textMuted} size={14} />
            <Text style={[styles.footerText, { color: theme.textMuted }]}>
              Communities are private spaces. Only members can see their groups and announcements.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Sheet
        visible={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? 'Community'}
        subtitle={selected ? `${selected.members} members` : undefined}
        maxWidth={520}
      >
        {selected ? (
          <View>
            <View style={styles.detailHero}>
              <Avatar name={selected.name} uri={selected.avatar} size={72} group />
              <View style={styles.detailHeroText}>
                <Text style={[styles.detailName, { color: theme.text }]}>{selected.name}</Text>
                <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
                  {selected.description}
                </Text>
                <View style={styles.detailMetaRow}>
                  <Users color={theme.textMuted} size={13} />
                  <Text style={[styles.detailMeta, { color: theme.textSecondary }]}>
                    {selected.members} members · {selected.groups.length} groups
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailActions}>
              <Pressable
                onPress={() => toggleMute(selected.id)}
                style={({ pressed }) => [
                  styles.detailAction,
                  { backgroundColor: theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {mutedIds.includes(selected.id) ? (
                  <BellOff color={theme.accentDark} size={18} />
                ) : (
                  <Bell color={theme.icon} size={18} />
                )}
                <Text style={[styles.detailActionText, { color: theme.textSecondary }]}>
                  {mutedIds.includes(selected.id) ? 'Muted' : 'Mute'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => [
                  styles.detailAction,
                  { backgroundColor: theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <UserPlus color={theme.icon} size={18} />
                <Text style={[styles.detailActionText, { color: theme.textSecondary }]}>
                  Invite
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.detailAction,
                  { backgroundColor: theme.chip },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MoreVertical color={theme.icon} size={18} />
                <Text style={[styles.detailActionText, { color: theme.textSecondary }]}>
                  More
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.announcementCard,
                { backgroundColor: theme.panelAlt, borderColor: theme.border },
              ]}
            >
              <View style={[styles.announcementIcon, { backgroundColor: theme.accent }]}>
                <Megaphone color="#ffffff" size={18} />
              </View>
              <View style={styles.announcementText}>
                <Text style={[styles.announcementLabel, { color: theme.accentDark }]}>
                  ANNOUNCEMENT
                </Text>
                <Text style={[styles.announcementBody, { color: theme.text }]}>
                  {selected.announcement}
                </Text>
                <Text style={[styles.announcementTime, { color: theme.textSecondary }]}>
                  Today
                </Text>
              </View>
            </View>

            <Text style={[styles.groupsLabel, { color: theme.textMuted }]}>COMMUNITY GROUPS</Text>
            <View style={[styles.groupList, { borderColor: theme.border }]}>
              {selected.groups.map((group) => {
                const expanded = expandedGroup === group.id;
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => setExpandedGroup(expanded ? null : group.id)}
                    style={({ pressed }) => [
                      styles.groupRow,
                      { borderBottomColor: theme.border },
                      pressed && { backgroundColor: theme.panelHover },
                    ]}
                  >
                    <View style={[styles.groupIcon, { backgroundColor: theme.chip }]}>
                      <Users color={theme.accentDark} size={18} />
                    </View>
                    <View style={styles.groupText}>
                      <Text style={[styles.groupName, { color: theme.text }]}>{group.name}</Text>
                      <Text style={[styles.groupMeta, { color: theme.textSecondary }]}>
                        {expanded ? 'Community group · Tap to collapse' : `${group.members} members`}
                      </Text>
                    </View>
                    <ChevronDown
                      color={theme.textMuted}
                      size={16}
                      style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.privacyNote, { backgroundColor: theme.chip }]}>
              <Lock color={theme.textMuted} size={15} />
              <Text style={[styles.privacyNoteText, { color: theme.textSecondary }]}>
                Only community members can see groups and announcements. Admins decide who can join.
              </Text>
            </View>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={createOpen}
        onClose={closeCreate}
        title="New community"
        subtitle="Create a space for your people"
        maxWidth={460}
        footer={
          <Pressable
            onPress={handleCreate}
            disabled={!name.trim()}
            style={({ pressed }) => [
              styles.createSubmit,
              { backgroundColor: name.trim() ? theme.accent : theme.chip },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Users color={name.trim() ? '#ffffff' : theme.textMuted} size={17} />
            <Text
              style={[
                styles.createSubmitText,
                { color: name.trim() ? '#ffffff' : theme.textMuted },
              ]}
            >
              Create community
            </Text>
          </Pressable>
        }
      >
        <View style={styles.createPreview}>
          <LinearGradient
            colors={['#075e54', '#00a884']}
            style={styles.createPreviewGradient}
          >
            <View style={styles.createPreviewIcon}>
              <Users color="#ffffff" size={28} />
            </View>
            <Text style={styles.createPreviewTitle}>
              {name.trim() || 'Your community name'}
            </Text>
            <Text style={styles.createPreviewSub}>
              {description.trim() || 'A short description helps people know what to expect.'}
            </Text>
          </LinearGradient>
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Community name</Text>
        <View style={[styles.fieldBox, { backgroundColor: theme.search }]}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Sunday Runners"
            placeholderTextColor={theme.textMuted}
            style={[styles.fieldInput, { color: theme.text }]}
            autoFocus
          />
        </View>

        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Description</Text>
        <View style={[styles.fieldBox, styles.fieldArea, { backgroundColor: theme.search }]}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is this community about?"
            placeholderTextColor={theme.textMuted}
            style={[styles.fieldInput, styles.fieldAreaInput, { color: theme.text }]}
            multiline
          />
        </View>

        <View style={[styles.privacyNote, { backgroundColor: theme.chip }]}>
          <Lock color={theme.textMuted} size={15} />
          <Text style={[styles.privacyNoteText, { color: theme.textSecondary }]}>
            Your community starts with an announcements group. You can add more groups later.
          </Text>
        </View>
      </Sheet>

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="Community options" maxWidth={400}>
        <View style={styles.menuList}>
          <MenuOption
            icon={Plus}
            label="Create a community"
            onPress={() => {
              setMenuOpen(false);
              setCreateOpen(true);
            }}
          />
          <MenuOption
            icon={Globe}
            label="Explore communities"
            onPress={() => setMenuOpen(false)}
          />
          <MenuOption
            icon={BellOff}
            label="Manage notifications"
            onPress={() => setMenuOpen(false)}
          />
        </View>
      </Sheet>
    </View>
  );
}

function CommunityCard({
  community,
  wide,
  muted,
  onPress,
}: {
  community: Community;
  wide: boolean;
  muted: boolean;
  onPress: () => void;
}) {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.communityCard,
        {
          backgroundColor: theme.panelAlt,
          borderColor: theme.border,
          width: wide ? '48.8%' : '100%',
        },
        pressed && { opacity: 0.74 },
      ]}
    >
      <View style={styles.communityTop}>
        <Avatar name={community.name} uri={community.avatar} size={48} group />
        <View style={styles.communityTitleWrap}>
          <View style={styles.communityTitleRow}>
            <Text style={[styles.communityName, { color: theme.text }]} numberOfLines={1}>
              {community.name}
            </Text>
            {muted ? <BellOff color={theme.textMuted} size={13} /> : null}
          </View>
          <Text style={[styles.communityMembers, { color: theme.textSecondary }]}>
            {community.members} members · {community.groups.length} groups
          </Text>
        </View>
        {community.unread > 0 ? (
          <View style={[styles.communityBadge, { backgroundColor: theme.accent }]}>
            <Text style={styles.communityBadgeText}>{community.unread}</Text>
          </View>
        ) : (
          <ChevronRight color={theme.textMuted} size={17} />
        )}
      </View>

      <Text style={[styles.communityDescription, { color: theme.textSecondary }]} numberOfLines={2}>
        {community.description}
      </Text>

      <View style={[styles.announcementSnippet, { backgroundColor: theme.panel }]}>
        <Megaphone color={theme.accentDark} size={14} />
        <Text
          style={[styles.announcementSnippetText, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {community.announcement}
        </Text>
      </View>

      <View style={styles.communityFooter}>
        <View style={styles.communityGroupIcons}>
          {community.groups.slice(0, 3).map((group, index) => (
            <View
              key={group.id}
              style={[
                styles.communityGroupIcon,
                {
                  backgroundColor: theme.chip,
                  borderColor: theme.panelAlt,
                  marginLeft: index === 0 ? 0 : -7,
                },
              ]}
            >
              <Users color={theme.textSecondary} size={11} />
            </View>
          ))}
        </View>
        <Text style={[styles.communityFooterText, { color: theme.textMuted }]}>
          {community.groups.length} groups · Announcements
        </Text>
      </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  titleBadge: {
    minWidth: 20,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
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
  heroBanner: {
    borderRadius: 18,
    overflow: 'hidden',
    padding: 22,
    marginBottom: 18,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -160,
    right: -80,
  },
  heroGlowTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: -100,
    left: 60,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  heroButtonText: {
    color: '#075e54',
    fontSize: 11.5,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 13,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 21,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
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
  sectionHint: {
    marginLeft: 'auto',
    fontSize: 11,
  },
  communityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  communityCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 15,
  },
  communityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  communityTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  communityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityName: {
    fontSize: 14.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  communityMembers: {
    fontSize: 10.5,
    marginTop: 2,
  },
  communityBadge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  communityBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  communityDescription: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 10,
    minHeight: 34,
  },
  announcementSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  announcementSnippetText: {
    flex: 1,
    fontSize: 10.5,
  },
  communityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 11,
  },
  communityGroupIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  communityGroupIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityFooterText: {
    fontSize: 9.5,
  },
  createCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 92,
  },
  createCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCardText: {
    flex: 1,
  },
  createCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  createCardSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 34,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
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
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 17,
    marginTop: 14,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exploreCard: {
    height: 166,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 13,
  },
  exploreImage: {
    borderRadius: 15,
  },
  exploreTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exploreCategory: {
    backgroundColor: 'rgba(11,20,26,0.38)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  exploreCategoryText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 9,
  },
  joinButtonText: {
    fontSize: 10,
    fontWeight: '800',
  },
  exploreBottom: {
    gap: 2,
  },
  exploreName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  exploreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exploreMembers: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9.5,
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
  detailHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailHeroText: {
    flex: 1,
    minWidth: 0,
  },
  detailName: {
    fontSize: 17,
    fontWeight: '700',
  },
  detailDescription: {
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 3,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  detailMeta: {
    fontSize: 10.5,
  },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 18,
  },
  detailAction: {
    flex: 1,
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 9,
    gap: 4,
  },
  detailActionText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  announcementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  announcementIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementText: {
    flex: 1,
    gap: 3,
  },
  announcementLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  announcementBody: {
    fontSize: 11.5,
    lineHeight: 17,
  },
  announcementTime: {
    fontSize: 9,
  },
  groupsLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 7,
  },
  groupList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 11,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupText: {
    flex: 1,
  },
  groupName: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  groupMeta: {
    fontSize: 10,
    marginTop: 2,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14.5,
  },
  createPreview: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  createPreviewGradient: {
    padding: 20,
    alignItems: 'center',
  },
  createPreviewIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  createPreviewTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  createPreviewSub: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 3,
    maxWidth: 280,
    lineHeight: 15,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 9,
  },
  fieldBox: {
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 43,
    justifyContent: 'center',
  },
  fieldInput: {
    fontSize: 13.5,
  },
  fieldArea: {
    height: 82,
    paddingVertical: 9,
    justifyContent: 'flex-start',
  },
  fieldAreaInput: {
    height: 64,
    textAlignVertical: 'top',
  },
  createSubmit: {
    height: 43,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  createSubmitText: {
    fontSize: 13.5,
    fontWeight: '700',
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
});
