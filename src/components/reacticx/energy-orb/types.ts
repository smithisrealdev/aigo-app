interface IEnergyOrb {
  readonly width?: number;
  readonly height?: number;
  readonly speed?: number;
  readonly colors?: string[];
  readonly glowRadius?: number;
  /** false: the orb stops on its current frame (off screen, not working, Reduce Motion) */
  readonly active?: boolean;
}

type RGB = [number, number, number];

export type { IEnergyOrb, RGB };
