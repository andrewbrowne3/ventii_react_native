import React, {useState} from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {ChevronDown, MapPin} from 'lucide-react-native';
import {useTheme} from '../../hooks/useTheme';

/**
 * Navigation spec (Navigation.native.jsx, Part B/C): every screen header is
 * the same three-slot row —
 *     [ left icon button ] [ flexible center ] [ right icon button ]
 * One shared primitive keeps them visually identical across screens.
 */
export const ScreenHeader: React.FC<{
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  centerFlex?: boolean;
}> = ({left, center, right, centerFlex = true}) => (
  <View style={styles.headerRow}>
    {left ?? null}
    <View style={centerFlex ? {flex: 1} : undefined}>{center}</View>
    {right ?? null}
  </View>
);

/** 40×40 rounded ghost icon button — hairline border, transparent fill. */
export const GhostIconButton: React.FC<{
  onPress?: () => void;
  label: string;
  children: React.ReactNode;
}> = ({onPress, label, children}) => {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[styles.iconBtn, {borderColor: t.border.subtle}]}>
      {children}
    </Pressable>
  );
};

// City picker data — Atlanta is fully populated; others are scaffolded (spec D).
export const CITY_OPTIONS = [
  {id: 'atl', name: 'Atlanta', state: 'GA'},
  {id: 'nyc', name: 'New York', state: 'NY'},
  {id: 'mia', name: 'Miami', state: 'FL'},
  {id: 'hou', name: 'Houston', state: 'TX'},
];

/**
 * City pill: 📍 City, ST ▾ — tapping opens the picker; chevron rotates while
 * open. Picking a city sets it and closes (spec Part D).
 */
export const CityPill: React.FC<{
  cityId: string;
  onSelectCity: (id: string) => void;
}> = ({cityId, onSelectCity}) => {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const city = CITY_OPTIONS.find((c) => c.id === cityId) ?? CITY_OPTIONS[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.cityPill, {borderColor: t.border.subtle, backgroundColor: t.bg.secondary}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <MapPin size={14} color={t.accents.glow.deep} />
          <Text style={{color: t.text.primary, fontWeight: '600', fontSize: 14, letterSpacing: -0.2}}>
            {city.name}, {city.state}
          </Text>
        </View>
        <View style={{transform: [{rotate: open ? '180deg' : '0deg'}]}}>
          <ChevronDown size={13} color={t.text.secondary} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setOpen(false)}>
          <View style={[styles.pickerCard, {backgroundColor: t.bg.elevated, borderColor: t.border.subtle}]}>
            <Text style={{color: t.text.tertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, paddingHorizontal: 6}}>
              CHOOSE YOUR CITY
            </Text>
            <FlatList
              data={CITY_OPTIONS}
              keyExtractor={(c) => c.id}
              renderItem={({item}) => {
                const active = item.id === cityId;
                return (
                  <Pressable
                    onPress={() => {
                      onSelectCity(item.id);
                      setOpen(false);
                    }}
                    style={[styles.pickerRow, active && {backgroundColor: t.accents.aurora.bg}]}>
                    <Text style={{color: t.text.primary, fontSize: 15, fontWeight: active ? '700' : '500'}}>
                      {item.name}, {item.state}
                    </Text>
                    {active && <Text style={{color: t.text.primary, fontWeight: '700'}}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    paddingTop: 110,
    paddingHorizontal: 20,
  },
  pickerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    maxHeight: 320,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
});
