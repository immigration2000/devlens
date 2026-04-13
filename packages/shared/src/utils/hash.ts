import { createHash } from "crypto";

/** 코드 스냅샷 SHA-256 해시 생성 */
export function codeSnapshotHash(code: string): string {
  return createHash("sha256").update(code, "utf-8").digest("hex");
}
