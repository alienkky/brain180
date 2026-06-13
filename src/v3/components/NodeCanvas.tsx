import { useEffect, useRef, useCallback, useState } from "react";
import cytoscape from "cytoscape";
import type { Core } from "cytoscape";
import { useTheme } from "../../v2-shell/useTheme";
import type { V3Node, V3Edge, EdgeDir } from "../types";

// 화살표 방향 순환: 단방향 → 양방향 → 역방향 → 없음 → 단방향
const DIR_CYCLE: Record<EdgeDir, EdgeDir> = {
  forward: "both",
  both: "back",
  back: "none",
  none: "forward",
};

interface Props {
  nodes: V3Node[];
  edges: V3Edge[];
  onChange?: (nodes: V3Node[], edges: V3Edge[]) => void;
  wordBank?: string[];
  readOnly?: boolean;
}

let nodeCounter = 0;
const newId = () => `n${++nodeCounter}_${Date.now()}`;
const newEdgeId = () => `e${++nodeCounter}_${Date.now()}`;

// 노드 겹침 판정 간격 (모델 좌표) — 라벨 노드 평균 크기 기준
const CLEAR_X = 110;
const CLEAR_Y = 48;

// 기존 노드와 겹치지 않는 위치 탐색 — 원하는 지점부터 나선형으로 확장
function findFreePosition(cy: Core, desiredX: number, desiredY: number): { x: number; y: number } {
  const positions = cy.nodes().map((n) => n.position());
  const isFree = (x: number, y: number) =>
    positions.every((p) => Math.abs(p.x - x) > CLEAR_X || Math.abs(p.y - y) > CLEAR_Y);
  if (isFree(desiredX, desiredY)) return { x: desiredX, y: desiredY };
  for (let ring = 1; ring <= 8; ring++) {
    const steps = ring * 8;
    for (let k = 0; k < steps; k++) {
      const ang = (2 * Math.PI * k) / steps;
      const tx = desiredX + Math.cos(ang) * ring * (CLEAR_X + 20);
      const ty = desiredY + Math.sin(ang) * ring * (CLEAR_Y + 16);
      if (isFree(tx, ty)) return { x: tx, y: ty };
    }
  }
  return { x: desiredX, y: desiredY };
}

export function NodeCanvas({ nodes, edges, onChange, wordBank, readOnly }: Props) {
  const { skin } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const cyRef = useRef<Core | null>(null);
  const selectedRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 삭제 칩 — 노드 탭/엣지 롱프레스 시 해당 요소 위에 표시
  const [deleteChip, setDeleteChip] = useState<{ x: number; y: number; kind: "node" | "edge"; id: string } | null>(null);
  const deleteChipRef = useRef(deleteChip);
  deleteChipRef.current = deleteChip;
  // effect 내부 collect 헬퍼를 쓰는 삭제 실행자
  const deleteElRef = useRef<(kind: "node" | "edge", id: string) => void>(() => {});

  // 고아 엣지 제거 — 끝점 노드가 없는 엣지가 하나라도 섞이면 cytoscape add 가
  // throw 하면서 그 뒤 엣지 추가/동기화가 전부 중단된다 (③ 설명 탭 연결선 전멸,
  // ② 시각화 새 노드 미반영의 원인). 과거 버전 잔재가 localStorage 영속으로
  // 살아남을 수 있어 읽기 시점에 정리한다.
  const sanitizeEdges = useCallback((ns: V3Node[], es: V3Edge[]) => {
    const ids = new Set(ns.map((n) => n.id));
    const valid: V3Edge[] = [];
    const dropped: V3Edge[] = [];
    for (const e of es) {
      if (ids.has(e.from) && ids.has(e.to)) valid.push(e);
      else dropped.push(e);
    }
    if (dropped.length > 0) {
      console.warn(
        `[NodeCanvas] 끝점 없는 엣지 ${dropped.length}개 제외:`,
        dropped.map((e) => `${e.id}: ${e.from} -> ${e.to}`)
      );
    }
    return valid;
  }, []);

  // Build cytoscape elements
  const buildElements = useCallback(
    (ns: V3Node[], es: V3Edge[]) => [
      ...ns.map((n) => ({
        data: { id: n.id, label: n.label, kind: n.kind ?? "concept" },
        position: { x: n.x, y: n.y },
      })),
      ...sanitizeEdges(ns, es).map((e) => ({
        data: { id: e.id, source: e.from, target: e.to, label: e.label ?? "", dir: e.dir ?? "forward" },
      })),
    ],
    [sanitizeEdges]
  );

  // Sync state → cytoscape (diff-based)
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
    const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));
    const newNodeIds = new Set(nodes.map((n) => n.id));
    const newEdgeIds = new Set(edges.map((e) => e.id));

    // Remove deleted
    cy.nodes().forEach((n) => {
      if (!newNodeIds.has(n.id())) cy.remove(n);
    });
    cy.edges().forEach((e) => {
      if (!newEdgeIds.has(e.id())) cy.remove(e);
    });

    // Add new
    nodes.forEach((n) => {
      if (!existingNodeIds.has(n.id)) {
        cy.add({
          data: { id: n.id, label: n.label, kind: n.kind ?? "concept" },
          position: { x: n.x, y: n.y },
        });
      } else {
        const node = cy.getElementById(n.id);
        if (node.data("label") !== n.label) node.data("label", n.label);
      }
    });
    sanitizeEdges(nodes, edges).forEach((e) => {
      if (!existingEdgeIds.has(e.id)) {
        cy.add({
          data: { id: e.id, source: e.from, target: e.to, label: e.label ?? "", dir: e.dir ?? "forward" },
        });
      } else {
        const el = cy.getElementById(e.id);
        const dir = e.dir ?? "forward";
        if (el.data("dir") !== dir) el.data("dir", dir);
        if (el.data("label") !== (e.label ?? "")) el.data("label", e.label ?? "");
      }
    });
  }, [nodes, edges, sanitizeEdges]);

  // Init cytoscape once
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(nodes, edges),
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#B85C3F",
            "background-opacity": 0.12,
            "border-color": "#B85C3F",
            "border-width": 2,
            label: "data(label)",
            color: "#1a1a1a",
            "font-size": "13px",
            "text-valign": "center",
            "text-halign": "center",
            "min-zoomed-font-size": 8,
            width: "label",
            height: "label",
            padding: "10px",
            shape: "roundrectangle",
          },
        },
        {
          selector: 'node[kind="target"]',
          style: {
            "background-color": "#4f7942",
            "background-opacity": 0.12,
            "border-color": "#4f7942",
          },
        },
        {
          selector: 'node[kind="lens"]',
          style: {
            "background-color": "#4a6fa5",
            "background-opacity": 0.12,
            "border-color": "#4a6fa5",
          },
        },
        {
          selector: "node.selected-source",
          style: {
            "border-color": "#f59e0b",
            "border-width": 3,
            "background-opacity": 0.25,
          },
        },
        {
          // 드래그/탭 시 기본 회색 음영 제거 → 살짝 커지며 은은한 할로
          selector: "node:active",
          style: {
            "overlay-opacity": 0,
            "underlay-color": "#B85C3F",
            "underlay-opacity": 0.12,
            "underlay-padding": 8,
            "border-width": 2.5,
            padding: "13px",
            "background-opacity": 0.2,
            "transition-property": "padding, border-width, background-opacity",
            "transition-duration": 120,
          },
        },
        {
          selector: 'node[kind="target"]:active',
          style: { "underlay-color": "#4f7942" },
        },
        {
          selector: 'node[kind="lens"]:active',
          style: { "underlay-color": "#4a6fa5" },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#9ca3af",
            "target-arrow-color": "#9ca3af",
            "source-arrow-color": "#9ca3af",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "11px",
            color: "#6b7280",
            "text-background-opacity": 1,
            "text-background-color": "#ffffff",
            "text-background-padding": "2px",
          },
        },
        {
          selector: 'edge[dir="both"]',
          style: { "source-arrow-shape": "triangle" },
        },
        {
          selector: 'edge[dir="back"]',
          style: { "target-arrow-shape": "none", "source-arrow-shape": "triangle" },
        },
        {
          selector: 'edge[dir="none"]',
          style: { "target-arrow-shape": "none" },
        },
        {
          // 엣지 탭 시 회색 음영 제거 → 선 강조로 대체
          selector: "edge:active",
          style: {
            "overlay-opacity": 0,
            width: 3,
            "line-color": "#B85C3F",
            "target-arrow-color": "#B85C3F",
            "source-arrow-color": "#B85C3F",
          },
        },
      ],
      layout: { name: "preset" },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current = cy;

    // 일부 환경에서 초기 페인트에 엣지가 빠지는 현상 — 첫 프레임 뒤 강제 재렌더
    const flushRaf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cyRef.current) {
          cyRef.current.resize();
          cyRef.current.forceRender();
        }
      });
    });

    // 현재 그래프 수집 — dir 포함 (누락 시 드래그/삭제마다 방향 초기화됨)
    const collectNodes = (excludeId?: string): V3Node[] => {
      const arr: V3Node[] = [];
      cy.nodes().forEach((n) => {
        if (n.id() === excludeId) return;
        arr.push({
          id: n.id(),
          label: n.data("label") as string,
          x: n.position("x"),
          y: n.position("y"),
          kind: n.data("kind") as V3Node["kind"],
        });
      });
      return arr;
    };
    const collectEdges = (excludeNodeId?: string): V3Edge[] => {
      const arr: V3Edge[] = [];
      cy.edges().forEach((e) => {
        if (excludeNodeId && (e.data("source") === excludeNodeId || e.data("target") === excludeNodeId)) return;
        arr.push({
          id: e.id(),
          from: e.data("source") as string,
          to: e.data("target") as string,
          label: e.data("label") as string,
          dir: (e.data("dir") as EdgeDir) ?? "forward",
        });
      });
      return arr;
    };

    if (!readOnly) {
      // 삭제 실행자 — 칩 버튼에서 호출
      deleteElRef.current = (kind, id) => {
        if (kind === "node") {
          if (selectedRef.current === id) selectedRef.current = null;
          onChangeRef.current?.(collectNodes(id), collectEdges(id));
        } else {
          onChangeRef.current?.(collectNodes(), collectEdges().filter((e) => e.id !== id));
        }
      };

      // 칩 위치 계산 (rendered 좌표)
      const chipPosForNode = (id: string) => {
        const n = cy.getElementById(id);
        if (n.empty()) return null;
        const rp = n.renderedPosition();
        const h = n.renderedOuterHeight();
        return { x: rp.x, y: rp.y - h / 2 - 14 };
      };

      // 팬/줌/드래그 시 칩 위치 따라가기
      const syncChip = () => {
        const chip = deleteChipRef.current;
        if (!chip) return;
        if (chip.kind === "node") {
          const p = chipPosForNode(chip.id);
          if (!p) setDeleteChip(null);
          else setDeleteChip({ ...chip, ...p });
        } else {
          const e = cy.getElementById(chip.id);
          if (e.empty()) setDeleteChip(null);
          else {
            const mp = e.renderedMidpoint();
            setDeleteChip({ ...chip, x: mp.x, y: mp.y - 14 });
          }
        }
      };
      cy.on("pan zoom resize", syncChip);
      cy.on("position", "node", syncChip);

      // 노드 꾹 누르기: 삭제 칩 표시 (탭 선택과 별개로 바로 삭제 가능)
      let tapholdNodeId: string | null = null;
      cy.on("taphold", "node", (evt) => {
        const id = evt.target.id() as string;
        tapholdNodeId = id;
        const p = chipPosForNode(id);
        if (p) setDeleteChip({ kind: "node", id, ...p });
      });

      // Node click: edge creation via two-click
      cy.on("tap", "node", (evt) => {
        const tappedId = evt.target.id();
        // taphold 후 release 의 tap 은 무시 — 칩 유지, 선택/연결 로직 스킵
        if (tapholdNodeId === tappedId) {
          tapholdNodeId = null;
          return;
        }
        if (selectedRef.current && selectedRef.current !== tappedId) {
          const src = selectedRef.current;
          cy.getElementById(src).removeClass("selected-source");
          selectedRef.current = null;
          setDeleteChip(null);
          // 이미 같은 두 노드를 잇는 엣지가 있으면 중복 생성 대신 방향 순환
          const existing = cy.edges().filter(
            (e) =>
              (e.data("source") === src && e.data("target") === tappedId) ||
              (e.data("source") === tappedId && e.data("target") === src)
          );
          if (existing.length > 0) {
            const targetId = existing[0].id();
            const nextEdges = collectEdges().map((e) =>
              e.id === targetId ? { ...e, dir: DIR_CYCLE[e.dir ?? "forward"] } : e
            );
            onChangeRef.current?.(collectNodes(), nextEdges);
            return;
          }
          const newEdge: V3Edge = { id: newEdgeId(), from: src, to: tappedId, label: "", dir: "forward" };
          onChangeRef.current?.(collectNodes(), [...collectEdges(), newEdge]);
        } else {
          if (selectedRef.current) {
            cy.getElementById(selectedRef.current).removeClass("selected-source");
          }
          selectedRef.current = tappedId;
          evt.target.addClass("selected-source");
          // 삭제 칩은 꾹 누르기(taphold)에서만 — 탭 선택 시엔 표시하지 않음
          setDeleteChip(null);
        }
      });

      // 배경 탭: 선택·삭제 칩 해제
      cy.on("tap", (evt) => {
        if (evt.target !== cy) return;
        if (selectedRef.current) {
          cy.getElementById(selectedRef.current).removeClass("selected-source");
          selectedRef.current = null;
        }
        setDeleteChip(null);
      });

      // taphold 후 손을 떼면 같은 엣지에 tap 도 발화됨 — 그 tap 이 칩을 지우고
      // 방향까지 돌려버리므로, taphold 직후의 tap 한 번은 무시한다.
      let tapholdEdgeId: string | null = null;

      // 화살표(엣지) 탭: 방향 순환 — 단방향 → 양방향 → 역방향 → 없음
      cy.on("tap", "edge", (evt) => {
        const id = evt.target.id();
        if (tapholdEdgeId === id) {
          tapholdEdgeId = null;
          return; // 삭제 칩 유지
        }
        setDeleteChip(null);
        const nextEdges = collectEdges().map((e) =>
          e.id === id ? { ...e, dir: DIR_CYCLE[e.dir ?? "forward"] } : e
        );
        onChangeRef.current?.(collectNodes(), nextEdges);
      });

      // 엣지 길게 누르기: 삭제 칩 표시
      cy.on("taphold", "edge", (evt) => {
        tapholdEdgeId = evt.target.id();
        const mp = evt.target.renderedMidpoint();
        setDeleteChip({ kind: "edge", id: evt.target.id(), x: mp.x, y: mp.y - 14 });
      });

      // Double-click on background: add node
      cy.on("dbltap", (evt) => {
        if (evt.target !== cy) return;
        const label = window.prompt("노드 이름 입력:");
        if (!label?.trim()) return;
        const pos = findFreePosition(cy, evt.position.x, evt.position.y);
        const newNode: V3Node = {
          id: newId(),
          label: label.trim(),
          x: pos.x,
          y: pos.y,
          kind: "concept",
        };
        onChangeRef.current?.([...collectNodes(), newNode], collectEdges());
      });

      // Right-click: delete node
      cy.on("cxttap", "node", (evt) => {
        const id = evt.target.id();
        if (selectedRef.current === id) selectedRef.current = null;
        setDeleteChip(null);
        onChangeRef.current?.(collectNodes(id), collectEdges(id));
      });

      // 스마트 가이드: 드래그 중 다른 노드와 X/Y 중심 정렬 시 스냅 + 가이드라인
      const clearGuides = () => {
        const canvas = guideRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      };

      const drawGuides = (snapX: number | null, snapY: number | null) => {
        const canvas = guideRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        // 컨테이너 크기와 동기화 (리사이즈 대응)
        if (canvas.width !== container.clientWidth) canvas.width = container.clientWidth;
        if (canvas.height !== container.clientHeight) canvas.height = container.clientHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (snapX === null && snapY === null) return;
        const zoom = cy.zoom();
        const pan = cy.pan();
        ctx.strokeStyle = "#e879a0";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        if (snapX !== null) {
          const rx = snapX * zoom + pan.x;
          ctx.beginPath();
          ctx.moveTo(rx, 0);
          ctx.lineTo(rx, canvas.height);
          ctx.stroke();
        }
        if (snapY !== null) {
          const ry = snapY * zoom + pan.y;
          ctx.beginPath();
          ctx.moveTo(0, ry);
          ctx.lineTo(canvas.width, ry);
          ctx.stroke();
        }
      };

      // 좌/중/우 · 상/중/하 — 끝과 끝, 끝과 중심 모든 조합 정렬 (포토샵 스마트 가이드)
      //
      // cytoscape 드래그는 "이전 위치 + 포인터 이동량"이라, 스냅으로 옮긴 위치가
      // 다음 이벤트의 기준이 되어 한 번 붙으면 임계값 이상 튕겨야만 탈출하는
      // 끈적임이 생긴다. 직전에 적용한 스냅 보정량(snapOffset)을 기억했다가
      // 매 이벤트마다 빼서 "포인터를 그대로 따라간 가상 위치"를 복원해 판정 —
      // 포인터가 임계 밖이면 즉시 풀린다.
      let snapOffset = { x: 0, y: 0 };
      cy.on("grab", "node", () => {
        snapOffset = { x: 0, y: 0 };
      });
      cy.on("drag", "node", (evt) => {
        const node = evt.target;
        const thresh = 6 / cy.zoom(); // 화면 기준 6px
        const cur = node.position();
        // 스냅 보정 제거 → 포인터 추종 가상 위치
        const vx = cur.x - snapOffset.x;
        const vy = cur.y - snapOffset.y;
        const bb = node.boundingBox({ includeLabels: false, includeOverlays: false });
        // bb 는 현재(스냅된) 위치 기준 → 가상 위치 기준으로 평행이동
        const offX = vx - cur.x;
        const offY = vy - cur.y;
        const dragXs = [bb.x1 + offX, (bb.x1 + bb.x2) / 2 + offX, bb.x2 + offX];
        const dragYs = [bb.y1 + offY, (bb.y1 + bb.y2) / 2 + offY, bb.y2 + offY];
        let shiftX: number | null = null;
        let shiftY: number | null = null;
        let guideX: number | null = null;
        let guideY: number | null = null;
        let bestDx = thresh;
        let bestDy = thresh;
        cy.nodes().forEach((o) => {
          if (o.id() === node.id()) return;
          const ob = o.boundingBox({ includeLabels: false, includeOverlays: false });
          const otherXs = [ob.x1, (ob.x1 + ob.x2) / 2, ob.x2];
          const otherYs = [ob.y1, (ob.y1 + ob.y2) / 2, ob.y2];
          for (const dx of dragXs) {
            for (const ox of otherXs) {
              const d = Math.abs(ox - dx);
              if (d <= bestDx) { bestDx = d; shiftX = ox - dx; guideX = ox; }
            }
          }
          for (const dy of dragYs) {
            for (const oy of otherYs) {
              const d = Math.abs(oy - dy);
              if (d <= bestDy) { bestDy = d; shiftY = oy - dy; guideY = oy; }
            }
          }
        });
        node.position({ x: vx + (shiftX ?? 0), y: vy + (shiftY ?? 0) });
        snapOffset = { x: shiftX ?? 0, y: shiftY ?? 0 };
        drawGuides(guideX, guideY);
      });

      cy.on("free", "node", clearGuides);

      // Drag end: sync positions
      cy.on("dragfree", "node", () => {
        clearGuides();
        onChangeRef.current?.(collectNodes(), collectEdges());
      });
    }

    if (readOnly) {
      // 읽기전용 캔버스도 노드 이동(드래그)은 가능 — 위치를 저장해 ②와 연동.
      // (onChange 를 안 넘기는 참고용 캔버스는 그대로 저장 안 됨)
      cy.on("dragfree", "node", () => {
        onChangeRef.current?.(collectNodes(), collectEdges());
      });
    }

    // 읽기전용(참고용) 캔버스: 저장된 좌표가 화면 밖이어도 전체가 보이게 맞춤
    if (readOnly && cy.elements().length > 0) {
      cy.fit(undefined, 30);
    }

    // 컨테이너 크기 변화 추적 — cytoscape 는 자동 리사이즈를 안 함.
    // SplitPane 드래그/탭 전환 직후 크기 0→실측 전환 시 빈 캔버스로 남는 문제 방지.
    const ro = new ResizeObserver(() => {
      cy.resize();
      if (readOnly && cy.elements().length > 0) cy.fit(undefined, 30);
    });
    ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(flushRaf);
      ro.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 테마(스킨) 색상 동기화 — 노드 글자/엣지 라벨이 하드코딩 색이면 다크 모드에서 안 보임
  useEffect(() => {
    const cy = cyRef.current;
    const el = containerRef.current;
    if (!cy || !el) return;
    const css = getComputedStyle(el);
    const text = css.getPropertyValue("--color-brain-text").trim() || "#1a1a1a";
    const muted = css.getPropertyValue("--color-brain-text-muted").trim() || "#6b7280";
    const surface = css.getPropertyValue("--color-brain-surface").trim() || "#ffffff";
    cy.style()
      .selector("node")
      .style({ color: text })
      .selector("edge")
      .style({ color: muted, "text-background-color": surface })
      .update();
  }, [skin]);

  // Add node from word bank drop
  const handleWordClick = useCallback(
    (word: string) => {
      const cy = cyRef.current;
      if (!cy) return;
      const viewport = cy.extent();
      const { x, y } = findFreePosition(
        cy,
        (viewport.x1 + viewport.x2) / 2,
        (viewport.y1 + viewport.y2) / 2
      );
      const newNode: V3Node = { id: newId(), label: word, x, y, kind: "concept" };
      const currentNodes: V3Node[] = [];
      cy.nodes().forEach((n) => {
        currentNodes.push({
          id: n.id(),
          label: n.data("label") as string,
          x: n.position("x"),
          y: n.position("y"),
          kind: n.data("kind") as V3Node["kind"],
        });
      });
      const currentEdges: V3Edge[] = [];
      cy.edges().forEach((e) => {
        currentEdges.push({
          id: e.id(),
          from: e.data("source") as string,
          to: e.data("target") as string,
          label: e.data("label") as string,
          dir: (e.data("dir") as EdgeDir) ?? "forward",
        });
      });
      onChangeRef.current?.([...currentNodes, newNode], currentEdges);
    },
    []
  );

  return (
    <div className="flex flex-col h-full gap-2">
      {wordBank && wordBank.length > 0 && !readOnly && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-brain-surface-soft rounded-lg border border-brain-border">
          <span className="text-xs text-brain-text-muted self-center mr-1">단어뱅크:</span>
          {wordBank.map((w) => (
            <button
              key={w}
              onClick={() => handleWordClick(w)}
              className="px-2 py-0.5 text-xs rounded-full bg-brain-surface border border-brain-border hover:border-brain-accent hover:bg-brain-accent-soft transition-colors"
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {!readOnly && (
        <p className="text-[11px] text-brain-text-soft px-1">
          더블클릭 → 노드 추가 · 노드 탭 후 다른 노드 탭 → 연결 · 화살표 탭 → 방향 순환(→/↔/←/없음) · 노드 탭 → ✕ 삭제 칩 · 화살표 꾹 누르기 → ✕ 삭제 칩
        </p>
      )}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="h-full rounded-lg border border-brain-border bg-brain-surface" />
        {/* 스마트 가이드 오버레이 — 드래그 정렬선 */}
        <canvas
          ref={guideRef}
          className="pointer-events-none absolute inset-0 rounded-lg"
        />
        {/* 삭제 칩 — 선택된 노드/롱프레스한 엣지 위 */}
        {deleteChip && !readOnly && (
          <button
            onClick={() => {
              deleteElRef.current(deleteChip.kind, deleteChip.id);
              setDeleteChip(null);
            }}
            className="absolute z-10 flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-medium text-white shadow-md hover:bg-red-600 transition-colors"
            style={{
              left: deleteChip.x,
              top: deleteChip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            ✕ 삭제
          </button>
        )}
      </div>
    </div>
  );
}
