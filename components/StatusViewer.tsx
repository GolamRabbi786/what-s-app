import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Pause, Play, Send, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';

interface StatusViewerProps {
  visible: boolean;
  statusId: string | null;
  onClose: () => void;
}

export function StatusViewer({ visible, statusId, onClose }: StatusViewerProps) {
  const { state, theme, markStatusViewed, sendMessage } = useApp();
  const { width, height } = useWindowDimensions();
  const groups = state.statuses;
  const [groupIndex, setGroupIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState('');

  const group = groups[groupIndex];
  const item = group?.items[itemIndex];

  useEffect(() => {
    if (!visible) return;
    const target = groups.findIndex((entry) => entry.id === statusId);
    setGroupIndex(target >= 0 ? target : 0);
    setItemIndex(0);
    setProgress(0);
    setPaused(false);
    setReply('');
  }, [visible, statusId]);

  useEffect(() => {
    if (!visible || !group || !item) return;
    markStatusViewed(group.id);
    setProgress(0);
    if (paused) return;

    const duration = Math.max(2, item.duration) * 1000;
    const started = Date.now();
    const timer = setInterval(() => {
      const next = Math.min(1, (Date.now() - started) / duration);
      setProgress(next);
      if (next >= 1) {
        clearInterval(timer);
        advance(1);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [visible, groupIndex, itemIndex, paused]);

  const advance = (direction: 1 | -1) => {
    if (!group) return;
    if (direction === 1) {
      if (itemIndex < group.items.length - 1) {
        setItemIndex(itemIndex + 1);
        setProgress(0);
      } else if (groupIndex < groups.length - 1) {
        setGroupIndex(groupIndex + 1);
        setItemIndex(0);
        setProgress(0);
      } else {
        onClose();
      }
    } else if (itemIndex > 0) {
      setItemIndex(itemIndex - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const previous = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setItemIndex(Math.max(0, previous.items.length - 1));
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const linkedChat = useMemo(() => {
    if (!group || group.id === 'my-status') return undefined;
    return (
      state.chats.find((chat) => chat.name === group.name) ??
      state.chats.find((chat) => group.id.startsWith(`${chat.id}-`)) ??
      state.chats.find((chat) => group.id.includes(chat.id))
    );
  }, [group, state.chats]);

  const wide = width >= 700;
  const cardWidth = Math.min(width - (wide ? 48 : 0), 520);
  const cardHeight = Math.min(height - (wide ? 60 : 0), 800);

  const handleReply = () => {
    if (!reply.trim() || !linkedChat || !group) return;
    sendMessage(linkedChat.id, reply.trim());
    setReply('');
    onClose();
  };

  if (!visible || !group || !item) {
    return null;
  }

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop} edges={['top', 'bottom', 'left', 'right']}>
        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              height: cardHeight,
              borderRadius: wide ? 20 : 0,
            },
          ]}
        >
          {item.type === 'image' && item.image ? (
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: item.background ?? '#1a6b5c' },
              ]}
            >
              <View style={styles.textStatusGlowOne} />
              <View style={styles.textStatusGlowTwo} />
            </View>
          )}
          <LinearGradient
            colors={['rgba(11,20,26,0.55)', 'rgba(11,20,26,0.06)', 'rgba(11,20,26,0.7)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.topLayer}>
            <View style={styles.progressRow}>
              {group.items.map((entry, index) => {
                const fill =
                  index < itemIndex ? 1 : index === itemIndex ? progress : 0;
                return (
                  <View key={entry.id} style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(fill * 100)}%` as `${number}%` },
                      ]}
                    />
                  </View>
                );
              })}
            </View>

            <View style={styles.headerRow}>
              <Avatar name={group.name} uri={group.avatar} size={36} />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>{group.name}</Text>
                <Text style={styles.headerTime}>{group.time}</Text>
              </View>
              <Pressable
                onPress={() => setPaused((value) => !value)}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel={paused ? 'Play status' : 'Pause status'}
              >
                {paused ? <Play color="#ffffff" size={17} fill="#ffffff" /> : <Pause color="#ffffff" size={17} fill="#ffffff" />}
              </Pressable>
              <Pressable
                onPress={onClose}
                style={styles.headerButton}
                accessibilityRole="button"
                accessibilityLabel="Close status"
              >
                <X color="#ffffff" size={21} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.tapLeft}
            onPress={() => advance(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous status"
          />
          <Pressable
            style={styles.tapRight}
            onPress={() => advance(1)}
            accessibilityRole="button"
            accessibilityLabel="Next status"
          />

          <View pointerEvents="none" style={styles.stage}>
            {item.type === 'text' ? (
              <Text style={styles.textStatus}>{item.caption}</Text>
            ) : item.caption ? (
              <View style={styles.captionWrap}>
                <Text style={styles.caption}>{item.caption}</Text>
              </View>
            ) : null}
          </View>

          {wide ? (
            <>
              <View style={styles.chevronLeft} pointerEvents="none">
                <ChevronLeft color="rgba(255,255,255,0.75)" size={22} />
              </View>
              <View style={styles.chevronRight} pointerEvents="none">
                <ChevronRight color="rgba(255,255,255,0.75)" size={22} />
              </View>
            </>
          ) : null}

          {linkedChat ? (
            <View style={styles.replyBar}>
              <View style={styles.replyInputWrap}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder={`Reply to ${group.name.split(' ')[0]}…`}
                  placeholderTextColor="rgba(255,255,255,0.62)"
                  style={styles.replyInput}
                  onSubmitEditing={handleReply}
                  returnKeyType="send"
                />
              </View>
              <Pressable
                onPress={handleReply}
                disabled={!reply.trim()}
                style={[
                  styles.replySend,
                  { backgroundColor: reply.trim() ? theme.accent : 'rgba(255,255,255,0.16)' },
                ]}
              >
                <Send color="#ffffff" size={18} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#0b141a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    overflow: 'hidden',
    backgroundColor: '#111b21',
  },
  textStatusGlowOne: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -110,
    right: -120,
  },
  textStatusGlowTwo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0,0,0,0.1)',
    bottom: -100,
    left: -90,
  },
  topLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingTop: 10,
    zIndex: 4,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
  headerTime: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10.5,
    marginTop: 1,
  },
  headerButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  tapLeft: {
    position: 'absolute',
    top: 90,
    bottom: 80,
    left: 0,
    width: '42%',
    zIndex: 2,
  },
  tapRight: {
    position: 'absolute',
    top: 90,
    bottom: 80,
    right: 0,
    width: '58%',
    zIndex: 2,
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    paddingVertical: 110,
  },
  textStatus: {
    color: '#ffffff',
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  captionWrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 78,
    backgroundColor: 'rgba(11,20,26,0.45)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  caption: {
    color: '#ffffff',
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
    fontWeight: '500',
  },
  chevronLeft: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: [{ translateY: -14 }],
    opacity: 0.7,
  },
  chevronRight: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -14 }],
    opacity: 0.7,
  },
  replyBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 5,
  },
  replyInputWrap: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  replyInput: {
    color: '#ffffff',
    fontSize: 13,
  },
  replySend: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
