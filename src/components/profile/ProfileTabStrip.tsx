import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../hooks/useTheme';

/**
 * Canonical profile tab strip — shared by the user's own profile and all
 * public profile variants. Identical metrics everywhere (13.5pt labels,
 * 2.4px centered underline) per the profile spec's consistency rule.
 */
interface Props {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export const ProfileTabStrip: React.FC<Props> = ({tabs, active, onChange}) => {
  const t = useTheme();
  return (
    <View style={[styles.strip, {borderBottomColor: t.border.subtle}]}>
      {tabs.map((label) => {
        const isActive = active === label;
        return (
          <Pressable key={label} onPress={() => onChange(label)} style={styles.tab}>
            <Text
              style={{
                color: isActive ? t.text.primary : t.text.tertiary,
                fontWeight: isActive ? '700' : '500',
                fontSize: 13.5,
              }}>
              {label}
            </Text>
            {isActive && (
              <View style={[styles.indicator, {backgroundColor: t.text.primary}]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth},
  tab: {flex: 1, paddingVertical: 12, alignItems: 'center'},
  indicator: {
    position: 'absolute',
    bottom: -1,
    left: '30%',
    right: '30%',
    height: 2.4,
    borderRadius: 1,
  },
});

export default ProfileTabStrip;
