import React, {useCallback} from 'react';
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
import type {StyleProp, ViewStyle} from 'react-native';
import {Event} from '../types';
import {useTheme} from '../hooks/useTheme';
import {Pill} from './Pill';
import {HostStack} from './HostStack';

const {width: W, height: H} = Dimensions.get('window');
const CARD_W = W - 32;
const CARD_H = H * 0.66;
const SWIPE_THRESHOLD = W * 0.25;
// A flick faster than this commits the swipe even before the distance
// threshold — matches how Tinder-style decks are expected to feel.
const FLING_VELOCITY = 800;
// Critically-damped, no overshoot: the card leaves the screen and stays gone.
const EXIT_SPRING = {damping: 30, stiffness: 220, overshootClamping: true} as const;
const SNAP_SPRING = {damping: 20, stiffness: 190} as const;

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

  // Runs on the JS thread once the exit animation has fully finished:
  // advance the deck, then reset the (now invisible) card position. The next
  // card is already rendered underneath at full size, so the swap is seamless.
  const finishSwipe = useCallback(
    (dir: 'left' | 'right' | 'up') => {
      onSwipe(dir);
      x.value = 0;
      y.value = 0;
    },
    [onSwipe, x, y],
  );

  const gesture = Gesture.Pan()
    // Don't capture the gesture until the finger has clearly moved — keeps
    // taps crisp and stops micro-jitter on press.
    .activeOffsetX([-12, 12])
    .activeOffsetY([-12, 12])
    .onChange((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      const absX = Math.abs(x.value);
      const absY = Math.abs(y.value);
      const flungX = Math.abs(e.velocityX) > FLING_VELOCITY;
      const flungUp = e.velocityY < -FLING_VELOCITY;
      const isUp = (y.value < -SWIPE_THRESHOLD || flungUp) && absY > absX;
      const isRight =
        (x.value > SWIPE_THRESHOLD || (flungX && e.velocityX > 0)) && !isUp;
      const isLeft =
        (x.value < -SWIPE_THRESHOLD || (flungX && e.velocityX < 0)) && !isUp;

      if (isRight || isLeft) {
        const dir: 'left' | 'right' = isRight ? 'right' : 'left';
        // Carry the finger's velocity into the exit so the card keeps the
        // momentum it was thrown with; drift y along its current trajectory.
        x.value = withSpring(
          isRight ? W * 1.4 : -W * 1.4,
          {...EXIT_SPRING, velocity: e.velocityX},
          (finished) => {
            if (finished) runOnJS(finishSwipe)(dir);
          },
        );
        y.value = withSpring(y.value + e.velocityY * 0.08, {
          ...EXIT_SPRING,
          velocity: e.velocityY,
        });
      } else if (isUp) {
        y.value = withSpring(
          -H * 1.1,
          {...EXIT_SPRING, velocity: e.velocityY},
          (finished) => {
            if (finished) runOnJS(finishSwipe)('up');
          },
        );
        x.value = withSpring(x.value + e.velocityX * 0.08, {
          ...EXIT_SPRING,
          velocity: e.velocityX,
        });
      } else {
        x.value = withSpring(0, {...SNAP_SPRING, velocity: e.velocityX});
        y.value = withSpring(0, {...SNAP_SPRING, velocity: e.velocityY});
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

  // The card behind scales/fades up in lockstep with the drag, so by the time
  // the top card exits, the next one is already at full size — no pop.
  const backStyle = useAnimatedStyle(() => {
    const p = Math.min(
      1,
      (Math.abs(x.value) + Math.abs(y.value)) / SWIPE_THRESHOLD,
    );
    return {
      transform: [{scale: 0.95 + 0.05 * p}, {translateY: 8 - 8 * p}],
      opacity: 0.6 + 0.4 * p,
    };
  });

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
      {nextEvent && <CardBack event={nextEvent} t={t} animStyle={backStyle} />}
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

const CardBack: React.FC<{
  event: Event;
  t: any;
  animStyle?: StyleProp<ViewStyle>;
}> = ({event, t, animStyle}) => (
  <Animated.View
    style={[
      styles.card,
      {backgroundColor: t.bg.secondary, position: 'absolute'},
      animStyle,
    ]}>
    <Image source={{uri: event.flyer_url}} style={styles.flyer} />
    <View style={styles.overlay} />
  </Animated.View>
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
