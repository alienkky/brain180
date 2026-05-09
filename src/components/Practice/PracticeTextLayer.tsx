import { useRef } from "react"
import { useStore } from "../../store/useStore"
import { usePracticeStore } from "../../store/usePracticeStore"

export default function PracticeTextLayer() {
  const { currentMap } = useStore()
  const { circledWords, toggleCircle } = usePracticeStore()
  const dragWord = useRef<string | null>(null)

  const { textSource } = currentMap
  const words = textSource.fullText.split(/(\s+)/).flatMap((chunk, ci) => {
    if (/^\s+$/.test(chunk)) return [{ key: `ws-${ci}`, text: chunk, isSpace: true }]
    const tokens: { key: string; text: string; isSpace: boolean }[] = []
    const parts = chunk.match(/[가-힣A-Za-z0-9]+|[^\s가-힣A-Za-z0-9]+/g) ?? [chunk]
    parts.forEach((part, pi) => {
      tokens.push({ key: `w-${ci}-${pi}`, text: part, isSpace: false })
    })
    return tokens
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-brain-border">
        <h2 className="text-lg font-semibold" style={{ color: "#e0e0f0" }}>
          {textSource.title}
        </h2>
        <p className="text-xs mt-1" style={{ color: "rgba(224,224,240,0.5)" }}>
          단어를 클릭하여 동그라미 표시 → 드래그하여 캔버스에 놓기
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-base leading-10 select-none">
          {words.map((w) => {
            if (w.isSpace) return <span key={w.key}>{w.text}</span>

            const isCircled = circledWords.has(w.key)
            const isPunct = /^[^\w가-힣]+$/.test(w.text)
            if (isPunct) return <span key={w.key}>{w.text}</span>

            return (
              <span
                key={w.key}
                draggable={isCircled}
                onClick={() => toggleCircle(w.key)}
                onDragStart={(e) => {
                  dragWord.current = w.text
                  e.dataTransfer.setData("text/plain", w.text)
                  e.dataTransfer.setData("application/brain180-word", w.key)
                  e.dataTransfer.effectAllowed = "copy"
                }}
                className="cursor-pointer px-0.5 rounded-sm inline-block"
                style={{
                  transition: "all 0.15s ease",
                  border: isCircled ? "2px solid #ff6b6b" : "2px solid transparent",
                  borderRadius: isCircled ? "9999px" : "2px",
                  backgroundColor: isCircled ? "rgba(255,107,107,0.15)" : "transparent",
                  padding: isCircled ? "1px 6px" : "1px 2px",
                  cursor: isCircled ? "grab" : "pointer",
                  color: isCircled ? "#ffd93d" : "#e0e0f0",
                }}
              >
                {w.text}
              </span>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-brain-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(224,224,240,0.5)" }}>
            <span
              className="inline-block w-4 h-4 rounded-full border-2"
              style={{ borderColor: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.15)" }}
            />
            <span>동그라미 표시된 단어: {circledWords.size}개</span>
          </div>
          <span className="text-xs" style={{ color: "rgba(224,224,240,0.35)" }}>
            클릭 = 동그라미 | 드래그 = 캔버스로
          </span>
        </div>
      </div>
    </div>
  )
}
