import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../hooks/useTheme';

/**
 * Canonical profile hero — THE shared block for the user's own profile and
 * every public profile variant (place / talent / community / brand), per the
 * profile spec's #1 rule: same hero composition everywhere, only the
 * *content* differs. Any styling change here restyles all profiles at once.
 */
interface Props {
  avatarUrl?: string;
  coverUrl?: string;
  name: string;
  verified?: boolean;
  /** Small line under the name — handle, city, member-since, etc. */
  subtitle?: string;
  /** One-liner shown above the subtitle for public profiles. */
  tagline?: string;
  /** Pills, stats, CTAs — rendered below the text stack. */
  children?: React.ReactNode;
}

export const AVATAR_SIZE = 90;

export const ProfileHero: React.FC<Props> = ({
  avatarUrl,
  coverUrl,
  name,
  verified,
  subtitle,
  tagline,
  children,
}) => {
  const t = useTheme();
  return (
    <View>
      {coverUrl ? (
        <View style={styles.coverWrap}>
          <Image source={{uri: coverUrl}} style={styles.cover} />
          <View style={[styles.coverFade, {backgroundColor: t.bg.overlay}]} />
        </View>
      ) : null}
      <View style={[styles.block, coverUrl ? styles.blockOverCover : null]}>
        <Image
          source={{uri: avatarUrl || 'https://picsum.photos/seed/ventii/200'}}
          style={[styles.avatar, {borderColor: t.bg.primary}]}
        />
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Text style={[styles.name, {color: t.text.primary}]}>{name}</Text>
          {verified ? (
            <Text style={{color: t.accents.beam.base, fontSize: 16, fontWeight: '800'}}>✓</Text>
          ) : null}
        </View>
        {tagline ? (
          <Text style={[styles.tagline, {color: t.text.secondary}]}>{tagline}</Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, {color: t.text.secondary}]}>{subtitle}</Text>
        ) : null}
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  coverWrap: {height: 110, marginBottom: -34},
  cover: {...StyleSheet.absoluteFillObject, width: '100%', height: '100%'},
  coverFade: {...StyleSheet.absoluteFillObject, opacity: 0.35},
  block: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  blockOverCover: {paddingTop: 0},
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginBottom: 14,
    borderWidth: 3,
  },
  name: {fontSize: 24, fontWeight: '800', letterSpacing: -0.3},
  tagline: {fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 12},
  subtitle: {fontSize: 13, marginTop: 4},
});

export default ProfileHero;
