import { describe, expect, it } from 'vitest';
import { orientationLock } from '../src/lib/client/orientationLock';

describe('orientationLock', () => {
  it('locks a portrait game upright and a landscape game sideways', () => {
    expect(orientationLock('portrait')).toBe('portrait');
    expect(orientationLock('landscape')).toBe('landscape');
  });

  it('leaves the phone free for a game that plays either way, or says nothing', () => {
    expect(orientationLock('any')).toBeNull();
    expect(orientationLock(undefined)).toBeNull();
    expect(orientationLock('')).toBeNull();
    expect(orientationLock('sideways')).toBeNull();
  });
});
