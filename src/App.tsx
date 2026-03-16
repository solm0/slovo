import { useEffect, useRef, useState } from "react"
import "./App.css"

type Point = [number, number]
type Glyph  = { a: Point[]; b: Point[]; w: number }

type StylePreset = {
  name: string
  blur: number; contrast: number; strokeWidth: number
  bgColor: string; fontColor: string; strokeColor: string
  invert: boolean; invertColor: string
}

type TextPreset = { label: string; text: string }

/* ─────────────────────────────── STYLE PRESETS ─────────────────────────────── */
const STYLE_PRESETS: StylePreset[] = [
  { name:"ink",                blur:3.5,contrast:20.0,strokeWidth:0.0,bgColor:"#ffffff",fontColor:"#000000",strokeColor:"#ffffff",invert:true,  invertColor:"#2b2b2b" },
  { name:"blood",              blur:6.0,contrast:5.2, strokeWidth:4.9,bgColor:"#ffe5e5",fontColor:"#ffc1c1",strokeColor:"#9d8082",invert:false, invertColor:"#262626" },
  { name:"lava lamp",          blur:4.1,contrast:20.0,strokeWidth:3.0,bgColor:"#ffffff",fontColor:"#e56667",strokeColor:"#00ff05",invert:true,  invertColor:"#3a3a3a" },
  { name:"balsamic vinegar",   blur:6.0,contrast:20.0,strokeWidth:2.0,bgColor:"#b9b9b9",fontColor:"#bb67bf",strokeColor:"#3eff17",invert:false, invertColor:"#0d0020" },
  { name:"terminal",           blur:4.7,contrast:6.6, strokeWidth:4.7,bgColor:"#000000",fontColor:"#6f4770",strokeColor:"#72ff78",invert:false, invertColor:"#262626" },
  { name:"cactus flower",      blur:3.0,contrast:15.5,strokeWidth:2.6,bgColor:"#4c0000",fontColor:"#e68aea",strokeColor:"#52ff5a",invert:true,  invertColor:"#e5e5e5" },
  { name:"noctiluca",          blur:3.6,contrast:8.3, strokeWidth:4.7,bgColor:"#936033",fontColor:"#2992ab",strokeColor:"#b3a4a3",invert:true,  invertColor:"#000b24" },
  { name:"glacier",            blur:4.8,contrast:2.6, strokeWidth:4.1,bgColor:"#cf9eff",fontColor:"#000000",strokeColor:"#00d5ff",invert:false, invertColor:"#262626" },
  { name:"spiral mesh",        blur:4.3,contrast:20.0,strokeWidth:3.2,bgColor:"#ff9494",fontColor:"#999999",strokeColor:"#ffffff",invert:true,  invertColor:"#808080" },
  { name:"heatwave",           blur:6.0,contrast:9.3, strokeWidth:8.4,bgColor:"#e75c5c",fontColor:"#642ffa",strokeColor:"#8aa2cf",invert:true,  invertColor:"#3a3a3a" },
  { name:"orthogonal",         blur:0.0,contrast:20.0,strokeWidth:0.9,bgColor:"#000000",fontColor:"#000000",strokeColor:"#e0e7ff",invert:false, invertColor:"#40464f" },
  { name:"molecular dynamics", blur:3.2,contrast:10.8,strokeWidth:3.8,bgColor:"#936033",fontColor:"#559daf",strokeColor:"#c39b98",invert:false, invertColor:"#40464f" },
]

/* ─────────────────────────────── TEXT PRESETS ──────────────────────────────── */
const TEXT_PRESETS: TextPreset[] = [
  // pangrams – 5 different lengths
  { label:"pangram·s",  text:"Эй, жлоб!" },
  { label:"pangram·m",  text:"Съешь ещё этих мягких французских булок, да выпей чаю." },
  { label:"pangram·l",  text:"В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!" },
  { label:"pangram·xl", text:"Разъярённый чтец эгоистично бьёт пятью жердями шустрого фехтовальщика." },
  { label:"pangram·xxl",text:"Любя, съешь щипцы, — вздохнёт мэр, — кайф жгуч. Эх, чужак, общий съём цен шляп — вдрызг!" },
  // UDHR Article 1 (Russian official UN text)
  { label:"ВДПЧ ст. 1", text:"Все люди рождаются свободными и равными в своём достоинстве и правах. Они наделены разумом и совестью и должны поступать в отношении друг друга в духе братства." },
]

/* ────────────────────────────── RUSSIAN KEYBOARD ───────────────────────────── */
const KB_ROWS = [
  ["й","ц","у","к","е","н","г","ш","щ","з","х","ъ"],
  ["ф","ы","в","а","п","р","о","л","д","ж","э"],
  ["я","ч","с","м","и","т","ь","б","ю","ё"],
]

let allGlyphs: Record<string,Glyph> | null = null
async function loadAllGlyphs(): Promise<Record<string,Glyph>> {
  if (allGlyphs) return allGlyphs
  const res = await fetch(`${import.meta.env.BASE_URL}glyphs.json`)
  allGlyphs = await res.json()
  return allGlyphs!
}

export default function App() {
  const [activeStyle,   setActiveStyle]   = useState(0)
  const [ease,          setEase]          = useState(0.6)
  const [blur,          setBlur]          = useState(STYLE_PRESETS[0].blur)
  const [contrast,      setContrast]      = useState(STYLE_PRESETS[0].contrast)
  const [strokeWidth,   setStrokeWidth]   = useState(STYLE_PRESETS[0].strokeWidth)
  const [bgColor,       setBgColor]       = useState(STYLE_PRESETS[0].bgColor)
  const [fontColor,     setFontColor]     = useState(STYLE_PRESETS[0].fontColor)
  const [strokeColor,   setStrokeColor]   = useState(STYLE_PRESETS[0].strokeColor)
  const [invert,        setInvert]        = useState(STYLE_PRESETS[0].invert)
  const [invertColor,   setInvertColor]   = useState(STYLE_PRESETS[0].invertColor)
  const [fontSize,      setFontSize]      = useState(0.2)   // scale multiplier
  const [lineHeight,    setLineHeight]    = useState(1.4)   // relative to font size
  const [align,         setAlign]         = useState<"left"|"center"|"right">("left")
  const [inputText,     setInputText]     = useState("шрифт")

  /* ── canvas refs ── */
  const easeRef        = useRef(ease)
  const blurRef        = useRef(blur)
  const contrastRef    = useRef(contrast)
  const strokeWidthRef = useRef(strokeWidth)
  const bgColorRef     = useRef(bgColor)
  const fontColorRef   = useRef(fontColor)
  const strokeColorRef = useRef(strokeColor)
  const invertRef      = useRef(invert)
  const invertColorRef = useRef(invertColor)
  const fontSizeRef    = useRef(fontSize)
  const lineHeightRef  = useRef(lineHeight)
  const alignRef       = useRef(align)
  const textRef        = useRef(inputText)

  useEffect(() => { easeRef.current        = ease        }, [ease])
  useEffect(() => { blurRef.current        = blur        }, [blur])
  useEffect(() => { contrastRef.current    = contrast    }, [contrast])
  useEffect(() => { strokeWidthRef.current = strokeWidth }, [strokeWidth])
  useEffect(() => { bgColorRef.current     = bgColor     }, [bgColor])
  useEffect(() => { fontColorRef.current   = fontColor   }, [fontColor])
  useEffect(() => { strokeColorRef.current = strokeColor }, [strokeColor])
  useEffect(() => { invertRef.current      = invert      }, [invert])
  useEffect(() => { invertColorRef.current = invertColor }, [invertColor])
  useEffect(() => { fontSizeRef.current    = fontSize    }, [fontSize])
  useEffect(() => { lineHeightRef.current  = lineHeight  }, [lineHeight])
  useEffect(() => { alignRef.current       = align       }, [align])
  useEffect(() => { textRef.current        = inputText   }, [inputText])

  function applyStylePreset(i: number) {
    const p = STYLE_PRESETS[i]
    setActiveStyle(i)
    setBlur(p.blur); setContrast(p.contrast); setStrokeWidth(p.strokeWidth)
    setBgColor(p.bgColor); setFontColor(p.fontColor); setStrokeColor(p.strokeColor)
    setInvert(p.invert); setInvertColor(p.invertColor)
  }

  /* ── glyphs cache for canvas ── */
  const glyphsCacheRef = useRef<Record<string,Glyph>>({})
  async function ensureGlyphs(str: string) {
    const all = await loadAllGlyphs()
    for (const c of str) {
      if (glyphsCacheRef.current[c]) continue
      if (all[c]) glyphsCacheRef.current[c] = all[c]
    }
  }

  /* ── canvas loop ── */
  useEffect(() => {
    const CANVAS_W = 900
    const CANVAS_H = 600
    const canvas   = document.getElementById("c") as HTMLCanvasElement
    const ctx      = canvas.getContext("2d")!
    const off      = document.createElement("canvas")
    off.width = CANVAS_W; off.height = CANVAS_H
    const octx = off.getContext("2d")!

    const blurLayer     = document.getElementById("blurLayer")     as HTMLDivElement
    const contrastLayer = document.getElementById("contrastLayer") as HTMLDivElement
    const invertLayer   = document.getElementById("invertLayer")   as HTMLDivElement

    let t = 0

    function easeFn(x: number) {
      const k = 1 + easeRef.current * 6
      return x < 0.5 ? 0.5 * Math.pow(x*2,k) : 1 - 0.5 * Math.pow((1-x)*2,k)
    }
    function interp(a: number, b: number, t: number) { return a + (b-a)*t }

    /* word-wrap: split text into lines that fit within maxWidth */
    /* break-all: split char by char, break when line exceeds maxWidth */
    function wrapText(text: string, scale: number, maxWidth: number): string[] {
      const glyphs = glyphsCacheRef.current
      const lines: string[] = []
      let line = ""
      let lineW = 0

      for (const c of text) {
        if (c === "\n") {
          lines.push(line); line = ""; lineW = 0; continue
        }
        const cw = (glyphs[c]?.w ?? 0) * scale
        if (lineW + cw > maxWidth && line !== "") {
          lines.push(line); line = ""; lineW = 0
        }
        line += c; lineW += cw
      }
      if (line) lines.push(line)
      return lines
    }

    function drawGlyph(pointsA: Point[], pointsB: Point[], xOff: number, yOff: number, scale: number) {
      const sizeRatio = scale / 0.20
      const lw = strokeWidthRef.current * sizeRatio
      for (let i = 0; i < pointsA.length; i += 4) {
        if (!pointsA[i+3]) break
        const p1=pointsA[i], p2=pointsA[i+1], p3=pointsA[i+2], p4=pointsA[i+3]
        const q1=pointsB[i], q2=pointsB[i+1], q3=pointsB[i+2], q4=pointsB[i+3]
        const x1=interp(p1[0],q1[0],t)*scale+xOff, y1=yOff-interp(p1[1],q1[1],t)*scale
        const x2=interp(p2[0],q2[0],t)*scale+xOff, y2=yOff-interp(p2[1],q2[1],t)*scale
        const x3=interp(p3[0],q3[0],t)*scale+xOff, y3=yOff-interp(p3[1],q3[1],t)*scale
        const x4=interp(p4[0],q4[0],t)*scale+xOff, y4=yOff-interp(p4[1],q4[1],t)*scale
        octx.beginPath()
        octx.moveTo(x1,y1); octx.lineTo(x2,y2); octx.lineTo(x3,y3); octx.lineTo(x4,y4)
        octx.closePath()
        octx.fillStyle = fontColorRef.current; octx.fill()
        octx.lineWidth = lw; octx.strokeStyle = strokeColorRef.current
        if (lw > 0) octx.stroke()
      }
    }

    function render() {
      const scale      = fontSizeRef.current
      const lhMult     = lineHeightRef.current
      const glyphs     = glyphsCacheRef.current
      const MARGIN     = 50
      const maxWidth   = CANVAS_W - MARGIN * 2
      /* approximate em height from font units (1000 UPM assumed) */
      const emHeight   = 700 * scale
      const lineStep   = emHeight * lhMult

      octx.fillStyle = bgColorRef.current
      octx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const lines = wrapText(textRef.current, scale, maxWidth)

      lines.forEach((line, li) => {
        /* measure line width */
        let lineW = 0
        for (const c of line) lineW += (glyphs[c]?.w ?? 0) * scale

        /* alignment */
        let xStart = MARGIN
        if (alignRef.current === "center") xStart = (CANVAS_W - lineW) / 2
        if (alignRef.current === "right")  xStart = CANVAS_W - MARGIN - lineW

        const yBase = MARGIN + emHeight + li * lineStep

        let xOff = xStart
        for (const c of line) {
          if (!glyphs[c]) { xOff += 200 * scale; continue }
          const g = glyphs[c]
          drawGlyph(g.a, g.b, xOff, yBase, scale)
          xOff += g.w * scale
        }
      })

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.drawImage(off, 0, 0)
    }

    function updateFilters() {
      const BASE_SCALE = 0.20
      const sizeRatio  = fontSizeRef.current / BASE_SCALE   // >1 when bigger, <1 when smaller
      const scaledBlur     = blurRef.current * sizeRatio
      const scaledContrast = 1 + (contrastRef.current - 1) * sizeRatio
      blurLayer.style.backdropFilter     = `blur(${scaledBlur}px)`
      contrastLayer.style.backdropFilter = `contrast(${scaledContrast})`
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

  /* load new glyphs whenever inputText changes */
  useEffect(() => { ensureGlyphs(inputText) }, [inputText])

  /* ── keyboard insert ── */
  function insertChar(ch: string) {
    setInputText(prev => prev + ch)
  }

  const CANVAS_W = 900
  const CANVAS_H = 600

  return (
    <>
      {/* ── text input ── */}
      <div id="text-row">
        <input
          id="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="введите текст"
        />
      </div>

      {/* ── text presets ── */}
      <div id="text-presets">
        {TEXT_PRESETS.map(tp => (
          <button
            key={tp.label}
            className="text-preset-btn"
            onClick={() => setInputText(tp.text)}
          >
            {tp.label}
          </button>
        ))}
      </div>

      {/* ── russian keyboard ── */}
      <div id="keyboard">
        {KB_ROWS.map((row, ri) => (
          <div key={ri} className="kb-row">
            {row.map(ch => (
              <button key={ch} className="kb-key" onClick={() => insertChar(ch)}>
                {ch}
              </button>
            ))}
            {ri === 2 && (
              <button className="kb-key kb-backspace" onClick={() => setInputText(p => p.slice(0,-1))}>
                ⌫
              </button>
            )}
          </div>
        ))}
        <div className="kb-row">
          <button className="kb-key kb-space" onClick={() => insertChar(" ")}>пробел</button>
          <button className="kb-key kb-shift" onClick={() => setInputText(p => {
            if (!p) return p
            const last = p[p.length-1]
            return p.slice(0,-1) + (last === last.toUpperCase() ? last.toLowerCase() : last.toUpperCase())
          })}>⇧</button>
        </div>
      </div>

      {/* ── style presets ── */}
      <div id="presets">
        {STYLE_PRESETS.map((p,i) => (
          <button
            key={p.name}
            className={`preset-btn ${activeStyle === i ? "active" : ""}`}
            style={{ "--preset-bg": p.bgColor, "--preset-fg": p.fontColor } as React.CSSProperties}
            onClick={() => applyStylePreset(i)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* ── controls ── */}
      <div id="controls">

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

        <label>font size</label>
        <input type="range" min="0.05" max="0.6" step="0.01" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} />
        <span className="val">{fontSize.toFixed(2)}</span>

        <label>line height</label>
        <input type="range" min="0.8" max="3" step="0.05" value={lineHeight} onChange={e => setLineHeight(Number(e.target.value))} />
        <span className="val">{lineHeight.toFixed(2)}</span>

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

        <label>alignment</label>
        <div id="align-btns">
          {(["left","center","right"] as const).map(a => (
            <button
              key={a}
              className={`align-btn ${align === a ? "active" : ""}`}
              onClick={() => setAlign(a)}
            >
              {a === "left" ? "⬛▪▪" : a === "center" ? "▪⬛▪" : "▪▪⬛"}
            </button>
          ))}
        </div>

      </div>

      {/* ── stage ── */}
      <div id="stage" style={{ position:"relative", width:`${CANVAS_W}px`, height:`${CANVAS_H}px` }}>
        <svg width="0" height="0" style={{ position:"absolute" }}>
          <filter id="posterize">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 0.5 1" />
              <feFuncG type="discrete" tableValues="0 0.5 1" />
              <feFuncB type="discrete" tableValues="0 0.5 1" />
            </feComponentTransfer>
          </filter>
        </svg>
        <div style={{ position:"relative", width:`${CANVAS_W}px`, height:`${CANVAS_H}px`, filter:"url(#posterize)" }}>
          <canvas id="c" width={CANVAS_W} height={CANVAS_H} style={{ display:"block" }} />
        </div>
        <div id="blurLayer"     style={{ position:"absolute",top:0,left:0,width:`${CANVAS_W}px`,height:`${CANVAS_H}px`,pointerEvents:"none" }} />
        <div id="contrastLayer" style={{ position:"absolute",top:0,left:0,width:`${CANVAS_W}px`,height:`${CANVAS_H}px`,pointerEvents:"none" }} />
        <div id="invertLayer"   style={{ position:"absolute",top:0,left:0,width:`${CANVAS_W}px`,height:`${CANVAS_H}px`,pointerEvents:"none",mixBlendMode:"difference",display:invert?"block":"none" }} />
      </div>
    </>
  )
}