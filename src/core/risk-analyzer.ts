import { PermissionRequest, RiskLevel } from './types';

const DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf\b/i,
  /rmdir\s+\/s/i,
  /drop\s+table\b/i,
  /drop\s+database\b/i,
  /mkfs\b/i,
  /dd\s+if=/i,
  /chmod\s+-R\s+777/i,
  /git\s+reset\s+--hard/i,
  /git\s+clean\s+-fdx/i,
  /sudo\s+rm/i,
];

const HIGH_RISK_PATTERNS = [
  /sudo\b/i,
  /eval\b/i,
  /exec\b/i,
  /curl.*\|\s*sh/i,
  /wget.*\|\s*sh/i,
];

export interface RiskAnalysisResult {
  riskLevel: RiskLevel;
  isDestructive: boolean;
  reason?: string;
}

export function analyzeRisk(request: PermissionRequest): RiskAnalysisResult {
  let riskLevel: RiskLevel = request.riskLevel || 'medium';
  let isDestructive = false;
  let reason: string | undefined;

  const payloadStr = typeof request.payload === 'string'
    ? request.payload
    : JSON.stringify(request.payload || '');

  // Check action type specifics
  if (request.type === 'file_delete') {
    isDestructive = true;
    riskLevel = 'critical';
    reason = 'Action permanently deletes files or directories';
  } else if (request.type === 'env_read') {
    riskLevel = 'low';
  } else if (request.type === 'network_request') {
    riskLevel = 'medium';
  }

  // Check payload string for destructive patterns
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(payloadStr)) {
      isDestructive = true;
      riskLevel = 'critical';
      reason = `Matches destructive shell pattern: ${pattern.source}`;
      break;
    }
  }

  if (!isDestructive) {
    for (const pattern of HIGH_RISK_PATTERNS) {
      if (pattern.test(payloadStr)) {
        riskLevel = 'high';
        reason = `Matches elevated risk pattern: ${pattern.source}`;
        break;
      }
    }
  }

  // If request explicitly provided a higher risk level, honor it
  const riskPriority: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  if (request.riskLevel && riskPriority[request.riskLevel] > riskPriority[riskLevel]) {
    riskLevel = request.riskLevel;
  }

  return { riskLevel, isDestructive, reason };
}
