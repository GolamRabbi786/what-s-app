import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image as ImageIcon, Send, Sparkles, Type, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { STATUS_COLORS } from '../lib/theme';
import { Sheet } from './Sheet';

interface NewStatusModalProps {
  visible: boolean;
  onClose: () => void;
}

const PHOTOS = [
  'https://images.pexels.com/photos/189349/pexels-photo-189349.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?auto=compress&cs=tinysrgb&w=800',
];

export function NewStatusModal({ visible, onClose }: NewStatusModalProps) {
  const { theme, addStatus } = useApp();
  const [caption, setCaption] = useState('');
  const [background, setBackground] = useState(STATUS_COLORS[0]);
  const [photo, setPhoto] = useState<string | null>(null);

  const reset = () => {
    setCaption('');
    setBackground(STATUS_COLORS[0]);
    setPhoto(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const share = () => {
    if (!caption.trim()) return;
    addStatus({ caption: caption.trim(), background, image: photo ?? undefined });
    reset();
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="New status"
      subtitle="Your update disappears after 24 hours"
      maxWidth={460}
      footer={
        <Pressable
          onPress={share}
          disabled={!caption.trim()}
          style={({ pressed }) => [
            styles.shareButton,
            { backgroundColor: caption.trim() ? theme.accent : theme.chip },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Send color={caption.trim() ? '#ffffff' : theme.textMuted} size={17} />
          <Text
            style={[
              styles.shareText,
              { color: caption.trim() ? '#ffffff' : theme.textMuted },
            ]}
          >
            Share status
          </Text>
        </Pressable>
      }
    >
      <View
        style={[
          styles.preview,
          {
            backgroundColor: photo ? '#0b141a' : background,
            borderColor: theme.border,
          },
        ]}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={styles.photoShade} />
          </>
        ) : (
          <>
            <View style={styles.previewGlowOne} />
            <View style={styles.previewGlowTwo} />
          </>
        )}

        <View style={styles.previewTop}>
          <View style={styles.previewBadge}>
            <Sparkles color="#ffffff" size={12} />
            <Text style={styles.previewBadgeText}>STATUS PREVIEW</Text>
          </View>
          {photo ? (
            <Pressable
              onPress={() => setPhoto(null)}
              style={styles.removePhoto}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <X color="#ffffff" size={15} />
            </Pressable>
          ) : null}
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
      </View>

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
            }}
            style={[
              styles.colorDot,
              {
                backgroundColor: color,
                borderColor:
                  !photo && background === color ? theme.accent : 'transparent',
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.optionHeader}>
        <ImageIcon color={theme.icon} size={16} />
        <Text style={[styles.optionTitle, { color: theme.text }]}>Use a photo</Text>
      </View>
      <View style={styles.photoRow}>
        {PHOTOS.map((uri) => (
          <Pressable
            key={uri}
            onPress={() => setPhoto(uri)}
            style={[
              styles.photoOption,
              {
                borderColor: photo === uri ? theme.accent : 'transparent',
              },
            ]}
          >
            <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
  removePhoto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoOption: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
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
