import { createClient, ClickHouseClient } from '@clickhouse/client';

const clickhouseConfig = {
  host: process.env.CLICKHOUSE_HOST || 'localhost',
  port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
  database: process.env.CLICKHOUSE_DATABASE || 'devlens',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
};

let clickhouse: ClickHouseClient;

export async function initClickhouse(): Promise<ClickHouseClient> {
  clickhouse = createClient(clickhouseConfig);
  try {
    await clickhouse.ping();
    console.log(`[${new Date().toISOString()}] ClickHouse connected successfully`);
    return clickhouse;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to connect to ClickHouse:`, error);
    throw error;
  }
}

export function getClickhouse(): ClickHouseClient {
  if (!clickhouse) {
    throw new Error('ClickHouse client not initialized. Call initClickhouse() first.');
  }
  return clickhouse;
}

export interface AnalysisSnapshot {
  event_id: string;
  session_id: string;
  analysis_result: string; // JSON stringified
  timestamp: Date;
  created_at: Date;
}

export async function insertAnalysisSnapshot(snapshot: AnalysisSnapshot): Promise<void> {
  try {
    const client = getClickhouse();
    await client.insert({
      table: 'analysis_snapshots',
      values: [snapshot],
      format: 'JSONEachRow',
    });
    console.log(
      `[${new Date().toISOString()}] Inserted analysis snapshot for event ${snapshot.event_id}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error inserting analysis snapshot:`,
      error
    );
    throw error;
  }
}

export async function queryLatestSnapshots(
  sessionId: string,
  limit: number = 10
): Promise<AnalysisSnapshot[]> {
  try {
    const client = getClickhouse();
    const result = await client.query({
      query: `
        SELECT event_id, session_id, analysis_result, timestamp, created_at
        FROM analysis_snapshots
        WHERE session_id = {sessionId:String}
        ORDER BY timestamp DESC
        LIMIT {limit:UInt32}
      `,
      query_params: {
        sessionId,
        limit,
      },
    });

    const rows = await result.json<AnalysisSnapshot[]>();
    return rows;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error querying analysis snapshots:`,
      error
    );
    throw error;
  }
}

export interface BugRiskAnalysis {
  session_id: string;
  paste_ratio: number;
  error_rewrite_rate: number;
  undo_frequency: number;
  execution_gap_avg: number;
  bug_probability: number;
  timestamp: Date;
  created_at: Date;
}

export async function insertBugRiskAnalysis(analysis: BugRiskAnalysis): Promise<void> {
  try {
    const client = getClickhouse();
    await client.insert({
      table: 'bug_risk_analysis',
      values: [analysis],
      format: 'JSONEachRow',
    });
    console.log(
      `[${new Date().toISOString()}] Inserted bug risk analysis for session ${analysis.session_id}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error inserting bug risk analysis:`,
      error
    );
    throw error;
  }
}

export interface BehaviorAnalysis {
  session_id: string;
  segment_type: string; // exploration, focus, stuck
  loop_efficiency: number;
  decision_confidence: number;
  event_count: number;
  duration_ms: number;
  timestamp: Date;
  created_at: Date;
}

export async function insertBehaviorAnalysis(analysis: BehaviorAnalysis): Promise<void> {
  try {
    const client = getClickhouse();
    await client.insert({
      table: 'behavior_analysis',
      values: [analysis],
      format: 'JSONEachRow',
    });
    console.log(
      `[${new Date().toISOString()}] Inserted behavior analysis for session ${analysis.session_id}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error inserting behavior analysis:`,
      error
    );
    throw error;
  }
}

export interface RiskResult {
  session_id: string;
  risk_level: string; // low, medium, high, critical
  triggers: string[];
  ml_score: number;
  timestamp: Date;
  created_at: Date;
}

export async function insertRiskResult(result: RiskResult): Promise<void> {
  try {
    const client = getClickhouse();
    await client.insert({
      table: 'risk_results',
      values: [result],
      format: 'JSONEachRow',
    });
    console.log(
      `[${new Date().toISOString()}] Inserted risk result for session ${result.session_id}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error inserting risk result:`,
      error
    );
    throw error;
  }
}

export async function disconnectClickhouse(): Promise<void> {
  try {
    if (clickhouse) {
      // ClickHouse client doesn't have explicit close/disconnect
      console.log(`[${new Date().toISOString()}] ClickHouse client cleaned up`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error disconnecting ClickHouse:`, error);
  }
}
