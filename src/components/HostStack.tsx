import React from 'react';
import {View, Text, Image} from 'react-native';
import {Profile} from '../types';
import {useTheme} from '../hooks/useTheme';

interface Props {
  hosts: Profile[];
  size?: number;
  showLabel?: boolean;
}

export const HostStack: React.FC<Props> = ({hosts, size = 28, showLabel = true}) => {
  const t = useTheme();
  if (hosts.length === 0) return null;

  const visible = hosts.slice(0, 4);
  const overflow = Math.max(0, hosts.length - 4);

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <View style={{flexDirection: 'row'}}>
        {visible.map((h, i) => (
          <Image
            key={h.id}
            source={{uri: h.avatar_url}}
            style={{
              width: size, height: size, borderRadius: size / 2,
              borderWidth: 2, borderColor: t.bg.primary,
              marginLeft: i === 0 ? 0 : -size * 0.35,
            }}
          />
        ))}
        {overflow > 0 && (
          <View
            style={{
              width: size, height: size, borderRadius: size / 2,
              backgroundColor: t.bg.tertiary,
              borderWidth: 2, borderColor: t.bg.primary,
              marginLeft: -size * 0.35,
              alignItems: 'center', justifyContent: 'center',
            }}>
            <Text style={{color: t.text.primary, fontSize: 10, fontWeight: '700'}}>
              +{overflow}
            </Text>
          </View>
        )}
      </View>
      {showLabel && hosts.length > 0 && (
        <Text style={{color: t.text.secondary, fontSize: 12.5, fontWeight: '500'}}>
          {hosts.length === 1
            ? `Hosted by ${hosts[0].display_name}`
            : `Hosted by ${hosts[0].display_name} +${hosts.length - 1}`}
        </Text>
      )}
    </View>
  );
};
