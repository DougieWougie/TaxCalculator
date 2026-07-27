import { describe, it, expect } from 'vitest';
import { snapValue, nudge, type SnapOptions } from './snapping';

const pct: SnapOptions = { min: 0, max: 100, step: 0.5 };

describe('snapValue', () => {
  it('rounds to the nearest step', () => {
    expect(snapValue(6.3, pct)).toBe(6.5);
    expect(snapValue(6.1, pct)).toBe(6);
  });

  it('clamps below min', () => {
    expect(snapValue(-5, pct)).toBe(0);
  });

  it('clamps above max', () => {
    expect(snapValue(120, pct)).toBe(100);
  });

  it('pulls onto a snap point inside the tolerance', () => {
    const opts: SnapOptions = { min: 0, max: 60000, step: 100, snapPoints: [43662], tolerance: 500 };
    expect(snapValue(43700, opts)).toBe(43662);
  });

  it('ignores a snap point outside the tolerance', () => {
    const opts: SnapOptions = { min: 0, max: 60000, step: 100, snapPoints: [43662], tolerance: 500 };
    expect(snapValue(45000, opts)).toBe(45000);
  });

  it('picks the nearest snap point when two are in range', () => {
    const opts: SnapOptions = { min: 0, max: 100, step: 1, snapPoints: [40, 44], tolerance: 5 };
    expect(snapValue(43, opts)).toBe(44);
  });

  it('breaks an exact tie deterministically, regardless of snapPoints order', () => {
    const a: SnapOptions = { min: 0, max: 100, step: 1, snapPoints: [40, 50], tolerance: 10 };
    const b: SnapOptions = { min: 0, max: 100, step: 1, snapPoints: [50, 40], tolerance: 10 };
    expect(snapValue(45, a)).toBe(40);
    expect(snapValue(45, b)).toBe(40);
  });

  it('does not produce floating point noise', () => {
    expect(snapValue(0.1 + 0.2, { min: 0, max: 10, step: 0.1 })).toBe(0.3);
  });
});

describe('nudge', () => {
  it('moves up by one step', () => {
    expect(nudge(6, 1, pct)).toBe(6.5);
  });

  it('moves down by one step', () => {
    expect(nudge(6, -1, pct)).toBe(5.5);
  });

  it('moves by ten steps when coarse', () => {
    expect(nudge(6, 1, pct, true)).toBe(11);
  });

  it('clamps at max', () => {
    expect(nudge(100, 1, pct)).toBe(100);
  });

  it('clamps at min', () => {
    expect(nudge(0, -1, pct)).toBe(0);
  });

  it('ignores snap points so keyboard stepping stays predictable', () => {
    const opts: SnapOptions = { min: 0, max: 100, step: 1, snapPoints: [50], tolerance: 5 };
    expect(nudge(47, 1, opts)).toBe(48);
  });
});
