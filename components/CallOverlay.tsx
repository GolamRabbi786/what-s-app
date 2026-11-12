import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mic,
  MicOff,
  MonitorUp,
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
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { playCallEndSound, startRingtone, stopRingtone } from '../lib/sounds';
import { CallParticipant } from '../lib/types';
import { Avatar } from './Avatar';

interface CallOverlayProps {
  visible: boolean;
  contactId: string;
  name: string;
  avatar?: string;
  type: 'voice' | 'video';
  participants?: CallParticipant[];
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
  participants = [],
  onClose,
}: CallOverlayProps) {
  const { addCall } = useApp();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [videoOn, setVideoOn] = useState(type === 'video');
  const [screenSharing, setScreenSharing] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const remotes: CallParticipant[] =
    participants.length > 0 ? participants : [{ id: contactId, name, avatar }];
  const isGroup = remotes.length > 1;

  useEffect(() => {
    if (!visible) return;
    setSeconds(0);
    setConnected(false);
    setMuted(false);
    setSpeaker(false);
    setVideoOn(type === 'video');
    setScreenSharing(false);
    setShowPeople(false);
    void startRingtone();
    const connectTimer = setTimeout(() => {
      stopRingtone();
      setConnected(true);
    }, 2100);
    const interval = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      stopRingtone();
      clearTimeout(connectTimer);
      clearInterval(interval);
    };
  }, [visible, contactId, type]);

  useEffect(() => {
    if (!visible || type !== 'video' || !videoOn) return;
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission().catch(() => undefined);
    }
  }, [visible, type, videoOn, permission, requestPermission]);

  const endCall = () => {
    stopRingtone();
    void playCallEndSound();
    addCall({
      id: `call-${Date.now()}`,
      contactId,
      name: isGroup ? `${name} · ${remotes.length + 1} people` : name,
      avatar,
      direction: 'outgoing',
      type,
      at: new Date().toISOString(),
      duration: connected ? formatCallTime(seconds) : undefined,
    });
    onClose();
  };

  const cameraReady = type === 'video' && videoOn && permission?.granted;

  const callLabel = isGroup
    ? `Group ${type} call · ${remotes.length + 1} participants`
    : `${type === 'video' ? 'Video' : 'Voice'} call`;

  const selfTile = (
    <View
      key="self"
      style={[
        styles.tile,
        { borderColor: 'rgba(0,168,132,0.55)' },
      ]}
    >
      {cameraReady ? (
        <CameraView style={StyleSheet.absoluteFill} facing="front" />
      ) : (
        <LinearGradient
          colors={['#1c3a3a', '#0e1c1f']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {!cameraReady ? (
        <View style={styles.tileCenter}>
          <Avatar name="You" size={compact ? 52 : 64} />
          <Text style={styles.tileNameSmall}>Camera off</Text>
        </View>
      ) : null}
      <View style={styles.tileFooter}>
        <View style={styles.tileTag}>
          <Text style={styles.tileTagText}>You</Text>
        </View>
        <View style={[styles.tileMic, { backgroundColor: muted ? '#ea4335' : 'rgba(0,0,0,0.45)' }]}>
          {muted ? <MicOff color="#ffffff" size={11} /> : <Mic color="#ffffff" size={11} />}
        </View>
      </View>
    </View>
  );

  const remoteTile = (participant: CallParticipant, index: number) => (
    <View
      key={participant.id}
      style={[
        styles.tile,
        { borderColor: index === 0 && connected ? 'rgba(0,168,132,0.7)' : 'rgba(255,255,255,0.08)' },
      ]}
    >
      <LinearGradient
        colors={
          index % 3 === 0
            ? ['#1f3f43', '#0c181c']
            : index % 3 === 1
              ? ['#26354a', '#0c141c']
              : ['#3a2f42', '#121018']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tileCenter}>
        <View style={styles.tileAvatarRing}>
          <Avatar name={participant.name} uri={participant.avatar} size={compact ? 52 : 66} />
        </View>
        <Text style={styles.tileNameSmall} numberOfLines={1}>
          {participant.name}
        </Text>
      </View>
      <View style={styles.tileFooter}>
        <View style={styles.tileTag}>
          <Text style={styles.tileTagText} numberOfLines={1}>
            {participant.name.split(' ')[0]}
          </Text>
        </View>
        <View style={styles.tileMic}>
          {participant.muted ? (
            <MicOff color="#ffffff" size={11} />
          ) : (
            <Mic color="#ffffff" size={11} />
          )}
        </View>
      </View>
      {index === 0 && connected ? (
        <View style={styles.speakingBadge}>
          <View style={styles.speakingDot} />
          <Text style={styles.speakingText}>Speaking</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="fade" onRequestClose={endCall}>
      <LinearGradient
        colors={type === 'video' ? ['#0d2b30', '#0b141a', '#0b141a'] : ['#0f3d34', '#0b141a', '#0b141a']}
        style={styles.root}
      >
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.top}>
            <View style={styles.topLeft}>
              <View style={styles.securePill}>
                <View style={styles.secureDot} />
                <Text style={styles.secureText}>End-to-end encrypted</Text>
              </View>
              <Text style={styles.callType}>{callLabel}</Text>
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
              <View style={styles.sharedWindow}>
                <View style={styles.windowBar}>
                  <View style={styles.windowDots}>
                    <View style={[styles.windowDot, { backgroundColor: '#ff5f57' }]} />
                    <View style={[styles.windowDot, { backgroundColor: '#febc2e' }]} />
                    <View style={[styles.windowDot, { backgroundColor: '#28c840' }]} />
                  </View>
                  <Text style={styles.windowTitle}>Q4 roadmap — design review</Text>
                  <View style={styles.liveSharePill}>
                    <View style={styles.liveShareDot} />
                    <Text style={styles.liveShareText}>LIVE</Text>
                  </View>
                </View>
                <View style={styles.deck}>
                  <Text style={styles.deckEyebrow}>WHATSAPP · PRODUCT</Text>
                  <Text style={styles.deckTitle}>Q4 Roadmap</Text>
                  <Text style={styles.deckSub}>Design systems, communities & calling</Text>
                  <View style={styles.deckCards}>
                    {[
                      { label: 'Design system', value: '86%', tint: '#00a884' },
                      { label: 'Community', value: '64%', tint: '#5b6cff' },
                      { label: 'Calling', value: '72%', tint: '#f2994a' },
                    ].map((item) => (
                      <View key={item.label} style={styles.deckCard}>
                        <Text style={styles.deckCardLabel}>{item.label}</Text>
                        <Text style={styles.deckCardValue}>{item.value}</Text>
                        <View style={styles.deckTrack}>
                          <View
                            style={[
                              styles.deckFill,
                              { width: item.value as `${number}%`, backgroundColor: item.tint },
                            ]}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                  <View style={styles.deckFooterRow}>
                    <Text style={styles.deckFooter}>Shared from your screen</Text>
                    <View style={styles.deckPresenter}>
                      <MonitorUp color="#00a884" size={13} />
                      <Text style={styles.deckPresenterText}>You are presenting</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.shareStrip}>
                {[selfTile, ...remotes.map((participant, index) => remoteTile(participant, index))]}
              </View>
            </View>
          ) : isGroup ? (
            <View style={styles.gridWrap}>
              <View style={styles.grid}>
                {remotes.map((participant, index) => remoteTile(participant, index))}
                {selfTile}
              </View>
            </View>
          ) : (
            <View style={styles.center}>
              <View style={styles.remoteStage}>
                {type === 'video' && !compact ? (
                  <LinearGradient
                    colors={['#1f3f43', '#0c181c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <View style={styles.avatarHalo}>
                  <View style={styles.avatarHaloInner}>
                    <Avatar name={remotes[0].name} uri={remotes[0].avatar} size={compact ? 96 : 128} />
                  </View>
                  {connected ? <View style={styles.liveRing} /> : null}
                </View>
              </View>
              <Text style={styles.name}>{remotes[0].name}</Text>
              <Text style={styles.status}>{connected ? formatCallTime(seconds) : 'Calling…'}</Text>
              <Text style={styles.ringing}>
                {connected
                  ? type === 'video'
                    ? 'Video connected · encrypted'
                    : 'Connected · encrypted'
                  : 'Ringing on WhatsApp'}
              </Text>
              {type === 'video' && cameraReady ? (
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
                <Avatar name="You" size={32} />
                <Text style={styles.personName}>You</Text>
                {muted ? <MicOff color="#ff7b72" size={14} /> : <Mic color="#00a884" size={14} />}
              </View>
              {remotes.map((participant) => (
                <View key={participant.id} style={styles.personRow}>
                  <Avatar name={participant.name} uri={participant.avatar} size={32} />
                  <Text style={styles.personName} numberOfLines={1}>
                    {participant.name}
                  </Text>
                  {participant.muted ? (
                    <MicOff color="#ff7b72" size={14} />
                  ) : (
                    <Mic color="#00a884" size={14} />
                  )}
                </View>
              ))}
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
              onPress={() => setScreenSharing((value) => !value)}
            />
            <ControlButton
              icon={speaker ? Volume2 : VolumeX}
              label={speaker ? 'Speaker' : 'Speaker off'}
              active={speaker}
              onPress={() => setSpeaker((value) => !value)}
            />
            <ControlButton
              icon={Users}
              label={`${remotes.length + 1} people`}
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
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  topLeft: {
    gap: 6,
  },
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
  secureDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#00a884',
  },
  secureText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 9,
    fontWeight: '600',
  },
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  ringing: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    marginTop: 4,
  },
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
  pipTagText: {
    color: '#ffffff',
    fontSize: 8.5,
    fontWeight: '700',
  },
  gridWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: 520,
    minHeight: 132,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#0e1c1f',
  },
  tileCenter: {
    alignItems: 'center',
    gap: 7,
    paddingBottom: 8,
  },
  tileAvatarRing: {
    padding: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tileNameSmall: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '600',
  },
  tileFooter: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tileTag: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: '76%',
  },
  tileTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  tileMic: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,168,132,0.18)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  speakingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#00a884',
  },
  speakingText: {
    color: '#7ef0d0',
    fontSize: 8,
    fontWeight: '700',
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  sharedWindow: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f7f8fa',
    flex: 1,
    maxHeight: 460,
  },
  windowBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e9edef',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  windowDots: {
    flexDirection: 'row',
    gap: 5,
  },
  windowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  windowTitle: {
    flex: 1,
    color: '#54656f',
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  liveSharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d9fdd3',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveShareDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00a884',
  },
  liveShareText: {
    color: '#008069',
    fontSize: 6.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  deck: {
    flex: 1,
    padding: 18,
    backgroundColor: '#ffffff',
    gap: 6,
  },
  deckEyebrow: {
    color: '#00a884',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  deckTitle: {
    color: '#111b21',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  deckSub: {
    color: '#667781',
    fontSize: 10,
  },
  deckCards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flex: 1,
  },
  deckCard: {
    flex: 1,
    backgroundColor: '#f4f7f8',
    borderRadius: 9,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
    minWidth: 0,
  },
  deckCardLabel: {
    color: '#54656f',
    fontSize: 8,
    fontWeight: '600',
  },
  deckCardValue: {
    color: '#111b21',
    fontSize: 19,
    fontWeight: '800',
  },
  deckTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8ea',
    overflow: 'hidden',
  },
  deckFill: {
    height: '100%',
    borderRadius: 2,
  },
  deckFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  deckFooter: {
    color: '#8696a0',
    fontSize: 8,
  },
  deckPresenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deckPresenterText: {
    color: '#008069',
    fontSize: 8,
    fontWeight: '700',
  },
  shareStrip: {
    flexDirection: 'row',
    gap: 8,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  peopleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  peopleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  peopleTitle: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  personName: {
    flex: 1,
    color: '#d7dfe3',
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
    marginTop: 8,
  },
  controlWrap: {
    alignItems: 'center',
    gap: 5,
    width: 64,
  },
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
  endWrap: {
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
  },
  endButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
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
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '500',
  },
});
