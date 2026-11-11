import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { hydrated, currentUser } = useAuth();

  if (!hydrated) return null;
  if (!currentUser) return <Redirect href={'/auth' as never} />;
  return <Redirect href={(currentUser.role === 'admin' ? '/admin' : '/(tabs)') as never} />;
}
