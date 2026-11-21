import { Canvas, Fill, Shader, Skia, type Uniforms } from '@shopify/react-native-skia';
import { memo, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { DEFAULT_COLORS, DEFAULT_GLOW_RADIUS, DEFAULT_SIZE, DEFAULT_SPEED, SHADER_SOURCE } from './conf';
import { parseColor } from './helper';
import type { IEnergyOrb } from './types';

const source = Skia.RuntimeEffect.Make(SHADER_SOURCE);

export const EnergyOrb = memo(function EnergyOrb({
  width = DEFAULT_SIZE,
  height = DEFAULT_SIZE,
  speed = DEFAULT_SPEED,
  colors = DEFAULT_COLORS,
  glowRadius = DEFAULT_GLOW_RADIUS,
  active = true,
}: IEnergyOrb) {
  const time = useSharedValue(0);
  // real frame time (capped so a resume does not jump): the same speed at 60 and 120 Hz
  const frame = useFrameCallback((f) => {
    time.set(time.get() + (Math.min(f.timeSincePreviousFrame ?? 16, 50) / 1000) * speed);
  }, active);
  useEffect(() => { frame.setActive(active); }, [active, frame]);

  const [c0, c1, c2] = useMemo(() => [
    parseColor(colors[0] ?? DEFAULT_COLORS[0]),
    parseColor(colors[1] ?? colors[0] ?? DEFAULT_COLORS[1]),
    parseColor(colors[2] ?? colors[0] ?? DEFAULT_COLORS[2]),
  ], [colors]);

  const uniforms = useDerivedValue<Uniforms>(() => ({
    iTime: time.get(),
    iResolution: [width, height],
    uSpeed: speed,
    uColor0: c0,
    uColor1: c1,
    uColor2: c2,
    uGlowRadius: glowRadius,
  }));

  if (!source) return null;
  return (
    <Canvas style={[styles.canvas, { width, height }]}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
});

const styles = StyleSheet.create({ canvas: { backgroundColor: 'transparent' } });
