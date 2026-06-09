import React from 'react';
import {View, Text, Image, Dimensions, StyleSheet, Pressable} from 'react-native';
import {GestureDetector, Gesture} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {Event} from '../types';
import {useTheme} from '../hooks/useTheme';
import {Pill} from './Pill';
import {HostStack} from './HostStack';

const {width: W, height: H} = Dimensions.get('window');
const CARD_W = W - 32;
const CARD_H = H * 0.66;
const SWIPE_THRESHOLD = W * 0.25;

interface Props {
  events: Event[];
  topIndex: number;
  onSwipe: (dir: 'left' | 'right' | 'up') => void;
  onCardTap: (event: Event) => void;
}

export const SwipeDeck: React.FC<Props> = ({events, topIndex, onSwipe, onCardTap}) => {
  const t = useTheme();
  const topEvent = events[topIndex];
  const nextEvent = events[topIndex + 1];

  const x = useSharedValue(0);
  const y = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onChange((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd(() => {
      const absX = Math.abs(x.value);
      const absY = Math.abs(y.value);
      const isUp = y.value < -SWIPE_THRESHOLD && absY > absX;
      const isRight = x.value > SWIPE_THRESHOLD && !isUp;
      const isLeft = x.value < -SWIPE_THRESHOLD && !isUp;

      if (isRight) {
        x.value = withSpring(W * 1.5, {damping: 18, stiffness: 110});
        runOnJS(onSwipe)('right');
        x.value = 0; y.value = 0;
      } else if (isLeft) {
        x.value = withSpring(-W * 1.5, {damping: 18, stiffness: 110});
        runOnJS(onSwipe)('left');
        x.value = 0; y.value = 0;
      } else if (isUp) {
        y.value = withSpring(-H * 1.2, {damping: 18, stiffness: 110});
        runOnJS(onSwipe)('up');
        x.value = 0; y.value = 0;
      } else {
        x.value = withSpring(0, {damping: 16});
        y.value = withSpring(0, {damping: 16});
      }
    });

  const topStyle = useAnimatedStyle(() => {
    const rot = interpolate(x.value, [-W, 0, W], [-12, 0, 12], Extrapolation.CLAMP);
    return {
      transform: [
        {translateX: x.value},
        {translateY: y.value},
        {rotate: `${rot}deg`},
      ],
    };
  });

  const passOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-W * 0.4, -40, 0], [1, 0, 0], Extrapolation.CLAMP),
  }));
  const goingOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, 40, W * 0.4], [0, 0, 1], Extrapolation.CLAMP),
  }));
  const interestedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [-H * 0.3, -40, 0], [1, 0, 0], Extrapolation.CLAMP),
  }));

  if (!topEvent) {
    return (
      <View style={[styles.emptyCard, {backgroundColor: t.bg.secondary}]}>
        <Text style={{color: t.text.primary, fontSize: 18, fontWeight: '700'}}>
          All caught up
        </Text>
        <Text style={{color: t.text.secondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 24}}>
          You've seen this week's slate. Check Calendar for what you saved.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {nextEvent && <CardBack event={nextEvent} t={t} />}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, {backgroundColor: t.bg.secondary}, topStyle]}>
          <Pressable onPress={() => onCardTap(topEvent)} style={{flex: 1}}>
            <Image source={{uri: topEvent.flyer_url}} style={styles.flyer} />
            <View style={styles.overlay} />

            {/* Swipe label overlays */}
            <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, passOpacity]}>
              <Text style={[styles.swipeLabelText, {color: t.status.danger, borderColor: t.status.danger}]}>
                PASS
              </Text>
            </Animated.View>
            <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, goingOpacity]}>
              <Text style={[styles.swipeLabelText, {color: t.accents.deal.base, borderColor: t.accents.deal.base}]}>
                GOING
              </Text>
            </Animated.View>
            <Animated.View style={[styles.swipeLabel, styles.swipeLabelUp, interestedOpacity]}>
              <Text style={[styles.swipeLabelText, {color: t.accents.glow.base, borderColor: t.accents.glow.base}]}>
                INTERESTED
              </Text>
            </Animated.View>

            {/* Bottom info */}
            <View style={styles.bottom}>
              <View style={{flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap'}}>
                {topEvent.deals.length > 0 && (
                  <Pill label={topEvent.deals[0].title} accent="deal" size="sm" />
                )}
                {topEvent.ticket_options.length > 0 && (
                  <Pill
                    label={`From $${topEvent.ticket_options[0].price}`}
                    accent="beam"
                    size="sm"
                  />
                )}
                {topEvent.cover_charge === 0 && (
                  <Pill label="Free Entry" accent="glow" size="sm" />
                )}
              </View>
              <Text style={styles.title}>{topEvent.title}</Text>
              <Text style={styles.subtitle}>
                {topEvent.venue.display_name} · {topEvent.start_time}
              </Text>
              <View style={{marginTop: 12}}>
                <HostStack hosts={topEvent.hosts} showLabel={topEvent.hosts.length > 0} />
              </View>
              <View style={{flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap'}}>
                {topEvent.vibe_tags.slice(0, 3).map((tag) => (
                  <Pill key={tag} label={tag} accent="aurora" size="sm" />
                ))}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const CardBack: React.FC<{event: Event; t: any}> = ({event, t}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: t.bg.secondary,
        position: 'absolute',
        transform: [{scale: 0.95}, {translateY: 8}],
        opacity: 0.6,
      },
    ]}>
    <Image source={{uri: event.flyer_url}} style={styles.flyer} />
    <View style={styles.overlay} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CARD_W,
    height: CARD_H,
    alignSelf: 'center',
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  flyer: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  bottom: {
    position: 'absolute',
    left: 18, right: 18, bottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
  },
  emptyCard: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  swipeLabel: {
    position: 'absolute',
    top: 56,
  },
  swipeLabelLeft: {right: 24, transform: [{rotate: '12deg'}]},
  swipeLabelRight: {left: 24, transform: [{rotate: '-12deg'}]},
  swipeLabelUp: {alignSelf: 'center', top: 100},
  swipeLabelText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
    borderWidth: 3,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
});
