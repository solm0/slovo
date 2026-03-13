import { useEffect, useState } from "react"
import "./App.css"

type Point = [number, number]

type Glyph = {
  a: Point[]
  b: Point[]
  w: number
}

// glyphs.json은 빌드 전에 extract.py로 생성 → public/glyphs.json
let allGlyphs: Record<string, Glyph> | null = null

async function loadAllGlyphs(): Promise<Record<string, Glyph>> {
  if (allGlyphs) return allGlyphs
  const res = await fetch(`${import.meta.env.BASE_URL}glyphs.json`)
  allGlyphs = await res.json()
  return allGlyphs!
}

function App() {

  useEffect(() => {

    const canvas = document.getElementById("c") as HTMLCanvasElement
    const ctx = canvas.getContext("2d")!

    const off = document.createElement("canvas")
    off.width = canvas.width
    off.height = canvas.height
    const octx = off.getContext("2d")!

    const blurLayer     = document.getElementById("blurLayer")     as HTMLDivElement
    const contrastLayer = document.getElementById("contrastLayer") as HTMLDivElement
    const invertLayer   = document.getElementById("invertLayer")   as HTMLDivElement

    const input            = document.getElementById("text")         as HTMLInputElement
    const easeSlider       = document.getElementById("ease")         as HTMLInputElement
    const blurSlider       = document.getElementById("blur")         as HTMLInputElement
    const contrastSlider   = document.getElementById("contrast")     as HTMLInputElement
    const invertSlider     = document.getElementById("invertColor")  as HTMLInputElement
    const strokeWidthSlider= document.getElementById("strokeWidth")  as HTMLInputElement
    const bgColorPicker    = document.getElementById("bgColor")      as HTMLInputElement
    const strokeColorPicker= document.getElementById("strokeColor")  as HTMLInputElement
    const fontColorPicker  = document.getElementById("fontColor")    as HTMLInputElement

    // 로컬 캐시 — 이미 꺼낸 글리프만 보관
    let glyphs: Record<string, Glyph> = {}
    let text = ""
    let t = 0

    input.addEventListener("input", updateText)
    updateText()

    /* ---------------- load glyphs ---------------- */

    async function updateText(): Promise<void> {

      const newText = input.value
      const all = await loadAllGlyphs()

      for (const c of newText) {
        if (glyphs[c]) continue
        if (all[c]) glyphs[c] = all[c]
        // 폰트에 없는 문자는 조용히 스킵
      }

      text = newText
    }

    /* ---------------- easing ---------------- */

    function ease(x: number): number {
      const strength = parseFloat(easeSlider.value)
      const k = 1 + strength * 6
      if (x < 0.5) {
        return 0.5 * Math.pow(x * 2, k)
      } else {
        return 1 - 0.5 * Math.pow((1 - x) * 2, k)
      }
    }

    /* ---------------- interpolation ---------------- */

    function interp(a: number, b: number, t: number): number {
      return a + (b - a) * t
    }

    /* ---------------- draw glyph ---------------- */

    function drawGlyph(pointsA: Point[], pointsB: Point[], xOffset: number) {

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

        octx.fillStyle = fontColorPicker.value
        octx.fill()

        const lineWidth = Number(strokeWidthSlider.value)
        octx.lineWidth = lineWidth
        octx.strokeStyle = strokeColorPicker.value
        if (lineWidth > 0) octx.stroke()
      }
    }

    /* ---------------- render ---------------- */

    function render() {
      octx.fillStyle = bgColorPicker.value
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

    /* ---------------- filters ---------------- */

    function updateFilters() {
      blurLayer.style.backdropFilter     = `blur(${blurSlider.value}px)`
      contrastLayer.style.backdropFilter = `contrast(${contrastSlider.value})`
      invertLayer.style.backgroundColor  = invertSlider.value
    }

    /* ---------------- animation ---------------- */

    function loop() {
      const raw = (Math.sin(Date.now() * 0.002) + 1) / 2
      t = ease(raw)
      updateFilters()
      render()
      requestAnimationFrame(loop)
    }

    loop()

  }, [])

  const [invert, setInvert] = useState(true)

  return (
    <>
      <input id="text" defaultValue="шрифт" />

      <div id="controls" className="mt-[20px]">
        <label>ease</label>
        <input type="range" id="ease" min="0" max="1" step="0.01" defaultValue="0.6" />

        <label>blur</label>
        <input type="range" id="blur" min="0" max="6" step="0.1" defaultValue="4" />

        <label>contrast</label>
        <input type="range" id="contrast" min="1" max="20" step="0.1" defaultValue="10" />

        <label>stroke width</label>
        <input type="range" id="strokeWidth" min="0" max="10" step="0.1" defaultValue="4" />

        <label>background color</label>
        <input type="color" id="bgColor" name="bgColor" defaultValue="#ffffff" />

        <label>font color</label>
        <input type="color" id="fontColor" name="fontColor" defaultValue="#000000" />

        <label>stroke color</label>
        <input type="color" id="strokeColor" name="strokeColor" defaultValue="#000000" />

        <label>invert filter</label>
        <input
          type="checkbox"
          checked={invert}
          onChange={() => setInvert(v => !v)}
        />

        <label>invert filter color</label>
        <input type="color" id="invertColor" name="invertColor" defaultValue="#262626" />
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

        <div style={{
          position: "relative",
          width: "900px",
          height: "400px",
          filter: "url(#posterize)"
        }}>
          <canvas id="c" width="900" height="400" className="absolute left-0 top-0 border-1" />
        </div>

        <div id="blurLayer"     className="absolute left-0 top-0 w-[900px] h-[400px] pointer-events-none" />
        <div id="contrastLayer" className="absolute left-0 top-0 w-[900px] h-[400px] pointer-events-none" />
        <div id="invertLayer"   className={`
          absolute left-0 top-0 w-[900px] h-[400px] pointer-events-none mix-blend-difference
          ${invert ? "block" : "hidden"}
        `} />
      </div>
    </>
  )
}

export default App