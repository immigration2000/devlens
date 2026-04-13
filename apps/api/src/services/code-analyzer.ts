import crypto from 'node:crypto';

export interface AnalysisIssue {
  line: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
  type: string;
}

export interface CodeAnalysisResult {
  health_score: number;
  breakdown: {
    code_quality: number;
    bug_risk: number;
    behavior: number;
    risk: number;
    dependency: number;
  };
  code_quality_detail: {
    quality_score: number;
    issues: AnalysisIssue[];
  };
  bug_risk_detail: {
    risk_score: number;
    risk_lines: Array<{ line: number; risk_score: number; reason: string }>;
  };
}

// Pre-compiled regex patterns (avoid recompilation per call)
const RE_FUNCTION = /\bfunction\b/;
const RE_ARROW_BLOCK = /=>\s*[{(]/;
const RE_ARROW_EXPR = /=>\s*\S/;
const RE_VAR = /\bvar\s+/;
const RE_LOOSE_EQ = /[^!=]==[^=]/;
const RE_EVAL = /\beval\s*\(/;
const RE_CONSOLE = /\bconsole\.\w+\(/;
const RE_GLOBAL_ASSIGN = /^\w+\s*=\s*/;
const RE_KEYWORD_START = /^(let|const|var|function|class|if|else|for|while|return|export|import)\b/;
const RE_EMPTY_CATCH = /catch\s*\([^)]*\)\s*\{\s*\}/;
const RE_BRACE_OPEN = /\{/g;
const RE_BRACE_CLOSE = /\}/g;

const NESTING_DEPTH_WARNING = 4;

// LRU cache for analysis results (keyed by code hash)
const analysisCache = new Map<string, { result: CodeAnalysisResult; ts: number }>();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function analyzeCode(code: string): CodeAnalysisResult {
  // Check cache by code hash
  const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 16);
  const cached = analysisCache.get(hash);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.result;
  }

  const lines = code.split('\n');
  const issues: AnalysisIssue[] = [];
  const riskLines: Array<{ line: number; risk_score: number; reason: string }> = [];

  let functionCount = 0;
  let commentCount = 0;
  let maxNesting = 0;
  let currentNesting = 0;
  let varUsage = 0;
  let looseEquality = 0;
  let evalUsage = 0;
  let consoleUsage = 0;
  let globalAssignments = 0;
  let emptyBlocks = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    if (RE_FUNCTION.test(trimmed) || RE_ARROW_BLOCK.test(trimmed) || RE_ARROW_EXPR.test(trimmed)) {
      functionCount++;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      commentCount++;
    }

    // Reset lastIndex for global regexes
    RE_BRACE_OPEN.lastIndex = 0;
    RE_BRACE_CLOSE.lastIndex = 0;
    const opens = (line.match(RE_BRACE_OPEN) || []).length;
    const closes = (line.match(RE_BRACE_CLOSE) || []).length;
    currentNesting += opens - closes;
    if (currentNesting > maxNesting) maxNesting = currentNesting;

    if (RE_VAR.test(trimmed)) {
      varUsage++;
      issues.push({ line: lineNum, severity: 'low', message: 'var 대신 let 또는 const 사용을 권장합니다', type: 'style' });
    }

    if (RE_LOOSE_EQ.test(trimmed) && !trimmed.startsWith('//')) {
      looseEquality++;
      issues.push({ line: lineNum, severity: 'medium', message: '== 대신 === 사용을 권장합니다 (엄격한 비교)', type: 'bug_risk' });
    }

    if (RE_EVAL.test(trimmed)) {
      evalUsage++;
      issues.push({ line: lineNum, severity: 'high', message: 'eval() 사용은 보안 위험이 있습니다', type: 'security' });
      riskLines.push({ line: lineNum, risk_score: 90, reason: 'eval() 사용' });
    }

    if (RE_CONSOLE.test(trimmed) && !trimmed.startsWith('//')) {
      consoleUsage++;
    }

    if (RE_GLOBAL_ASSIGN.test(trimmed) && !RE_KEYWORD_START.test(trimmed) && !trimmed.includes('.') && !trimmed.startsWith('//')) {
      globalAssignments++;
      issues.push({ line: lineNum, severity: 'medium', message: '전역 변수 할당이 감지되었습니다', type: 'bug_risk' });
      riskLines.push({ line: lineNum, risk_score: 60, reason: '전역 변수 할당' });
    }

    if (RE_EMPTY_CATCH.test(trimmed)) {
      emptyBlocks++;
      issues.push({ line: lineNum, severity: 'medium', message: '빈 catch 블록이 있습니다 — 에러를 처리하세요', type: 'bug_risk' });
      riskLines.push({ line: lineNum, risk_score: 50, reason: '빈 catch 블록' });
    }

    if (currentNesting > NESTING_DEPTH_WARNING && opens > 0) {
      issues.push({ line: lineNum, severity: 'low', message: `중첩 깊이 ${currentNesting} — 함수 분리를 고려하세요`, type: 'complexity' });
    }
  }

  const totalLines = lines.filter(l => l.trim().length > 0).length;
  const commentRatio = totalLines > 0 ? commentCount / totalLines : 0;

  let codeQuality = 80;
  codeQuality -= varUsage * 3;
  codeQuality -= looseEquality * 4;
  codeQuality -= Math.max(0, maxNesting - 3) * 5;
  if (commentRatio < 0.05 && totalLines > 10) codeQuality -= 5;
  if (functionCount === 0 && totalLines > 15) codeQuality -= 10;
  if (consoleUsage > 3) codeQuality -= 5;
  codeQuality = Math.max(10, Math.min(100, codeQuality));

  let bugRisk = 15;
  bugRisk += evalUsage * 30;
  bugRisk += globalAssignments * 10;
  bugRisk += emptyBlocks * 8;
  bugRisk += looseEquality * 5;
  bugRisk = Math.max(0, Math.min(100, bugRisk));

  const behavior = 70 + Math.min(functionCount * 3, 15);
  const risk = Math.max(30, 85 - bugRisk);
  const dependency = 80;

  const healthScore = Math.round(
    codeQuality * 0.35 +
    (100 - bugRisk) * 0.25 +
    behavior * 0.15 +
    risk * 0.15 +
    dependency * 0.10
  );

  const result: CodeAnalysisResult = {
    health_score: Math.max(10, Math.min(100, healthScore)),
    breakdown: {
      code_quality: Math.round(codeQuality),
      bug_risk: Math.round(100 - bugRisk),
      behavior: Math.round(Math.min(100, behavior)),
      risk: Math.round(risk),
      dependency,
    },
    code_quality_detail: {
      quality_score: Math.round(codeQuality),
      issues: issues.slice(0, 20),
    },
    bug_risk_detail: {
      risk_score: Math.round(bugRisk),
      risk_lines: riskLines,
    },
  };

  // Cache with LRU eviction
  if (analysisCache.size >= CACHE_MAX_SIZE) {
    const oldest = analysisCache.keys().next().value;
    if (oldest) analysisCache.delete(oldest);
  }
  analysisCache.set(hash, { result, ts: Date.now() });

  return result;
}
