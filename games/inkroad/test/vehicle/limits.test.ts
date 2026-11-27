import { describe, expect, it } from 'vitest';
import { IDM } from '../../src/sim/tune';
import { paramsOf } from '../../src/sim/vehicle/params';

describe('the sim drives within the vehicle model', () => {
  it('IDM pulls away and brakes within the model limits', () => {
    const p = paramsOf('car');
    expect(IDM.accel).toBeCloseTo(p.accel, 1);
    expect(IDM.brake).toBeLessThanOrEqual(p.planBrake);
    expect(IDM.hardBrake).toBeCloseTo(p.brake, 1);
    expect(IDM.jerk).toBeCloseTo(p.jerk, 1);
  });
});
