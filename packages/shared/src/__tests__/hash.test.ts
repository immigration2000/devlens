import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

/**
 * Hash function for code snapshots
 */
function codeSnapshotHash(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

describe('codeSnapshotHash', () => {
  it('should return a 64-character hex string', () => {
    const code = 'const x = 10;';
    const hash = codeSnapshotHash(code);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });

  it('should return the same hash for identical inputs', () => {
    const code = 'function hello() { console.log("world"); }';
    const hash1 = codeSnapshotHash(code);
    const hash2 = codeSnapshotHash(code);

    expect(hash1).toBe(hash2);
  });

  it('should return different hashes for different inputs', () => {
    const code1 = 'const x = 10;';
    const code2 = 'const x = 20;';

    const hash1 = codeSnapshotHash(code1);
    const hash2 = codeSnapshotHash(code2);

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty strings', () => {
    const hash = codeSnapshotHash('');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should handle whitespace variations correctly', () => {
    const code1 = 'const x = 10;';
    const code2 = 'const x=10;';

    const hash1 = codeSnapshotHash(code1);
    const hash2 = codeSnapshotHash(code2);

    // Different whitespace should produce different hashes
    expect(hash1).not.toBe(hash2);
  });

  it('should handle multi-line code', () => {
    const code = `function add(a, b) {
  return a + b;
}`;
    const hash = codeSnapshotHash(code);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash.length).toBe(64);
  });

  it('should be deterministic across multiple calls', () => {
    const code = 'const arr = [1, 2, 3, 4, 5];';
    const hashes = Array.from({ length: 10 }, () => codeSnapshotHash(code));

    // All hashes should be identical
    expect(new Set(hashes).size).toBe(1);
  });

  it('should handle special characters', () => {
    const code = 'const emoji = "😀👍🎉";';
    const hash = codeSnapshotHash(code);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
