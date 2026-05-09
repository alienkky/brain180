export type NodeType = "root" | "anchor" | "bridge" | "branch"
export type Dimensionality = 1 | 2 | 3 | 4
export type EdgeRelation = "causes" | "supports" | "contrasts" | "transforms" | "contains"
export type Field = "science" | "philosophy" | "literature" | "art" | "economics" | "eastern"
export type CreatedBy = "system" | "user"
export type Perspective = "cognitive" | "value" | "temporal"
export type ValueType = "truth" | "beauty" | "goodness" | "freedom" | "love" | "power" | "wisdom" | "connection"

export interface CognitiveNode {
  id: string
  concept: string
  type: NodeType
  dimensionality: Dimensionality
  description?: string
  valueType?: ValueType
  valueDescription?: string
  temporalPhase?: number
}

export interface CognitiveEdge {
  from: string
  to: string
  relation: EdgeRelation
  temporalOrder: number
  label?: string
}

export interface TextSegment {
  id: string
  text: string
  nodeIds: string[]
  temporalPhase?: number
}

export interface Connective {
  word: string
  role: string
}

export interface TextExcerpt {
  title: string
  author: string
  field: Field
  fullText: string
  segments: TextSegment[]
  connectives: Connective[]
}

export interface Pattern {
  id: string
  name: string
  description: string
  involvedNodes: string[]
  perspective: Perspective
}

export interface Layer {
  id: string
  name: string
  depth: number
  nodeIds: string[]
}

export interface CognitiveMap {
  id: string
  textSource: TextExcerpt
  nodes: CognitiveNode[]
  edges: CognitiveEdge[]
  layers: Layer[]
  patterns: Pattern[]
  createdBy: CreatedBy
}
