import { Check, Search, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { COUNTRIES } from '../lib/countries';
import { Country } from '../lib/types';

interface CountryPickerProps {
  visible: boolean;
  selected: Country;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export function CountryPicker({ visible, selected, onSelect, onClose }: CountryPickerProps) {
  const { theme } = useApp();
  const { width, height } = useWindowDimensions();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return COUNTRIES;
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(value) ||
        country.dial.includes(value.replace('+', '')) ||
        country.iso.toLowerCase() === value,
    );
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.panel,
              borderColor: theme.border,
              width: Math.min(width - 32, 480),
              maxHeight: Math.min(height - 80, 660),
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>Select country</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                {COUNTRIES.length} countries and regions
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.chip },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityLabel="Close country picker"
            >
              <X color={theme.textSecondary} size={18} />
            </Pressable>
          </View>

          <View style={[styles.search, { backgroundColor: theme.search }]}>
            <Search color={theme.textMuted} size={17} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or dial code"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.iso}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={18}
            style={styles.list}
            renderItem={({ item }) => {
              const active = item.iso === selected.iso;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: theme.border },
                    active && { backgroundColor: theme.chipActive },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.dial, { color: theme.textSecondary }]}>+{item.dial}</Text>
                  {active ? <Check color={theme.accentDark} size={17} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: theme.textSecondary }]}>
                No countries match “{query}”.
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 20, 26, 0.6)',
    padding: 16,
  },
  panel: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  list: {
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  flag: {
    fontSize: 20,
  },
  countryName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
  },
  dial: {
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    padding: 28,
    fontSize: 13,
  },
});
