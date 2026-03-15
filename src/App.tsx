import { useEffect, useRef, useState } from "react"
import "./App.css"

type Point = [number, number]

type Glyph = {
  a: Point[]
  b: Point[]
  w: number
}

type Preset = {
  name: string
  blur: number
  contrast: number
  strokeWidth: number
  bgColor: string
  fontColor: string
  strokeColor: string
  invert: boolean
  invertColor: string
}

const PRESETS: Preset[] = [
  { name: "blood",   blur: 6.0,   contrast: 5.2,  strokeWidth: 4.9, bgColor: "#ffe5e5", fontColor: "#ffc1c1", strokeColor: "#9d8082", invert: false,  invertColor: "#262626" },
  { name: "lava lamp",    blur: 4.1,   contrast: 20.0, strokeWidth: 3.0, bgColor: "#ffffff", fontColor: "#e56667", strokeColor: "#00ff05", invert: true,   invertColor: "#3a3a3a" },
  { name: "vinegar",     blur: 6.0,   contrast: 20.0, strokeWidth: 2.0, bgColor: "#b9b9b9", fontColor: "#bb67bf", strokeColor: "#3eff17", invert: false,  invertColor: "#0d0020" },
  { name: "terminal",     blur: 4.7,   contrast: 6.6,  strokeWidth: 4.7, bgColor: "#000000", fontColor: "#6f4770", strokeColor: "#72ff78", invert: false, invertColor: "#262626" },
  { name: "caterpillar", blur: 3.0,   contrast: 15.5,    strokeWidth: 2.6, bgColor: "#4c0000", fontColor: "#e68aea", strokeColor: "#6afd71", invert: true,  invertColor: "#e5e5e5" },
  { name: "noctiluca",    blur: 3.6,   contrast: 8.3,   strokeWidth: 4.7, bgColor: "#936033", fontColor: "#2992ab", strokeColor: "#b3a4a3", invert: false, invertColor: "#262626" },
  { name: "glacier",    blur: 4.8,   contrast: 2.6,   strokeWidth: 4.1, bgColor: "#cf9eff", fontColor: "#000000", strokeColor: "#00d5ff", invert: false, invertColor: "#262626" },
  { name: "spiral mesh",    blur: 4.3,   contrast: 20.0,   strokeWidth: 3.2, bgColor: "#ff9494", fontColor: "#999999", strokeColor: "#ffffff", invert: true, invertColor: "#808080" },
  { name: "heatwave",    blur: 6.0,   contrast: 9.3,   strokeWidth: 8.4, bgColor: "#e75c5c", fontColor: "#642ffa", strokeColor: "#8aa2cf", invert: true, invertColor: "#3a3a3a" },
]

let allGlyphs: Record<string, Glyph> | null = null

async function loadAllGlyphs(): Promise<Record<string, Glyph>> {
  if (allGlyphs) return allGlyphs
  const res = await fetch(`${import.meta.env.BASE_URL}glyphs.json`)
  allGlyphs = await res.json()
  return allGlyphs!
}

export default function App() {
  const [activePreset, setActivePreset] = useState(0)

  // 모든 값을 state로 관리 → 렌더링에 반영 + 캔버스 루프에 ref로 전달
  const [ease,        setEase]        = useState(0.6)
  const [blur,        setBlur]        = useState(PRESETS[0].blur)
  const [contrast,    setContrast]    = useState(PRESETS[0].contrast)
  const [strokeWidth, setStrokeWidth] = useState(PRESETS[0].strokeWidth)
  const [bgColor,     setBgColor]     = useState(PRESETS[0].bgColor)
  const [fontColor,   setFontColor]   = useState(PRESETS[0].fontColor)
  const [strokeColor, setStrokeColor] = useState(PRESETS[0].strokeColor)
  const [invert,      setInvert]      = useState(PRESETS[0].invert)
  const [invertColor, setInvertColor] = useState(PRESETS[0].invertColor)

  // 캔버스 루프용 refs (state는 클로저에서 stale해지므로)
  const easeRef        = useRef(ease)
  const blurRef        = useRef(blur)
  const contrastRef    = useRef(contrast)
  const strokeWidthRef = useRef(strokeWidth)
  const bgColorRef     = useRef(bgColor)
  const fontColorRef   = useRef(fontColor)
  const strokeColorRef = useRef(strokeColor)
  const invertRef      = useRef(invert)
  const invertColorRef = useRef(invertColor)

  // state가 바뀔 때마다 ref 동기화
  useEffect(() => { easeRef.current        = ease        }, [ease])
  useEffect(() => { blurRef.current        = blur        }, [blur])
  useEffect(() => { contrastRef.current    = contrast    }, [contrast])
  useEffect(() => { strokeWidthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { bgColorRef.current     = bgColor     }, [bgColor])
  useEffect(() => { fontColorRef.current   = fontColor   }, [fontColor])
  useEffect(() => { strokeColorRef.current = strokeColor }, [strokeColor])
  useEffect(() => { invertRef.current      = invert      }, [invert])
  useEffect(() => { invertColorRef.current = invertColor }, [invertColor])

  function applyPreset(index: number) {
    const p = PRESETS[index]
    setActivePreset(index)
    setBlur(p.blur)
    setContrast(p.contrast)
    setStrokeWidth(p.strokeWidth)
    setBgColor(p.bgColor)
    setFontColor(p.fontColor)
    setStrokeColor(p.strokeColor)
    setInvert(p.invert)
    setInvertColor(p.invertColor)
  }

  useEffect(() => {
    const canvas = document.getElementById("c") as HTMLCanvasElement
    const ctx    = canvas.getContext("2d")!

    const off  = document.createElement("canvas")
    off.width  = canvas.width
    off.height = canvas.height
    const octx = off.getContext("2d")!

    const blurLayer     = document.getElementById("blurLayer")     as HTMLDivElement
    const contrastLayer = document.getElementById("contrastLayer") as HTMLDivElement
    const invertLayer   = document.getElementById("invertLayer")   as HTMLDivElement
    const inputEl       = document.getElementById("text")          as HTMLInputElement

    let glyphs: Record<string, Glyph> = {}
    let text = ""
    let t    = 0

    inputEl.addEventListener("input", updateText)
    updateText()

    async function updateText(): Promise<void> {
      const newText = inputEl.value
      const all     = await loadAllGlyphs()
      for (const c of newText) {
        if (glyphs[c]) continue
        if (all[c]) glyphs[c] = all[c]
      }
      text = newText
    }

    function easeFn(x: number): number {
      const k = 1 + easeRef.current * 6
      return x < 0.5
        ? 0.5 * Math.pow(x * 2, k)
        : 1 - 0.5 * Math.pow((1 - x) * 2, k)
    }

    function interp(a: number, b: number, t: number): number {
      return a + (b - a) * t
    }

    function drawGlyph(pointsA: Point[], pointsB: Point[], xOffset: number) {
      const lw = strokeWidthRef.current
      for (let i = 0; i < pointsA.length; i += 4) {
        if (!pointsA[i + 3]) break
        const p1 = pointsA[i],     p2 = pointsA[i + 1]
        const p3 = pointsA[i + 2], p4 = pointsA[i + 3]
        const q1 = pointsB[i],     q2 = pointsB[i + 1]
        const q3 = pointsB[i + 2], q4 = pointsB[i + 3]

        const x1 = interp(p1[0], q1[0], t) * 0.2 + xOffset
        const y1 = 300 - interp(p1[1], q1[1], t) * 0.2
        const x2 = interp(p2[0], q2[0], t) * 0.2 + xOffset
        const y2 = 300 - interp(p2[1], q2[1], t) * 0.2
        const x3 = interp(p3[0], q3[0], t) * 0.2 + xOffset
        const y3 = 300 - interp(p3[1], q3[1], t) * 0.2
        const x4 = interp(p4[0], q4[0], t) * 0.2 + xOffset
        const y4 = 300 - interp(p4[1], q4[1], t) * 0.2

        octx.beginPath()
        octx.moveTo(x1, y1)
        octx.lineTo(x2, y2)
        octx.lineTo(x3, y3)
        octx.lineTo(x4, y4)
        octx.closePath()

        octx.fillStyle = fontColorRef.current
        octx.fill()
        octx.lineWidth   = lw
        octx.strokeStyle = strokeColorRef.current
        if (lw > 0) octx.stroke()
      }
    }

    function render() {
      octx.fillStyle = bgColorRef.current
      octx.fillRect(0, 0, canvas.width, canvas.height)
      let xOffset = 50
      for (const c of text) {
        if (!glyphs[c]) continue
        const g = glyphs[c]
        drawGlyph(g.a, g.b, xOffset)
        xOffset += g.w * 0.2
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(off, 0, 0)
    }

    function updateFilters() {
      blurLayer.style.backdropFilter     = `blur(${blurRef.current}px)`
      contrastLayer.style.backdropFilter = `contrast(${contrastRef.current})`
      invertLayer.style.backgroundColor  = invertColorRef.current
      invertLayer.style.display          = invertRef.current ? "block" : "none"
    }

    function loop() {
      const raw = (Math.sin(Date.now() * 0.002) + 1) / 2
      t = easeFn(raw)
      updateFilters()
      render()
      requestAnimationFrame(loop)
    }

    loop()
  }, [])

  return (
    <>
      <input id="text" defaultValue="шрифт" />

      <div id="presets">
        {PRESETS.map((p, i) => (
          <button
            key={p.name}
            className={`preset-btn ${activePreset === i ? "active" : ""}`}
            style={{ "--preset-bg": p.bgColor, "--preset-fg": p.fontColor } as React.CSSProperties}
            onClick={() => applyPreset(i)}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div id="controls" className="mt-[20px]">

        <label>ease</label>
        <input type="range" min="0" max="1" step="0.01" value={ease} onChange={e => setEase(Number(e.target.value))} />
        <span className="val">{ease.toFixed(2)}</span>

        <label>blur</label>
        <input type="range" min="0" max="6" step="0.1" value={blur} onChange={e => setBlur(Number(e.target.value))} />
        <span className="val">{blur.toFixed(1)}</span>

        <label>contrast</label>
        <input type="range" min="1" max="20" step="0.1" value={contrast} onChange={e => setContrast(Number(e.target.value))} />
        <span className="val">{contrast.toFixed(1)}</span>

        <label>stroke width</label>
        <input type="range" min="0" max="10" step="0.1" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} />
        <span className="val">{strokeWidth.toFixed(1)}</span>

        <label>background color</label>
        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} />
        <span className="val">{bgColor}</span>

        <label>font color</label>
        <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} />
        <span className="val">{fontColor}</span>

        <label>stroke color</label>
        <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} />
        <span className="val">{strokeColor}</span>

        <label>invert filter</label>
        <input type="checkbox" checked={invert} onChange={() => setInvert(v => !v)} />
        <span className="val">{invert ? "on" : "off"}</span>

        <label>invert filter color</label>
        <input type="color" value={invertColor} onChange={e => setInvertColor(e.target.value)} />
        <span className="val">{invertColor}</span>

      </div>

      <div id="stage" className="relative w-[900px] h-[400px]">
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="posterize">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 0.5 1" />
              <feFuncG type="discrete" tableValues="0 0.5 1" />
              <feFuncB type="discrete" tableValues="0 0.5 1" />
            </feComponentTransfer>
          </filter>
        </svg>

        <div style={{ position: "relative", width: "900px", height: "400px", filter: "url(#posterize)" }}>
          <canvas id="c" width="900" height="400" className="absolute left-0 top-0" />
        </div>

        <div id="blurLayer"     className="absolute left-0 top-0 w-[900px] h-[400px] pointer-events-none" />
        <div id="contrastLayer" className="absolute left-0 top-0 w-[900px] h-[400px] pointer-events-none" />
        <div
          id="invertLayer"
          className="absolute left-0 top-0 w-[900px] h-[400px] pointer-events-none mix-blend-difference"
          style={{ display: invert ? "block" : "none" }}
        />
      </div>
    </>
  )
}