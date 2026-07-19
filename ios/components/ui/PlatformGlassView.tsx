import React, { type PropsWithChildren } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView, type BlurViewProps } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassViewProps,
} from 'expo-glass-effect';

type PlatformGlassViewProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassViewProps['glassEffectStyle'];
  tintColor?: string;
  isInteractive?: boolean;
  fallbackIntensity?: number;
  fallbackTint?: BlurViewProps['tint'];
  testID?: string;
}>;

/**
 * Native Liquid Glass on supported iOS builds, with a deterministic blur
 * fallback for older iOS and other platforms.
 */
export function PlatformGlassView({
  children,
  style,
  fallbackStyle,
  glassEffectStyle = 'regular',
  tintColor,
  isInteractive = false,
  fallbackIntensity = 70,
  fallbackTint = Platform.OS === 'ios' ? 'systemMaterial' : 'light',
  testID,
}: PlatformGlassViewProps) {
  const canUseLiquidGlass = Platform.OS === 'ios' &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  if (canUseLiquidGlass) {
    return (
      <GlassView
        testID={testID}
        style={style}
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView
      testID={testID}
      style={[style, fallbackStyle]}
      intensity={fallbackIntensity}
      tint={fallbackTint}
    >
      {children}
    </BlurView>
  );
}
