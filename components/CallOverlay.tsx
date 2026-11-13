import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mic,
  MicOff,
  PhoneIncoming,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { playCallEndSound, startRingtone, stopRingtone } from '../lib/sounds';
import type { CallSession } from '../lib/types';
import { Avatar } from './Avatar';
import { Pulse } from './Motion';

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function CallOverlay({ call, onClose }: { call: CallSession; onClose: () => void }) {
  const { endCallSession } = useApp();
  const { currentUser } = useAuth();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [videoOn, setVideoOn] = useState(call.type === 'video');
  const [screenSharing, setScreenSharing] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const shareRef = useRef<View>(null);
  const streamRef = useRef<{ getTracks: () => { stop: () => void }[] } | null>(null);

  const outgoing = call.callerId === currentUser?.id;
  const peerName = outgoing ? call.calleeName : call.callerName;
  const peerAvatar = outgoing ? call.calleeAvatar : call.callerAvatar;
  const connected = call.status === 'connected';

  useEffect(() => {
    if (connected) {
      stopRingtone();
      const started = call.connectedAt ? new Date(call.connectedAt).getTime() : Date.now();
      const update = () => setSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
      update();
      const timer = setInterval(update, 1000);
      return () => clearInterval(timer);
    }
    setSeconds(0);
    if (call.status === 'calling' || call.status === 'ringing') {
      void startRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [connected, call.status, call.connectedAt]);

  useEffect(() => {
    if (call.type !== 'video' || !videoOn) return;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => undefined);
    }
  }, [call.type, videoOn, permission, requestPermission]);

  const stopScreenShare = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScreenSharing(false);
    if (Platform.OS === 'web') {
      const node = shareRef.current as unknown as HTMLElement | null;
      if (node) node.innerHTML = '';
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleScreenShare = async () => {
    if (screenSharing) {
      stopScreenShare();
      return;
    }
    if (
      Platform.OS !== 'web' ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      setScreenSharing(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      setScreenSharing(true);
      const node = shareRef.current as unknown as HTMLElement | null;
      if (node) {
        node.innerHTML = '';
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        node.appendChild(video);
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenSharing(false);
        streamRef.current = null;
      });
    } catch {
      setScreenSharing(false);
    }
  };

  const endCall = () => {
    stopScreenShare();
    stopRingtone();
    void playCallEndSound();
    void endCallSession(call.id);
    onClose();
  };

  const cameraReady = call.type === 'video' && videoOn && permission?.granted;

  const statusLabel = connected
    ? formatDuration(seconds)
    : outgoing
      ? call.status === 'ringing'
        ? 'Ringing…'
        : 'Calling…'
      : 'Connecting…';

  const hintLabel = connected
    ? call.type === 'video'
      ? 'Video connected · encrypted'
      : 'Connected · encrypted'
    : outgoing
      ? call.status === 'ringing'
        ? `${peerName} is online — waiting to answer`
        : `${peerName} is offline — still calling`
      : 'Answering…';

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={endCall}>
      <LinearGradient
        colors={
          call.type === 'video'
            ? ['#0d2b30', '#0b141a', '#0b141a']
            : ['#0f3d34', '#0b141a', '#0b141a']
        }
        style={styles.root}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <View style={styles.topLeft}>
              <View style={styles.securePill}>
                <View style={styles.secureDot} />
                <Text style={styles.secureText}>End-to-end encrypted</Text>
              </View>
              <Text style={styles.callType}>
                {call.type === 'video' ? 'Video call' : 'Voice call'}
              </Text>
            </View>
            <Pressable
              onPress={endCall}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
              accessibilityLabel="Close call"
            >
              <X color="rgba(255,255,255,0.72)" size={18} />
            </Pressable>
          </View>

          {screenSharing ? (
            <View style={styles.stage}>
              <View style={styles.sharedWindow} ref={shareRef} />
              <View style={styles.shareStrip}>
                <View style={styles.selfChip}>
                  <Avatar name="You" size={34} />
                  <Text style={styles.selfChipText}>You are presenting</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.remoteStage}>
                <LinearGradient
                  colors={['#1f3f43', '#0c181c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Pulse min={1} max={1.06} duration={connected ? 2200 : 900}>
                  <View style={styles.avatarHalo}>
                    <View style={styles.avatarHaloInner}>
                      <Avatar name={peerName} uri={peerAvatar} size={compact ? 96 : 128} />
                    </View>
                  </View>
                </Pulse>
                {connected ? <View style={styles.liveRing} /> : null}
              </View>
              <Text style={styles.name}>{peerName}</Text>
              <Text style={styles.status}>{statusLabel}</Text>
              <Text style={styles.ringing}>{hintLabel}</Text>
              {call.type === 'video' && cameraReady ? (
                <View style={styles.pip}>
                  <CameraView style={StyleSheet.absoluteFill} facing="front" />
                  <View style={styles.pipTag}>
                    <Text style={styles.pipTagText}>You</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {showPeople ? (
            <View style={[styles.peoplePanel, { width: compact ? width - 40 : 268 }]}>
              <View style={styles.peopleHeader}>
                <View style={styles.peopleTitleRow}>
                  <Users color="#ffffff" size={15} />
                  <Text style={styles.peopleTitle}>In this call</Text>
                </View>
                <Pressable onPress={() => setShowPeople(false)}>
                  <X color="rgba(255,255,255,0.7)" size={15} />
                </Pressable>
              </View>
              <View style={styles.personRow}>
                <Avatar name={currentUser?.name ?? 'You'} size={32} />
                <Text style={styles.personName}>You</Text>
                {muted ? <MicOff color="#ff7b72" size={14} /> : <Mic color="#00a884" size={14} />}
              </View>
              <View style={styles.personRow}>
                <Avatar name={peerName} uri={peerAvatar} size={32} />
                <Text style={styles.personName} numberOfLines={1}>
                  {peerName}
                </Text>
                <Mic color="#00a884" size={14} />
              </View>
            </View>
          ) : null}

          <View style={styles.controls}>
            <ControlButton
              icon={muted ? MicOff : Mic}
              label={muted ? 'Unmute' : 'Mute'}
              active={muted}
              onPress={() => setMuted((value) => !value)}
            />
            <ControlButton
              icon={videoOn ? Video : VideoOff}
              label={videoOn ? 'Camera' : 'Camera off'}
              active={videoOn}
              onPress={() => setVideoOn((value) => !value)}
            />
            <ControlButton
              icon={screenSharing ? ScreenShareOff : ScreenShare}
              label={screenSharing ? 'Stop share' : 'Share'}
              active={screenSharing}
              onPress={() => void toggleScreenShare()}
            />
            <ControlButton
              icon={speaker ? Volume2 : VolumeX}
              label={speaker ? 'Speaker' : 'Speaker off'}
              active={speaker}
              onPress={() => setSpeaker((value) => !value)}
            />
            <ControlButton
              icon={Users}
              label="People"
              active={showPeople}
              onPress={() => setShowPeople((value) => !value)}
            />
          </View>

          <View style={styles.endWrap}>
            <Pressable
              onPress={endCall}
              style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.78 }]}
              accessibilityRole="button"
              accessibilityLabel="End call"
            >
              <PhoneOff color="#ffffff" size={26} />
            </Pressable>
            <Text style={styles.endLabel}>End call</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

export function IncomingCallOverlay({
  call,
  onAccept,
  onDecline,
}: {
  call: CallSession;
  onAccept: () => void;
  onDecline: () => void;
}) {
  useEffect(() => {
    void startRingtone();
    return () => {
      stopRingtone();
    };
  }, []);

  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={onDecline}>
      <LinearGradient colors={['#0f3d34', '#0b141a']} style={styles.root}>
        <SafeAreaView style={styles.incomingSafe} edges={['top', 'bottom']}>
          <View style={styles.incomingTop}>
            <Text style={styles.incomingLabel}>
              Incoming {call.type === 'video' ? 'video' : 'voice'} call
            </Text>
            <Text style={styles.incomingFrom}>{call.callerName}</Text>
            <Text style={styles.incomingHint}>wants to connect with you</Text>
          </View>

          <Pulse min={1} max={1.08} duration={1100}>
            <View style={styles.incomingAvatar}>
              <Avatar name={call.callerName} uri={call.callerAvatar} size={128} />
            </View>
          </Pulse>

          <View style={styles.incomingActions}>
            <View style={styles.incomingActionWrap}>
              <Pressable
                onPress={onDecline}
                style={({ pressed }) => [styles.declineButton, pressed && { opacity: 0.8 }]}
                accessibilityLabel="Decline call"
              >
                <PhoneOff color="#ffffff" size={28} />
              </Pressable>
              <Text style={styles.incomingActionText}>Decline</Text>
            </View>
            <View style={styles.incomingActionWrap}>
              <Pressable
                onPress={onAccept}
                style={({ pressed }) => [styles.acceptButton, pressed && { opacity: 0.8 }]}
                accessibilityLabel="Accept call"
              >
                <PhoneIncoming color="#ffffff" size={28} />
              </Pressable>
              <Text style={styles.incomingActionText}>Accept</Text>
            </View>
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
        <Icon color={active ? '#0b141a' : '#ffffff'} size={21} />
      </Pressable>
      <Text style={styles.controlLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 20, paddingVertical: 16 },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: { gap: 6 },
  securePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  secureDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#00a884' },
  secureText: { color: 'rgba(255,255,255,0.78)', fontSize: 9, fontWeight: '600' },
  callType: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remoteStage: {
    width: '100%',
    maxWidth: 620,
    flex: 1,
    maxHeight: 360,
    backgroundColor: '#102226',
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  avatarHalo: {
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: 'rgba(0,168,132,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHaloInner: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRing: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
    borderColor: 'rgba(0,168,132,0.45)',
  },
  name: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  status: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 7,
    letterSpacing: 0.2,
  },
  ringing: { color: 'rgba(255,255,255,0.48)', fontSize: 11, marginTop: 4 },
  pip: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 118,
    height: 158,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,168,132,0.6)',
    backgroundColor: '#0b141a',
  },
  pipTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pipTagText: { color: '#ffffff', fontSize: 8.5, fontWeight: '700' },
  stage: { flex: 1, justifyContent: 'center', paddingVertical: 12, gap: 10 },
  sharedWindow: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#08131a',
    borderWidth: 1,
    borderColor: '#22343d',
    flex: 1,
    maxHeight: 520,
  },
  shareStrip: { flexDirection: 'row', justifyContent: 'center' },
  selfChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selfChipText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  peoplePanel: {
    position: 'absolute',
    right: 20,
    top: 74,
    borderRadius: 14,
    backgroundColor: '#111b21',
    borderWidth: 1,
    borderColor: '#2a3942',
    padding: 11,
    gap: 3,
    zIndex: 20,
  },
  peopleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  peopleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  peopleTitle: { color: '#ffffff', fontSize: 11.5, fontWeight: '700' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  personName: { flex: 1, color: '#d7dfe3', fontSize: 11 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
    marginTop: 8,
  },
  controlWrap: { alignItems: 'center', gap: 5, width: 64 },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  endWrap: { alignItems: 'center', gap: 6, paddingBottom: 6 },
  endButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '500' },
  incomingSafe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', padding: 28 },
  incomingTop: { alignItems: 'center', gap: 6, marginTop: 24 },
  incomingLabel: {
    color: '#7ef0d0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  incomingFrom: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 10,
    textAlign: 'center',
  },
  incomingHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  incomingAvatar: {
    width: 196,
    height: 196,
    borderRadius: 98,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,168,132,0.16)',
  },
  incomingActions: { flexDirection: 'row', gap: 64, marginBottom: 20 },
  incomingActionWrap: { alignItems: 'center', gap: 8 },
  declineButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ea4335',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingActionText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
});
