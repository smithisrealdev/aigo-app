import type { RGB } from './types';

// AiGo: blends normally (premultiplied colour) so it works on light and dark backgrounds, never fades out,
// colour arms turn round a bright core and fine rings drift outwards
const SHADER_SOURCE = `
  uniform float iTime;
  uniform vec2 iResolution;
  uniform float uSpeed;
  uniform vec3 uColor0;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uGlowRadius;

  vec4 main(vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution) / iResolution.y;
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float t = iTime * uSpeed;

    float swirl = sin(a * 2.0 + t * 1.1 - r * 9.0) * 0.5 + 0.5;
    float drift = sin(t * 0.7 + r * 7.0) * 0.5 + 0.5;
    float ring = sin(r * 18.0 - t * 2.4) * 0.5 + 0.5;

    vec3 color = mix(mix(uColor0, uColor1, drift), uColor2, swirl * 0.85);
    color = mix(color, vec3(1.0), 0.55 * smoothstep(0.2, 0.0, r));
    color *= 0.9 + 0.1 * ring;

    float body = smoothstep(uGlowRadius, uGlowRadius - 0.2, r);
    float halo = smoothstep(uGlowRadius + 0.08, uGlowRadius - 0.05, r) * 0.35 * (0.6 + 0.4 * ring);
    float alpha = clamp(max(body * (0.86 + 0.14 * sin(t * 1.6)), halo), 0.0, 1.0);

    return vec4(color * alpha, alpha);
  }
`;

const NAMED_COLORS: Record<string, RGB> = {
  red: [1, 0, 0],
  green: [0, 1, 0],
  blue: [0, 0, 1],
  white: [1, 1, 1],
  black: [0, 0, 0],
  yellow: [1, 1, 0],
  cyan: [0, 1, 1],
  magenta: [1, 0, 1],
  orange: [1, 0.65, 0],
  purple: [0.5, 0, 0.5],
  pink: [1, 0.75, 0.8],
};

const DEFAULT_COLORS = ['#FF7A45', '#FFB547', '#FF5C8A'];
const DEFAULT_SPEED = 1.0;
const DEFAULT_GLOW_RADIUS = 0.42;
const DEFAULT_SIZE = 180;

export { DEFAULT_COLORS, DEFAULT_GLOW_RADIUS, DEFAULT_SIZE, DEFAULT_SPEED, NAMED_COLORS, SHADER_SOURCE };
