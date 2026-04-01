import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { LAYOUT, TOUCH, FONT_SIZE } from '../constants/dimensions';

/**
 * GameButton — primary CTA button with spring press animation.
 *
 * Props:
 *   label     string
 *   onPress   fn
 *   disabled  bool
 *   variant   'primary' | 'secondary' | 'danger'
 *   loading   bool
 */
export default function GameButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  loading = false,
  style,
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.95, { damping: 12, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  }

  const bgColor = disabled
    ? COLORS.tileUsed
    : variant === 'danger'
    ? COLORS.error
    : variant === 'secondary'
    ? COLORS.surface
    : COLORS.primary;

  const textColor = variant === 'secondary' ? COLORS.primary : COLORS.textLight;
  const borderColor = variant === 'secondary' ? COLORS.primary : 'transparent';

  return (
    <Animated.View style={[styles.wrapper, animStyle, style]}>
      <Pressable
        onPress={!disabled && !loading ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          { backgroundColor: bgColor, borderColor, borderWidth: variant === 'secondary' ? 2 : 0 },
          disabled && styles.disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Animated wrapper so transform works correctly
  },
  button: {
    height: TOUCH.primaryButton,
    borderRadius: LAYOUT.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: FONT_SIZE.lg,
    letterSpacing: 1,
    includeFontPadding: false,
  },
});
