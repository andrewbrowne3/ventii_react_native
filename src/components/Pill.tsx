import React from 'react';
import {Text, View, ViewStyle, TextStyle} from 'react-native';
import {useTheme} from '../hooks/useTheme';

type AccentKey = 'aurora' | 'beam' | 'glow' | 'deal' | 'pulse';

interface Props {
  label: string;
  accent?: AccentKey;
  icon?: React.ReactNode;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export const Pill: React.FC<Props> = ({label, accent = 'aurora', icon, style, size = 'md'}) => {
  const t = useTheme();
  const tone = t.accents[accent];
  const padV = size === 'sm' ? 3 : 5;
  const padH = size === 'sm' ? 8 : 11;
  const fontSize = size === 'sm' ? 11 : 12.5;

  return (
    <View
      style={[
        {
          backgroundColor: tone.bg,
          borderColor: tone.base,
          borderWidth: 0.7,
          borderRadius: 100,
          paddingVertical: padV,
          paddingHorizontal: padH,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      {icon}
      <Text
        style={{
          color: tone.base,
          fontSize,
          fontWeight: '600',
          letterSpacing: 0.2,
        }}>
        {label}
      </Text>
    </View>
  );
};
