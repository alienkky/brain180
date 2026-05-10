import { useMemo } from "react"
import { useStore } from "../../store/useStore"
import { usePracticeStore } from "../../store/usePracticeStore"
import type { CognitiveNode } from "../../types/cognitive"
import type { UserNode, UserEdge } from "../../store/usePracticeStore"

interface EvalResult {
  score: number
  maxScore: number
  matchedNodes: { user: UserNode; system: CognitiveNode; score: number }[]
  missingConcepts: string[]
  extraConcepts: string[]
  edgeAccuracy: number
  structureAdvice: string[]
  strengthPoints: string[]
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase()
}

function conceptSimilarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.8
  const aChars = new Set(na)
  const bChars = new Set(nb)
  const intersection = [...aChars].filter((c) => bChars.has(c)).length
  const union = new Set([...aChars, ...bChars]).size
  const jaccard = intersection / union
  if (jaccard > 0.5) return 0.5
  return 0
}

function evaluate(
  userNodes: UserNode[],
  userEdges: UserEdge[],
  systemNodes: CognitiveNode[],
  systemEdges: { from: string; to: string; label?: string }[]
): EvalResult {
  const matchedNodes: EvalResult["matchedNodes"] = []
  const usedSystemIds = new Set<string>()
  const usedUserIds = new Set<string>()

  for (const uNode of userNodes) {
    let bestMatch: CognitiveNode | null = null
    let bestScore = 0
    for (const sNode of systemNodes) {
      if (usedSystemIds.has(sNode.id)) continue
      const sim = conceptSimilarity(uNode.concept, sNode.concept)
      if (sim > bestScore) {
        bestScore = sim
        bestMatch = sNode
      }
    }
    if (bestMatch && bestScore >= 0.3) {
      let nodeScore = bestScore * 60
      if (uNode.type === bestMatch.type) nodeScore += 40
      matchedNodes.push({ user: uNode, system: bestMatch, score: nodeScore })
      usedSystemIds.add(bestMatch.id)
      usedUserIds.add(uNode.id)
    }
  }

  const missingConcepts = systemNodes
    .filter((s) => !usedSystemIds.has(s.id))
    .map((s) => s.concept)

  const extraConcepts = userNodes
    .filter((u) => !usedUserIds.has(u.id))
    .map((u) => u.concept)

  let edgeMatches = 0
  const userNodeMap = new Map(matchedNodes.map((m) => [m.user.id, m.system.id]))

  for (const uEdge of userEdges) {
    const sFrom = userNodeMap.get(uEdge.from)
    const sTo = userNodeMap.get(uEdge.to)
    if (!sFrom || !sTo) continue
    const hasSystemEdge = systemEdges.some(
      (se) =>
        (se.from === sFrom && se.to === sTo) ||
        (se.from === sTo && se.to === sFrom)
    )
    if (hasSystemEdge) edgeMatches++
  }

  const edgeAccuracy =
    userEdges.length > 0 ? Math.round((edgeMatches / userEdges.length) * 100) : 0

  const nodeScore = matchedNodes.reduce((sum, m) => sum + m.score, 0)
  const maxNodeScore = systemNodes.length * 100
  const edgeScore = edgeMatches * 50
  const maxEdgeScore = systemEdges.length * 50
  const score = nodeScore + edgeScore
  const maxScore = maxNodeScore + maxEdgeScore

  const strengthPoints: string[] = []
  const structureAdvice: string[] = []

  if (matchedNodes.length >= systemNodes.length * 0.7)
    strengthPoints.push("핵심 개념을 대부분 포착했습니다.")
  if (edgeAccuracy >= 60)
    strengthPoints.push("개념 간 관계를 잘 파악하고 있습니다.")

  const rootNodes = matchedNodes.filter(
    (m) => m.system.type === "root" && m.user.type === "root"
  )
  if (rootNodes.length > 0)
    strengthPoints.push(
      `핵심 노드 "${rootNodes[0].system.concept}"을 정확히 식별했습니다.`
    )

  if (strengthPoints.length === 0)
    strengthPoints.push("다이어그램을 만들기 시작한 것 자체가 좋은 출발입니다!")

  if (missingConcepts.length > 0)
    structureAdvice.push(
      `아직 다루지 못한 핵심 개념: "${missingConcepts.join('", "')}" — 이 개념들이 저자의 사고에서 어떤 역할을 하는지 생각해 보세요.`
    )

  const wrongTypes = matchedNodes.filter((m) => m.user.type !== m.system.type)
  if (wrongTypes.length > 0) {
    const example = wrongTypes[0]
    const typeLabels: Record<string, string> = {
      root: "핵심(root)",
      anchor: "기둥(anchor)",
      bridge: "다리(bridge)",
      branch: "가지(branch)",
    }
    structureAdvice.push(
      `"${example.user.concept}"의 역할을 다시 생각해 보세요. 이 개념은 텍스트에서 ${typeLabels[example.system.type]}의 역할에 가깝습니다.`
    )
  }

  if (edgeAccuracy < 40 && userEdges.length > 0)
    structureAdvice.push(
      "연결(엣지) 방향과 관계를 재검토하세요. 연결어가 개념 간 어떤 논리적 관계를 나타내는지 다시 읽어보세요."
    )

  if (extraConcepts.length > 0)
    structureAdvice.push(
      `"${extraConcepts.join('", "')}" — 이 개념들은 보조적인 역할이거나 다른 개념에 포함될 수 있습니다. 꼭 필요한 것만 남겨보세요.`
    )

  if (structureAdvice.length === 0)
    structureAdvice.push("훌륭합니다! 분석 모드에서 가치 구조와 시간축을 확인해 보세요.")

  return {
    score,
    maxScore,
    matchedNodes,
    missingConcepts,
    extraConcepts,
    edgeAccuracy,
    structureAdvice,
    strengthPoints,
  }
}

export default function EvaluationPanel() {
  const { currentMap } = useStore()
  const { userNodes, userEdges } = usePracticeStore()

  const result = useMemo(
    () => evaluate(userNodes, userEdges, currentMap.nodes, currentMap.edges),
    [userNodes, userEdges, currentMap.nodes, currentMap.edges]
  )

  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0

  const gradeColor =
    pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#ff6b6b"
  const gradeLabel =
    pct >= 80
      ? "뛰어남"
      : pct >= 60
        ? "양호"
        : pct >= 40
          ? "발전 중"
          : "시작 단계"

  return (
    <div
      className="border-t border-brain-border overflow-y-auto"
      style={{ backgroundColor: "rgba(26,26,46,0.95)", maxHeight: "50%" }}
    >
      <div className="p-4 space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              border: `3px solid ${gradeColor}`,
              color: gradeColor,
              backgroundColor: `${gradeColor}11`,
            }}
          >
            {pct}%
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: gradeColor }}>
              {gradeLabel}
            </p>
            <p className="text-xs" style={{ color: "rgba(224,224,240,0.5)" }}>
              개념 매칭: {result.matchedNodes.length}/{currentMap.nodes.length} | 연결 정확도: {result.edgeAccuracy}%
            </p>
          </div>
        </div>

        {/* Strengths */}
        <div>
          <h3 className="text-xs font-bold mb-1.5" style={{ color: "#34d399" }}>
            잘한 점
          </h3>
          <div className="space-y-1">
            {result.strengthPoints.map((point, i) => (
              <p key={i} className="text-xs leading-relaxed" style={{ color: "rgba(224,224,240,0.7)" }}>
                + {point}
              </p>
            ))}
          </div>
        </div>

        {/* Advice */}
        <div>
          <h3 className="text-xs font-bold mb-1.5" style={{ color: "#fbbf24" }}>
            조언
          </h3>
          <div className="space-y-1.5">
            {result.structureAdvice.map((advice, i) => (
              <p key={i} className="text-xs leading-relaxed" style={{ color: "rgba(224,224,240,0.7)" }}>
                → {advice}
              </p>
            ))}
          </div>
        </div>

        {/* Matched nodes detail */}
        <div>
          <h3 className="text-xs font-bold mb-1.5" style={{ color: "rgba(224,224,240,0.5)" }}>
            개념 매칭 상세
          </h3>
          <div className="space-y-1">
            {result.matchedNodes.map((m) => (
              <div
                key={m.user.id}
                className="flex items-center justify-between text-xs px-2 py-1 rounded"
                style={{ backgroundColor: "#0f0f1a" }}
              >
                <span style={{ color: "#e0e0f0" }}>
                  {m.user.concept}
                  {m.user.concept !== m.system.concept && (
                    <span style={{ color: "rgba(224,224,240,0.3)" }}>
                      {" "}→ {m.system.concept}
                    </span>
                  )}
                </span>
                <span
                  className="font-mono"
                  style={{
                    color: m.score >= 80 ? "#34d399" : m.score >= 50 ? "#fbbf24" : "#ff6b6b",
                  }}
                >
                  {Math.round(m.score)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Next step guide */}
        <div className="rounded p-2.5" style={{ backgroundColor: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(96,165,250,0.8)" }}>
            평가를 확인한 후, 상단의 분석 모드로 전환하여 가치 구조와 시간축 관점도 비교해 보세요.
          </p>
        </div>
      </div>
    </div>
  )
}
