// ALI-70: signup triage — classifies new registration for admin approval.
// Only relevant when AUTO_APPROVE_STUDENTS=false (B2B / closed course).

import { createHash } from "node:crypto";
import { loadEnv } from "../../lib/env.js";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
  "throwam.com", "trashmail.com", "yopmail.com", "sharklasers.com",
]);

export interface SignupTriageInput {
  userId: string;
  emailDomain: string;
  nameLength: number;
  createdAt: Date;
  ipHash?: string;
}

export interface SignupTriageResult {
  recommendation: "approve" | "review" | "reject";
  flags: string[];
  confidence: number;
  note: string;
}

export function triageSignup(input: SignupTriageInput): SignupTriageResult {
  const flags: string[] = [];
  let score = 0;

  if (DISPOSABLE_DOMAINS.has(input.emailDomain.toLowerCase())) {
    flags.push("disposable_email_domain");
    score += 40;
  }
  if (input.nameLength < 2) {
    flags.push("suspicious_name_too_short");
    score += 20;
  }
  if (input.nameLength > 80) {
    flags.push("suspicious_name_too_long");
    score += 10;
  }

  let recommendation: SignupTriageResult["recommendation"];
  if (score >= 40) {
    recommendation = "reject";
  } else if (score >= 20) {
    recommendation = "review";
  } else {
    recommendation = loadEnv().AUTO_APPROVE_STUDENTS === "true" ? "approve" : "review";
  }

  const confidence = Math.min(1, 0.5 + score / 100);
  const note = flags.length > 0
    ? `플래그 ${flags.length}개 감지: ${flags.join(", ")}`
    : "이상 징후 없음 — 자동 승인 권장";

  return { recommendation, flags, confidence, note };
}
