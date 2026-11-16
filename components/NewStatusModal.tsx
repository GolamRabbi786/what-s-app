import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Type,
  Video as VideoIcon,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { fileToDataUri } from '../lib/media';
import { STATUS_COLORS } from '../lib/theme';
import { Sheet } from './Sheet';

interface NewStatusModalProps {
  visible: boolean;
  onClose: () => void;
}

type StatusMode = 'text' | 'photo' | 'video';

const MAX_PHOTO_CHARS = 2_900_000;
const MAX_VIDEO_CHARS = 5_900_000;

export function NewStatusModal({ visible, onClose }: NewStatusModalProps) {
  const { theme, addStatus } = useApp();
  const [mode, setMode] = useState<StatusMode>('text');
  const [caption, setCaption] = useState('');
  const [background, setBackground] = useState(STATUS_COLORS[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState(false);

  const modePulse = useRef(new Animated.Value(0)).current;
  const busySpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setMode('text');
    setCaption('');
    setBackground(STATUS_COLORS[0]);
    setPhoto(null);
    setVideo(null);
    setVideoSeconds(0);
    setBusy(false);
    setPosted(false);
    modePulse.setValue(0);
    Animated.timing(modePulse, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  }, [visible, modePulse]);

  useEffect(() => {
    Animated.timing(modePulse, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [mode, modePulse]);

  useEffect(() => {
    if (!busy) {
      busySpin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(busySpin, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(busySpin, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [busy, busySpin]);

  const switchMode = (next: StatusMode) => {
    if (busy || next === mode) return;
    modePulse.setValue(0);
    setMode(next);
  };

  const pickPhoto = async (fromCamera: boolean) => {
    try {
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          fromCamera
            ? 'Allow camera access to take a status photo.'
            : 'Allow photo access to share a status photo.',
        );
        return;
      }
      setBusy(true);
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
      if (result.canceled || !result.assets?.length) {
        setBusy(false);
        return;
      }
      const asset = result.assets[0];
      let dataUri = '';
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          asset.width && asset.width > 1280 ? [{ resize: { width: 1280 } }] : [],
          {
            compress: 0.65,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );
        dataUri = manipulated.base64
          ? `data:image/jpeg;base64,${manipulated.base64}`
          : manipulated.uri;
      } catch {
        dataUri = asset.base64
          ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
          : asset.uri;
      }
      if (!dataUri) {
        setBusy(false);
        return;
      }
      if (dataUri.length > MAX_PHOTO_CHARS) {
        setBusy(false);
        Alert.alert(
          'Photo is too large',
          'Please pick a smaller photo for your status.',
        );
        return;
      }
      setVideo(null);
      setPhoto(dataUri);
      modePulse.setValue(0);
      setMode('photo');
      setBusy(false);
    } catch (error) {
      setBusy(false);
      Alert.alert(
        'Unable to pick photo',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const pickVideo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Allow photo access to share a status video.');
        return;
      }
      setBusy(true);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (result.canceled || !result.assets?.length) {
        setBusy(false);
        return;
      }
      const asset = result.assets[0];
      const media = await fileToDataUri(asset.uri, 'video/mp4');
      if (!media) {
        setBusy(false);
        Alert.alert('Unable to attach video', 'The video could not be read. Please try another clip.');
        return;
      }
      if (media.length > MAX_VIDEO_CHARS) {
        setBusy(false);
        Alert.alert(
          'Video is too large',
          'Please pick a shorter clip (under about 4 MB) for your status.',
        );
        return;
      }
      setPhoto(null);
      setVideo(media);
      setVideoSeconds(asset.duration ? Math.max(3, Math.min(60, Math.round(asset.duration))) : 10);
      modePulse.setValue(0);
      setMode('video');
      setBusy(false);
    } catch (error) {
      setBusy(false);
      Alert.alert(
        'Unable to pick video',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  const canShare =
    !busy &&
    !posted &&
    (mode === 'text'
      ? caption.trim().length > 0
      : mode === 'photo'
        ? Boolean(photo)
        : Boolean(video));

  const share = () => {
    if (!canShare) return;
    setBusy(true);
    addStatus({
      caption: caption.trim(),
      background,
      image: mode === 'photo' && photo ? photo : undefined,
      video: mode === 'video' && video ? video : undefined,
      duration: mode === 'video' ? videoSeconds || 10 : undefined,
    });
    setPosted(true);
    setBusy(false);
    setCaption('');
    setPhoto(null);
    setVideo(null);
    setMode('text');
    onClose();
  };

  const close = () => {
    if (busy) return;
    onClose();
  };

  const modes: { key: StatusMode; label: string; icon: typeof Type }[] = [
    { key: 'text', label: 'Text', icon: Type },
    { key: 'photo', label: 'Photo', icon: ImageIcon },
    { key: 'video', label: 'Video', icon: VideoIcon },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="New status"
      subtitle="Your update disappears after 24 hours"
      maxWidth={470}
      footer={
        <Pressable
          onPress={share}
          disabled={!canShare}
          style={({ pressed }) => [
            styles.shareButton,
            { backgroundColor: canShare ? theme.accent : theme.chip },
            posted && { backgroundColor: theme.chipActive },
            pressed && { opacity: 0.8 },
          ]}
        >
          {busy ? (
            <Animated.View style={{ opacity: busySpin }}>
              <Loader2 color={theme.textMuted} size={17} />
            </Animated.View>
          ) : posted ? (
            <Check color={theme.accentDark} size={17} />
          ) : (
            <Send color={canShare ? '#ffffff' : theme.textMuted} size={17} />
          )}
          <Text
            style={[
              styles.shareText,
              { color: canShare ? '#ffffff' : posted ? theme.accentDark : theme.textMuted },
            ]}
          >
            {busy ? 'Sharing…' : posted ? 'Status shared' : 'Share status'}
          </Text>
        </Pressable>
      }
    >
      <View style={styles.modeRow}>
        {modes.map((entry) => {
          const active = mode === entry.key;
          const Icon = entry.icon;
          return (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityLabel={`${entry.label} status`}
              onPress={() => switchMode(entry.key)}
              style={({ pressed }) => [
                styles.modeTab,
                {
                  backgroundColor: active ? theme.accent : theme.chip,
                  borderColor: active ? theme.accent : 'transparent',
                },
                pressed && { opacity: 0.78 },
              ]}
            >
              <Icon color={active ? '#ffffff' : theme.icon} size={16} />
              <Text style={[styles.modeTabText, { color: active ? '#ffffff' : theme.textSecondary }]}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.preview,
          {
            backgroundColor: mode === 'text' ? background : '#0b141a',
            borderColor: theme.border,
            opacity: modePulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }),
            transform: [
              {
                scale: modePulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
              },
            ],
          },
        ]}
      >
        {mode === 'photo' && photo ? (
          <>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.photoShade} />
            <Pressable
              onPress={() => setPhoto(null)}
              style={styles.removeMedia}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <X color="#ffffff" size={15} />
            </Pressable>
          </>
        ) : mode === 'video' && video ? (
          <StatusVideoPreview uri={video} onRemove={() => setVideo(null)} />
        ) : mode === 'photo' || mode === 'video' ? (
          <View style={styles.mediaPlaceholder}>
            {mode === 'photo' ? (
              <ImageIcon color="rgba(255,255,255,0.65)" size={34} />
            ) : (
              <VideoIcon color="rgba(255,255,255,0.65)" size={34} />
            )}
            <Text style={styles.mediaPlaceholderText}>
              {mode === 'photo' ? 'Pick a photo below' : 'Pick a video below'}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.previewGlowOne} />
            <View style={styles.previewGlowTwo} />
          </>
        )}

        {mode === 'text' ? (
          <>
            <View style={styles.previewTop}>
              <View style={styles.previewBadge}>
                <Sparkles color="#ffffff" size={12} />
                <Text style={styles.previewBadgeText}>STATUS PREVIEW</Text>
              </View>
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Type a status…"
              placeholderTextColor="rgba(255,255,255,0.65)"
              multiline
              maxLength={160}
              style={styles.previewInput}
            />
            <Text style={styles.captionCount}>{caption.length}/160</Text>
          </>
        ) : null}
      </Animated.View>

      {mode !== 'text' ? (
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Add a caption… (optional)"
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={160}
          style={[styles.captionInput, { backgroundColor: theme.search, color: theme.text }]}
        />
      ) : null}

      {mode === 'text' ? (
        <>
          <View style={styles.optionHeader}>
            <Type color={theme.icon} size={16} />
            <Text style={[styles.optionTitle, { color: theme.text }]}>Background</Text>
          </View>
          <View style={styles.colorRow}>
            {STATUS_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => {
                  setBackground(color);
                  setPhoto(null);
                  setVideo(null);
                }}
                style={[
                  styles.colorDot,
                  {
                    backgroundColor: color,
                    borderColor: background === color && !photo && !video ? theme.accent : 'transparent',
                  },
                ]}
              >
                {background === color && !photo && !video ? (
                  <Check color="#ffffff" size={14} strokeWidth={3} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {mode === 'photo' ? (
        <>
          <View style={styles.optionHeader}>
            <ImageIcon color={theme.icon} size={16} />
            <Text style={[styles.optionTitle, { color: theme.text }]}>Choose a photo</Text>
          </View>
          <View style={styles.sourceRow}>
            <Pressable
              onPress={() => void pickPhoto(false)}
              disabled={busy}
              style={({ pressed }) => [
                styles.sourceButton,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.7 },
              ]}
            >
              <ImageIcon color={theme.accentDark} size={18} />
              <Text style={[styles.sourceText, { color: theme.text }]}>Gallery</Text>
            </Pressable>
            <Pressable
              onPress={() => void pickPhoto(true)}
              disabled={busy}
              style={({ pressed }) => [
                styles.sourceButton,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Camera color={theme.accentDark} size={18} />
              <Text style={[styles.sourceText, { color: theme.text }]}>Camera</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {mode === 'video' ? (
        <>
          <View style={styles.optionHeader}>
            <VideoIcon color={theme.icon} size={16} />
            <Text style={[styles.optionTitle, { color: theme.text }]}>Choose a video</Text>
          </View>
          <View style={styles.sourceRow}>
            <Pressable
              onPress={() => void pickVideo()}
              disabled={busy}
              style={({ pressed }) => [
                styles.sourceButton,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.7 },
              ]}
            >
              <VideoIcon color={theme.accentDark} size={18} />
              <Text style={[styles.sourceText, { color: theme.text }]}>Pick video</Text>
            </Pressable>
            {video ? (
              <Text style={[styles.videoMeta, { color: theme.textMuted }]}>
                {videoSeconds}s clip selected
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function StatusVideoPreview({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    player.play();
    return () => {
      try {
        player.pause();
      } catch {
        // Player may already be released.
      }
    };
  }, [player]);

  return (
    <>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.photoShade} />
      <Pressable
        onPress={onRemove}
        style={styles.removeMedia}
        accessibilityRole="button"
        accessibilityLabel="Remove video"
      >
        <X color="#ffffff" size={15} />
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 2,
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  preview: {
    height: 270,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewGlowOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -100,
    right: -80,
  },
  previewGlowTwo: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0,0,0,0.08)',
    bottom: -100,
    left: -50,
  },
  previewTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.26)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  previewBadgeText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  removeMedia: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  previewInput: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 29,
    paddingHorizontal: 6,
    maxHeight: 150,
  },
  captionCount: {
    position: 'absolute',
    bottom: 13,
    right: 16,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 9.5,
  },
  photoShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,20,26,0.24)',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mediaPlaceholderText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  captionInput: {
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 12,
    maxHeight: 90,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    marginBottom: 9,
  },
  optionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 9,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  videoMeta: {
    fontSize: 11.5,
  },
  shareButton: {
    height: 43,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  shareText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
