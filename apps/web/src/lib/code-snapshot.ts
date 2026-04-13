/**
 * Code snapshot management
 * Manages code snapshots for execution and hash tracking
 */

/**
 * Compute SHA-256 hash of code using Web Crypto API
 * Returns hex string
 */
export async function computeHash(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Snapshot Manager for tracking code versions
 * Stores snapshots by hash and provides quick lookup
 */
export class SnapshotManager {
  private snapshots: Map<string, string> = new Map();
  private latestHash: string | null = null;

  /**
   * Take a snapshot of the current code
   * Returns hash and whether it's a new snapshot
   */
  async takeSnapshot(code: string): Promise<{ hash: string; isNew: boolean }> {
    const hash = await computeHash(code);
    const isNew = !this.snapshots.has(hash);

    if (isNew) {
      this.snapshots.set(hash, code);
    }

    this.latestHash = hash;
    return { hash, isNew };
  }

  /**
   * Get snapshot code by hash
   */
  getSnapshot(hash: string): string | undefined {
    return this.snapshots.get(hash);
  }

  /**
   * Get the latest snapshot
   */
  getLatest(): { hash: string; code: string } | null {
    if (!this.latestHash) return null;

    const code = this.snapshots.get(this.latestHash);
    if (!code) return null;

    return { hash: this.latestHash, code };
  }

  /**
   * Get total snapshots stored
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  /**
   * Clear all snapshots
   */
  clear(): void {
    this.snapshots.clear();
    this.latestHash = null;
  }
}
