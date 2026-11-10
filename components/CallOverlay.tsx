import { LinearGradient } from 'expo-linear-gradient';
import {
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Avatar } from './Avatar';

interface CallOverlayProps {
  visible: boolean;
  contactId: string;
  name: string;
  avatar?: string;
  type: 'voice' | 'video';
  onClose: () => void;
}

function formatCallTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CallOverlay({
  visible,
  contactId,
  name,
  avatar,
  type,
  onClose,
}: CallOverlayProps) {
  const { addCall } = useApp();
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [videoOn, setVideoOn] = useState(type === 'video');

  useEffect(() => {
    if (!visible) return;
    setSeconds(0);
    setConnected(false);
    setMuted(false);
    setSpeaker(false);
    setVideoOn(type === 'video');
    const connectTimer = setTimeout(() => setConnected(true), 2200);
    const interval = setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    return () => {
      clearTimeout(connectTimer);
      clearInterval(interval);
    };
  }, [visible, contactId, type]);

  const endCall = () => {
    addCall({
      id: `call-${Date.now()}`,
      contactId,
      name,
      avatar,
      direction: 'outgoing',
      type,
      at: new Date().toISOString(),
      duration: connected ? formatCallTime(seconds) : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={endCall}>
      <LinearGradient
        colors={type === 'video' ? ['#123c43', '#0b141a', '#0b141a'] : ['#0f3d34', '#0b141a', '#0b141a']}
        style={styles.root}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <View style={styles.securePill}>
              <Lock color="rgba(255,255,255,0.8)" size={11} />
              <Text style={styles.secureText}>End-to-end encrypted</Text>
            </View>
            <Text style={styles.callType}>{type === 'video' ? 'Video call' : 'Voice call'}</Text>
          </View>

          <View style={styles.center}>
            <View style={styles.avatarHalo}>
              <View style={styles.avatarHaloInner}>
                <Avatar name={name} uri={avatar} size={116} />
              </View>
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.status}>
              {connected ? formatCallTime(seconds) : 'Calling…'}
            </Text>
            <Text style={styles.ringing}>
              {connected ? 'Connected' : 'Ringing on WhatsApp'}
            </Text>
          </View>

          <View style={styles.controls}>
            <ControlButton
              icon={muted ? MicOff : Mic}
              label={muted ? 'Unmute' : 'Mute'}
              active={muted}
              onPress={() => setMuted((value) => !value)}
            />
            <ControlButton
              icon={videoOn ? Video : VideoOff}
              label={videoOn ? 'Camera on' : 'Camera off'}
              active={videoOn}
              onPress={() => setVideoOn((value) => !value)}
            />
            <ControlButton
              icon={speaker ? Volume2 : VolumeX}
              label={speaker ? 'Speaker on' : 'Speaker'}
              active={speaker}
              onPress={() => setSpeaker((value) => !value)}
            />
          </View>

          <View style={styles.endWrap}>
            <Pressable
              onPress={endCall}
              style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.78 }]}
              accessibilityRole="button"
              accessibilityLabel="End call"
            >
              <PhoneOff color="#ffffff" size={27} />
            </Pressable>
            <Text style={styles.endLabel}>End call</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

function ControlButton({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.controlWrap}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.controlButton,
          { backgroundColor: active ? '#ffffff' : 'rgba(255,255,255,0.14)' },
          pressed && { opacity: 0.74 },
        ]}
      >
        <Icon color={active ? '#0b141a' : '#ffffff'} size={22} />
      </Pressable>
      <Text style={styles.controlLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 22,
  },
  top: {
    alignItems: 'center',
    gap: 8,
  },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  secureText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 9.5,
    fontWeight: '600',
  },
  callType: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHalo: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(0,168,132,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  avatarHaloInner: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  status: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.2,
  },
  ringing: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11.5,
    marginTop: 5,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 28,
  },
  controlWrap: {
    alignItems: 'center',
    gap: 7,
    width: 74,
  },
  controlButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.66)',
    fontSize: 9.5,
    fontWeight: '500',
  },
  endWrap: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  endButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea4335',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
  },
  endLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10.5,
    fontWeight: '500',
  },
});
