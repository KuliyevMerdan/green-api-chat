import { describe, expect, it } from 'vitest';
import { detectInstanceType } from './instance';

describe('detectInstanceType', () => {
  it.each([
    ['v3', 'max'],
    ['telegram', 'telegram'],
    ['whatsapp', null],
    [undefined, null],
  ] as const)('%s → %s', (typeInstance, expected) => {
    expect(detectInstanceType(typeInstance)).toBe(expected);
  });
});
