import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users } from 'lucide-react-native';
import { useApp } from '../context/AppContext';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
  online?: boolean;
  group?: boolean;
  showOnline?: boolean;
}

const gradients: [string, string][] = [
  ['#00a884', '#007a63'],
  ['#5b6cff', '#3949ab'],
  ['#f2994a', '#d96c1e'],
  ['#9b51e0', '#6b2fb3'],
  ['#2d9cdb', '#1b6fa8'],
  ['#eb5757', '#b73c3c'],
  ['#27ae60', '#1b7a44'],
  ['#bb6bd9', '#8e44ad'],
];

function hashIndex(value: string, length: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % length;
}

export function Avatar({
  name,
  uri,
  size = 48,
  online = false,
  group = false,
  showOnline = false,
}: AvatarProps) {
  const { theme } = useApp();
  const gradient = gradients[hashIndex(name, gradients.length)];
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View style={{ width: size, height: size }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={gradient}
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          {group ? (
            <Users color="#ffffff" size={size * 0.42} strokeWidth={2} />
          ) : (
            <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
          )}
        </LinearGradient>
      )}
      {showOnline && online ? (
        <View
          style={[
            styles.onlineDot,
            {
              width: Math.max(10, size * 0.25),
              height: Math.max(10, size * 0.25),
              borderRadius: size,
              backgroundColor: theme.accent,
              borderColor: theme.panel,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
