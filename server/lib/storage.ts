// Cloudflare R2 (S3-compatible) wrapper per api-contracts.md §6-3.
// Owner: ALI-67 방연동[MCP]. fetch-based AWS SigV4 — no @aws-sdk dependency.
//
// Why hand-rolled: only two operations are needed for canvas artifact / export
// upload flows (server-side PUT + presigned GET for client download). Pulling
// the full @aws-sdk/client-s3 + s3-request-presigner pair would add ~600KB
// of transitive deps for ~120 lines of signing code. SigV4 is a well-specified
// stable contract; the risk surface here is small.
//
// Region is the literal string "auto" for Cloudflare R2 — required by R2 even
// though it has no AWS-meaningful region. Service is "s3".
//
// Feature-gated: hasFeature("r2") false → throws DisabledFeatureError so route
// handlers can return 503 mvp_cut without touching network.

import { createHash, createHmac } from "node:crypto";
import { loadEnv, hasFeature } from "./env.js";
import { UpstreamError } from "./anthropic.js";
import { DisabledFeatureError } from "./email.js";

const REGION = "auto";
const SERVICE = "s3";
const ALGORITHM = "AWS4-HMAC-SHA256";
const TIMEOUT_MS = 15_000;

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface PutObjectResult {
  key: string;
  etag: string | null;
  latencyMs: number;
}

export interface PresignedGetInput {
  key: string;
  expiresSec: number;
  responseContentDisposition?: string;
}

function endpointHost(): string {
  const env = loadEnv();
  return `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

function bucketKeyPath(key: string): string {
  const env = loadEnv();
  // Bucket goes in path style, key segments are URI-encoded except '/'
  const encoded = key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `/${env.R2_BUCKET}/${encoded}`;
}

function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function signingKey(secret: string, date: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

function amzDate(now: Date): { amz: string; date: string } {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso, date: iso.slice(0, 8) };
}

export async function putObject(input: PutObjectInput): Promise<PutObjectResult> {
  if (!hasFeature("r2")) {
    throw new DisabledFeatureError("r2");
  }

  const env = loadEnv();
  const host = endpointHost();
  const path = bucketKeyPath(input.key);
  const { amz, date } = amzDate(new Date());
  const payloadHash = sha256Hex(input.body);
  const started = Date.now();

  // Canonical request (sorted lower-case header names).
  const canonicalHeaders =
    `content-type:${input.contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amz}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    ALGORITHM,
    amz,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const sigKey = signingKey(env.R2_SECRET_ACCESS_KEY ?? "", date);
  const signature = createHmac("sha256", sigKey).update(stringToSign).digest("hex");

  const authorization =
    `${ALGORITHM} Credential=${env.R2_ACCESS_KEY_ID}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`https://${host}${path}`, {
      method: "PUT",
      headers: {
        Authorization: authorization,
        "Content-Type": input.contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amz,
      },
      body: input.body,
      signal: ctrl.signal,
    });

    if (!res.ok) {
      const code = res.status === 429 ? "rate_limited" : `http_${res.status}`;
      throw new UpstreamError(
        "r2",
        code,
        `r2 ${res.status}`,
        res.status === 429 || res.status >= 500,
      );
    }

    return {
      key: input.key,
      etag: res.headers.get("etag"),
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    if (err instanceof UpstreamError || err instanceof DisabledFeatureError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new UpstreamError("r2", "timeout", "r2 timeout", true);
    }
    throw new UpstreamError(
      "r2",
      "network_error",
      err instanceof Error ? err.message : String(err),
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

// Presigned GET URL. Client downloads with no further auth. Uses query-string
// signing per S3 spec: payload hash literal "UNSIGNED-PAYLOAD".
export function presignedGetUrl(input: PresignedGetInput): string {
  if (!hasFeature("r2")) {
    throw new DisabledFeatureError("r2");
  }

  const env = loadEnv();
  const host = endpointHost();
  const path = bucketKeyPath(input.key);
  const { amz, date } = amzDate(new Date());
  const scope = `${date}/${REGION}/${SERVICE}/aws4_request`;
  const signedHeaders = "host";

  const queryParams: Array<[string, string]> = [
    ["X-Amz-Algorithm", ALGORITHM],
    ["X-Amz-Credential", `${env.R2_ACCESS_KEY_ID}/${scope}`],
    ["X-Amz-Date", amz],
    ["X-Amz-Expires", String(input.expiresSec)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ];
  if (input.responseContentDisposition) {
    queryParams.push(["response-content-disposition", input.responseContentDisposition]);
  }
  queryParams.sort(([a], [b]) => a.localeCompare(b));

  const canonicalQuery = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    path,
    canonicalQuery,
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    ALGORITHM,
    amz,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const sigKey = signingKey(env.R2_SECRET_ACCESS_KEY ?? "", date);
  const signature = createHmac("sha256", sigKey).update(stringToSign).digest("hex");

  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
