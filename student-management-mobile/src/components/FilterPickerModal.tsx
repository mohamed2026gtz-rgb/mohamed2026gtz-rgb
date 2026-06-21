import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FilterOption } from './FilterChips';
import { colors, radii } from '../theme/colors';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: FilterOption[];
  selected: string | number | null;
  onSelect: (value: string | number | null) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function FilterPickerModal({
  visible,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = 'Search...',
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.subtitle?.toLowerCase().includes(q)
    );
  }, [options, query]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleSelect = (value: string | number | null) => {
    onSelect(value);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          {searchable ? (
            <TextInput
              style={styles.search}
              placeholder={searchPlaceholder}
              placeholderTextColor="#999"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={(item) => `${String(item.value)}-${item.label}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No matches found</Text>
            }
            renderItem={({ item }) => {
              const active =
                selected === item.value || (selected == null && item.value == null);
              return (
                <Pressable
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => handleSelect(item.value)}
                >
                  <View style={styles.optionBody}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {item.label}
                    </Text>
                    {item.subtitle ? (
                      <Text style={[styles.optionSub, active && styles.optionSubActive]}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            }}
          />

          <Pressable style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    paddingBottom: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.primaryDark },
  subtitle: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: radii.md,
    marginTop: 6,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionLabelActive: { color: colors.primaryDark },
  optionSub: { marginTop: 3, fontSize: 12, color: colors.textMuted },
  optionSubActive: { color: colors.primary },
  check: { fontSize: 18, fontWeight: '700', color: colors.primary, marginLeft: 8 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 24 },
  cancelBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  cancelText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
