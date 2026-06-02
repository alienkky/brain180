// Unit tests for three-axis rule-based score logic.
// These run without a DB or LLM connection.

import { describe, it, expect } from "vitest";

// Inline the rule score logic (mirrors server/ai/analyzers/three-axis.ts).
interface CanvasPayload {
  nodes?: { type: string }[];
  edges?: { relation: string }[];
}

function ruleScore(payload: CanvasPayload) {
  const nodes = payload.nodes ?? [];
  const edges = payload.edges ?? [];
  if (nodes.length === 0) return { cognitive: 0, value: 0, time: 0 };

  const typeSet = new Set(nodes.map((n) => n.type));
  const relSet = new Set(edges.map((e) => e.relation));

  const cognitive = Math.min(100, Math.round((typeSet.size / 4) * 50 + (relSet.size / 5) * 50));
  const valueNodes = nodes.filter((n) => n.type === "anchor" || n.type === "bridge").length;
  const valueEdges = edges.filter((e) => e.relation === "contrasts" || e.relation === "transforms").length;
  const value = Math.min(100, Math.round((valueNodes / Math.max(nodes.length, 1)) * 60 + (valueEdges / Math.max(edges.length, 1)) * 40));
  const causalEdges = edges.filter((e) => e.relation === "causes" || e.relation === "supports").length;
  const time = Math.min(100, Math.round((causalEdges / Math.max(edges.length, 1)) * 100));

  return { cognitive, value, time };
}

describe("ruleScore", () => {
  it("returns zeros for empty canvas", () => {
    expect(ruleScore({})).toEqual({ cognitive: 0, value: 0, time: 0 });
  });

  it("max cognitive when all 4 node types + all 5 relation types present", () => {
    const nodes = [
      { type: "concept" }, { type: "anchor" }, { type: "bridge" }, { type: "branch" },
    ];
    const edges = [
      { relation: "causes" }, { relation: "supports" },
      { relation: "contrasts" }, { relation: "transforms" }, { relation: "contains" },
    ];
    const { cognitive } = ruleScore({ nodes, edges });
    expect(cognitive).toBe(100);
  });

  it("high time score for causal edges", () => {
    const nodes = [{ type: "concept" }, { type: "anchor" }];
    const edges = [{ relation: "causes" }, { relation: "supports" }];
    const { time } = ruleScore({ nodes, edges });
    expect(time).toBe(100);
  });

  it("value score driven by anchor/bridge + contrasts/transforms", () => {
    const nodes = [{ type: "anchor" }, { type: "bridge" }, { type: "anchor" }];
    const edges = [{ relation: "contrasts" }, { relation: "transforms" }];
    const { value } = ruleScore({ nodes, edges });
    expect(value).toBeGreaterThan(60);
  });

  it("single node + no edges gives partial cognitive score", () => {
    const { cognitive, time } = ruleScore({ nodes: [{ type: "concept" }] });
    expect(cognitive).toBeGreaterThan(0);
    expect(cognitive).toBeLessThan(100);
    expect(time).toBe(0);
  });
});
