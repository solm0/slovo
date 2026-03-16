import { Fragment, useEffect, useRef, useState } from "react"
import { initializeApp } from "firebase/app"
import { getDatabase, ref, push, onValue, remove } from "firebase/database"

/* ─── Firebase ─────────────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyAKR9HWqFS-wHgyJ6QdCq0n_XG1w7etAEA",
  authDomain: "slovo-specimen.firebaseapp.com",
  projectId: "slovo-specimen",
  storageBucket: "slovo-specimen.firebasestorage.app",
  messagingSenderId: "384470643833",
  appId: "1:384470643833:web:eb421edb15e9bf797a90a8",
  databaseURL: "https://slovo-specimen-default-rtdb.asia-southeast1.firebasedatabase.app"
}
const firebaseApp = initializeApp(firebaseConfig)
const db = getDatabase(firebaseApp)

/* ─── Password hashing ──────────────────────────────────────────────────────── */
async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type Point = [number, number]
type Glyph = { a: Point[]; b: Point[]; w: number }
type StylePreset = {
  name: string
  blur: number; contrast: number; strokeWidth: number
  bgColor: string; fontColor: string; strokeColor: string
  invert: boolean; invertColor: string
  btnBgColor: string; btnTextColor:string
  author?: string; savedAt?: number; pwHash?: string
}
type TextPreset = { label: string; text: string }

/* ─── Built-in style presets ────────────────────────────────────────────────── */
const BUILTIN_PRESETS: StylePreset[] = [
  { name:"ink",                blur:3.5, contrast:20.0, strokeWidth:0.0, bgColor:"#ffffff", fontColor:"#000000", strokeColor:"#000000", invert:true,  invertColor:"#2b2b2b", btnBgColor: "#ffffff", btnTextColor:"#000000" },
  { name:"blood",              blur:6.0, contrast:5.2,  strokeWidth:4.9, bgColor:"#ffe5e5", fontColor:"#ffc1c1", strokeColor:"#9d8082", invert:false, invertColor:"#262626", btnBgColor: "#ffe5e5", btnTextColor:"#ff0000" },
  { name:"lava lamp",          blur:4.1, contrast:20.0, strokeWidth:3.0, bgColor:"#ffffff", fontColor:"#e56667", strokeColor:"#00ff05", invert:true,  invertColor:"#3a3a3a", btnBgColor: "#f8ff5c", btnTextColor:"#db6d0a" },
  { name:"balsamic vinegar",   blur:6.0, contrast:20.0, strokeWidth:2.0, bgColor:"#b9b9b9", fontColor:"#bb67bf", strokeColor:"#3eff17", invert:false, invertColor:"#0d0020", btnBgColor: "#a7ff2f", btnTextColor:"#9f0047" },
  { name:"terminal",           blur:4.7, contrast:6.6,  strokeWidth:4.7, bgColor:"#000000", fontColor:"#6f4770", strokeColor:"#72ff78", invert:false, invertColor:"#262626", btnBgColor: "#000",    btnTextColor:"#0f0" },
  { name:"cactus flower",      blur:3.0, contrast:15.5, strokeWidth:2.6, bgColor:"#4c0000", fontColor:"#e68aea", strokeColor:"#52ff5a", invert:true,  invertColor:"#e5e5e5", btnBgColor: "#3aff62",    btnTextColor:"#fa00ec" },
  { name:"noctiluca",          blur:3.6, contrast:8.3,  strokeWidth:4.7, bgColor:"#936033", fontColor:"#2992ab", strokeColor:"#b3a4a3", invert:true,  invertColor:"#000b24", btnBgColor: "#000be6", btnTextColor:"#ecf4da" },
  { name:"glacier",            blur:4.8, contrast:2.6,  strokeWidth:4.1, bgColor:"#cf9eff", fontColor:"#000000", strokeColor:"#00d5ff", invert:false, invertColor:"#262626", btnBgColor: "#97e4ee", btnTextColor:"#002488" },
  { name:"spiral mesh",        blur:4.3, contrast:20.0, strokeWidth:3.2, bgColor:"#ff9494", fontColor:"#999999", strokeColor:"#ffffff", invert:true,  invertColor:"#808080", btnBgColor: "#a0a0a0", btnTextColor:"#b6000d" },
  { name:"heatwave",           blur:6.0, contrast:9.3,  strokeWidth:8.4, bgColor:"#e75c5c", fontColor:"#642ffa", strokeColor:"#8aa2cf", invert:true,  invertColor:"#3a3a3a", btnBgColor: "#91272e", btnTextColor:"#00d6d6" },
  { name:"orthogonal",         blur:0.0, contrast:20.0, strokeWidth:0.9, bgColor:"#000000", fontColor:"#000000", strokeColor:"#e0e7ff", invert:false, invertColor:"#40464f", btnBgColor: "#00234e", btnTextColor:"#00ffff" },
  { name:"molecular dynamics", blur:3.2, contrast:10.8, strokeWidth:3.8, bgColor:"#936033", fontColor:"#559daf", strokeColor:"#c39b98", invert:false, invertColor:"#40464f", btnBgColor: "#181b54", btnTextColor:"#ffff00" },
]

/* ─── Text presets ───────────────────────────────────────────────────────────── */
const TEXT_PRESETS: TextPreset[] = [
  { label:"s",   text:"Съешь ещё этих мягких французских булок, да выпей чаю." },
  { label:"m",   text:"В чащах юга жил бы цитрус? Да, но фальшивый экземпляр!" },
  { label:"l",  text:"Разъярённый чтец эгоистично бьёт пятью жердями шустрого фехтовальщика." },
  { label:"xl", text:"Любя, съешь щипцы, — вздохнёт мэр, — кайф жгуч. Эх, чужак, общий съём цен шляп — вдрызг!" },
  { label:"ВДПЧ ст. 1",  text:"Все люди рождаются свободными и равными в своём достоинстве и правах. Они наделены разумом и совестью и должны поступать в отношении друг друга в духе братства." },
]

/* ─── Russian keyboard ───────────────────────────────────────────────────────── */
const KB_ROWS = [
  ["й","ц","у","к","е","н","г","ш","щ","з","х","ъ"],
  ["ф","ы","в","а","п","р","о","л","д","ж","э"],
  ["я","ч","с","м","и","т","ь","б","ю","ё"],
]

/* ─── Glyph loader ───────────────────────────────────────────────────────────── */
let allGlyphs: Record<string, Glyph> | null = null
async function loadAllGlyphs(): Promise<Record<string, Glyph>> {
  if (allGlyphs) return allGlyphs
  const res = await fetch(`${import.meta.env.BASE_URL}glyphs.json`)
  allGlyphs = await res.json()
  return allGlyphs!
}

/* ─── Shared input/button base classes ──────────────────────────────────────── */
const inputCls = "w-full font-mono text-xs px-2 py-1.5 rounded-sm focus:outline-none focus:border focus:border-[#1a1a1a]0 bg-[#3b3b3b]"
const labelCls = "font-mono text-[11px] text-neutral-400"

export function Control({
  name, min, max, step, val, setter, fmt
}: {
  name: string; min: string; max: string; step: string;
  val: number; setter: (v: number) => void; fmt: (v: number) => string;
}) {
  return (
    <Fragment key={name}>
      <label key={`lbl-${name}`} className={labelCls}>{name}</label>
      <input key={`rng-${name}`} type="range" min={min} max={max} step={step} value={val}
        onChange={e => setter(Number(e.target.value))}
        className="w-full cursor-pointer" />
      <span key={`val-${name}`} className="font-mono text-[11px] text-neutral-400 whitespace-nowrap">
        {fmt(val as number)}
      </span>
    </Fragment>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* ── style state ── */
  const [activePresetId, setActivePresetId] = useState<string>("builtin-0")
  const [ease,          setEase]          = useState(0.6)
  const [blur,          setBlur]          = useState(BUILTIN_PRESETS[0].blur)
  const [contrast,      setContrast]      = useState(BUILTIN_PRESETS[0].contrast)
  const [strokeWidth,   setStrokeWidth]   = useState(BUILTIN_PRESETS[0].strokeWidth)
  const [bgColor,       setBgColor]       = useState(BUILTIN_PRESETS[0].bgColor)
  const [fontColor,     setFontColor]     = useState(BUILTIN_PRESETS[0].fontColor)
  const [strokeColor,   setStrokeColor]   = useState(BUILTIN_PRESETS[0].strokeColor)
  const [invert,        setInvert]        = useState(BUILTIN_PRESETS[0].invert)
  const [invertColor,   setInvertColor]   = useState(BUILTIN_PRESETS[0].invertColor)
  const [fontSize,      setFontSize]      = useState(0.2)
  const [lineHeight,    setLineHeight]    = useState(1.4)
  const [align,         setAlign]         = useState<"left"|"center"|"right">("left")
  const [inputText,     setInputText]     = useState("шрифт")

  /* ── firebase user presets ── */
  const [userPresets, setUserPresets] = useState<(StylePreset & { fbKey: string })[]>([])

  /* -- user defined library --- */
  const [showLibrary, setShowLibrary] = useState(false)

  /* ── save dialog ── */
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName,       setSaveName]       = useState("")
  const [saveAuthor,     setSaveAuthor]     = useState("")
  const [savePassword,   setSavePassword]   = useState("")
  const [saving,         setSaving]         = useState(false)

  /* ── delete modal ── */
  const [deleteTarget,   setDeleteTarget]   = useState<(StylePreset & { fbKey: string }) | null>(null)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteError,    setDeleteError]    = useState("")
  const [deleting,       setDeleting]       = useState(false)

  /* ── textarea cursor ref ── */
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const [CANVAS_W, setCanvasW] = useState(900)
  const [CANVAS_H, setCanvasH] = useState(600)

  useEffect(() => {
    setCanvasW(Math.round(window.innerWidth - 50))
    setCanvasH(Math.round(window.innerHeight - 310))
  }, [])

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

  /* ── load user presets ── */
  useEffect(() => {
    const presetsRef = ref(db, "presets")
    const unsub = onValue(presetsRef, snapshot => {
      const val = snapshot.val()
      if (!val) { setUserPresets([]); return }
      setUserPresets(Object.entries(val).map(([fbKey, data]) => ({ ...(data as StylePreset), fbKey })))
    })
    return () => unsub()
  }, [])

  /* ── apply preset ── */
  function applyPreset(p: StylePreset, id: string) {
    setActivePresetId(id)
    setBlur(p.blur); setContrast(p.contrast); setStrokeWidth(p.strokeWidth)
    setBgColor(p.bgColor); setFontColor(p.fontColor); setStrokeColor(p.strokeColor)
    setInvert(p.invert); setInvertColor(p.invertColor)
  }

  /* ── save to Firebase ── */
  async function handleSave() {
    if (!saveName.trim() || !saveAuthor.trim() || !savePassword.trim()) return
    setSaving(true)
    const pwHash = await hashPassword(savePassword)
    await push(ref(db, "presets"), {
      name: saveName.trim(), author: saveAuthor.trim(), savedAt: Date.now(), pwHash,
      blur, contrast, strokeWidth, bgColor, fontColor, strokeColor, invert, invertColor,
    })
    setSaving(false); setShowSaveDialog(false)
    setSaveName(""); setSaveAuthor(""); setSavePassword("")
  }

  /* ── delete from Firebase ── */
  async function handleDelete() {
    if (!deleteTarget || !deletePassword.trim()) return
    setDeleting(true)
    const hash = await hashPassword(deletePassword)
    if (hash !== deleteTarget.pwHash) {
      setDeleteError("password does not match")
      setDeleting(false); return
    }
    await remove(ref(db, `presets/${deleteTarget.fbKey}`))
    setDeleting(false); closeDeleteModal()
  }

  function openDeleteModal(p: StylePreset & { fbKey: string }, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteTarget(p); setDeletePassword(""); setDeleteError("")
  }
  function closeDeleteModal() {
    setDeleteTarget(null); setDeletePassword(""); setDeleteError("")
  }

  /* ── glyph cache ── */
  const glyphsCacheRef = useRef<Record<string, Glyph>>({})
  async function ensureGlyphs(str: string) {
    const all = await loadAllGlyphs()
    for (const c of str) {
      if (glyphsCacheRef.current[c]) continue
      if (all[c]) glyphsCacheRef.current[c] = all[c]
    }
  }

  /* ── cursor-aware keyboard insert ── */
  function insertAtCursor(ch: string) {
    const el = textareaRef.current
    if (!el) { setInputText(p => p + ch); return }
    const start = el.selectionStart ?? inputText.length
    const end   = el.selectionEnd   ?? inputText.length
    setInputText(inputText.slice(0, start) + ch + inputText.slice(end))
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + ch.length
      el.focus()
    })
  }
  function backspaceAtCursor() {
    const el = textareaRef.current
    if (!el) { setInputText(p => p.slice(0, -1)); return }
    const start = el.selectionStart ?? inputText.length
    const end   = el.selectionEnd   ?? inputText.length
    let next: string, cur: number
    if (start !== end) { next = inputText.slice(0, start) + inputText.slice(end); cur = start }
    else if (start > 0) { next = inputText.slice(0, start - 1) + inputText.slice(start); cur = start - 1 }
    else return
    setInputText(next)
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = cur; el.focus() })
  }

  /* ── canvas loop ── */
  useEffect(() => {
    const canvas = document.getElementById("c") as HTMLCanvasElement
    const CANVAS_W = canvas.width
    const CANVAS_H = canvas.height
    const ctx    = canvas.getContext("2d")!
    const off    = document.createElement("canvas")
    off.width = CANVAS_W; off.height = CANVAS_H
    const octx = off.getContext("2d")!
    const blurLayer     = document.getElementById("blurLayer")     as HTMLDivElement
    const contrastLayer = document.getElementById("contrastLayer") as HTMLDivElement
    const invertLayer   = document.getElementById("invertLayer")   as HTMLDivElement
    let t = 0

    function easeFn(x: number) {
      const k = 1 + easeRef.current * 6
      return x < 0.5 ? 0.5 * Math.pow(x * 2, k) : 1 - 0.5 * Math.pow((1 - x) * 2, k)
    }
    function interp(a: number, b: number, t: number) { return a + (b - a) * t }

    function wrapText(text: string, scale: number, maxWidth: number): string[] {
      const glyphs = glyphsCacheRef.current
      const lines: string[] = []
      let line = "", lineW = 0
      for (const c of text) {
        if (c === "\n") { lines.push(line); line = ""; lineW = 0; continue }
        const cw = (glyphs[c]?.w ?? 0) * scale
        if (lineW + cw > maxWidth && line !== "") { lines.push(line); line = ""; lineW = 0 }
        line += c; lineW += cw
      }
      if (line) lines.push(line)
      return lines
    }

    function drawGlyph(pA: Point[], pB: Point[], xOff: number, yOff: number, scale: number) {
      const lw = strokeWidthRef.current * (scale / 0.20)
      for (let i = 0; i < pA.length; i += 4) {
        if (!pA[i + 3]) break
        const x1 = interp(pA[i][0],   pB[i][0],   t) * scale + xOff, y1 = yOff - interp(pA[i][1],   pB[i][1],   t) * scale
        const x2 = interp(pA[i+1][0], pB[i+1][0], t) * scale + xOff, y2 = yOff - interp(pA[i+1][1], pB[i+1][1], t) * scale
        const x3 = interp(pA[i+2][0], pB[i+2][0], t) * scale + xOff, y3 = yOff - interp(pA[i+2][1], pB[i+2][1], t) * scale
        const x4 = interp(pA[i+3][0], pB[i+3][0], t) * scale + xOff, y4 = yOff - interp(pA[i+3][1], pB[i+3][1], t) * scale
        octx.beginPath()
        octx.moveTo(x1, y1); octx.lineTo(x2, y2); octx.lineTo(x3, y3); octx.lineTo(x4, y4)
        octx.closePath()
        octx.fillStyle = fontColorRef.current; octx.fill()
        octx.lineWidth = lw; octx.strokeStyle = strokeColorRef.current
        if (lw > 0) octx.stroke()
      }
    }

    function render() {
      const CANVAS_W = canvas.width
      const CANVAS_H = canvas.height
      const scale    = fontSizeRef.current
      const MARGIN   = 50
      const emHeight = 700 * scale
      const lineStep = emHeight * lineHeightRef.current
      const glyphs   = glyphsCacheRef.current
      octx.fillStyle = bgColorRef.current
      octx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      wrapText(textRef.current, scale, CANVAS_W - MARGIN * 2).forEach((line, li) => {
        let lineW = 0
        for (const c of line) lineW += (glyphs[c]?.w ?? 0) * scale
        let xStart = MARGIN
        if (alignRef.current === "center") xStart = (CANVAS_W - lineW) / 2
        if (alignRef.current === "right")  xStart = CANVAS_W - MARGIN - lineW
        let xOff = xStart
        const yBase = MARGIN + emHeight + li * lineStep
        for (const c of line) {
          if (!glyphs[c]) { xOff += 200 * scale; continue }
          drawGlyph(glyphs[c].a, glyphs[c].b, xOff, yBase, scale)
          xOff += glyphs[c].w * scale
        }
      })
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.drawImage(off, 0, 0)
    }

    function updateFilters() {
      const r = fontSizeRef.current / 0.20
      blurLayer.style.backdropFilter     = `blur(${blurRef.current * r}px)`
      contrastLayer.style.backdropFilter = `contrast(${1 + (contrastRef.current - 1) * r})`
      invertLayer.style.backgroundColor  = invertColorRef.current
      invertLayer.style.display          = invertRef.current ? "block" : "none"
    }

    function loop() {
      if (CANVAS_W === 900 && CANVAS_H === 600) return
      t = easeFn((Math.sin(Date.now() * 0.002) + 1) / 2)
      updateFilters(); render()
      requestAnimationFrame(loop)
    }
    loop()
  }, [CANVAS_W, CANVAS_H])

  useEffect(() => { ensureGlyphs(inputText) }, [inputText])

  /* ── preset button shared classes ── */
  const presetBtnBase = "inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-sm font-mono text-[11px] tracking-wide lowercase cursor-pointer transition-all duration-150"

  return (
    <div className="absolute top-0 left-0 p-6 w-full h-full bg-[#242424] flex flex-col gap-6">
      <div className="shrink-0 w-full h-60 grid grid-cols-4 gap-6">

        <div className="flex flex-col gap-4 z-10">
          <p className={labelCls}>1. text</p>

          {/* ── text presets ── */}
          <div className="flex flex-wrap gap-1.5">
            {TEXT_PRESETS.map(tp => (
              <button
                key={tp.label}
                onClick={() => setInputText(tp.text)}
                className="px-2.5 py-1 border border-neutral-500 text-neutral-400 rounded-sm font-mono text-[11px] tracking-wide bg-transparent cursor-pointer"
              >
                {tp.label}
              </button>
            ))}
          </div>

          {/* ── textarea ── */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="введите текст"
            rows={2}
            className="w-full font-mono text-sm px-3 py-2 min-h-7 max-h-[70vh] rounded-sm resize-y focus:outline-none focus:border-[#1a1a1a] z-50"
          />

          {/* ── russian keyboard ── */}
          <div className="relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 p-2 pt-4 rounded-md w-auto bg-[#242424] flex flex-col gap-1 items-center z-40">

              {KB_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1">
                  {row.map(ch => (
                    <button
                    key={ch}
                    onClick={() => insertAtCursor(ch)}
                    className="px-2 h-6 border rounded-sm font-mono text-sm bg-[#1a1a1a] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                    >
                      {ch}
                    </button>          
                  ))}
                </div>
              ))}
              <div className="flex gap-1 h-8">
                <button
                  onClick={() => insertAtCursor(" ")}
                  className="w-24 flex items-center justify-center rounded-sm font-mono text-xs tracking-widest bg-[#1a1a1a] active:scale-95 transition-all cursor-pointer"
                />
                <button
                  onClick={backspaceAtCursor}
                  className="w-7 flex items-center justify-center rounded-sm font-mono text-base bg-[#1a1a1a] active:scale-95 transition-all cursor-pointer"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 col-span-2 z-10">
          <p className={labelCls}>2. style</p>
          <div className="flex gap-6">

            {/* ── style presets + save ── */}
            <div className="flex-1 flex items-start gap-3">
              {/* preset buttons */}
              <div className="flex flex-wrap gap-2 flex-1">
                {BUILTIN_PRESETS.map((p, i) => {
                  const isActive = activePresetId === `builtin-${i}`
                  return (
                    <button
                      key={`builtin-${i}`}
                      onClick={() => applyPreset(p, `builtin-${i}`)}
                      style={{ backgroundColor: p.btnBgColor, color: p.btnTextColor, borderColor: p.btnTextColor } as React.CSSProperties}
                      className={`${presetBtnBase} border ${isActive ? "scale-105 outline outline-2 outline-offset-2" : ""}`}
                    >
                      {p.name}
                    </button>
                  )
                })}

                {/* user library */}
                <div className="relative flex-shrink-0">
                  {!showSaveDialog && (
                    <button
                      onClick={() => setShowLibrary(true)}
                      className="px-3 py-1.5 border border-neutral-400 rounded-sm font-mono text-[12px] tracking-wide bg-transparent cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    >
                      more?
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/*  ── style controls ── */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="grid gap-x-3 gap-y-1 items-center" style={{ gridTemplateColumns: "130px 1fr auto" }}>
                {([
                  ["blur",         blur,        setBlur,        "0",    "6",  "0.1",   (v: number) => v.toFixed(1)],
                  ["contrast",     contrast,    setContrast,    "1",    "20", "0.1",   (v: number) => v.toFixed(1)],
                  ["stroke width", strokeWidth, setStrokeWidth, "0",    "10", "0.1",   (v: number) => v.toFixed(1)],
                ] as const).map(([name, val, setter, min, max, step, fmt]) => (
                  <Control name={name} val={val} setter={setter} min={min} max={max} step={step} fmt={fmt} />
                ))}

                {([
                  ["background color", bgColor,     setBgColor],
                  ["font color",       fontColor,   setFontColor],
                  ["stroke color",     strokeColor, setStrokeColor],
                  ["invert filter color", invertColor, setInvertColor],
                ] as const).map(([name, val, setter]) => (
                  <>
                    <label key={`lbl-${name}`} className={labelCls}>{name}</label>
                    <input key={`clr-${name}`} type="color" value={val}
                      onChange={e => (setter as (v: string) => void)(e.target.value)}
                      className="w-8 h-7 cursor-pointer border-0 bg-transparent p-0" />
                    <span key={`val-${name}`} className="font-mono text-[11px] text-neutral-400">{val}</span>
                  </>
                ))}

                <label className={labelCls}>invert filter</label>
                <input type="checkbox" checked={invert} onChange={() => setInvert(v => !v)} className="w-4 h-4 cursor-pointer" />
                <span className="font-mono text-[11px] text-neutral-400">{invert ? "on" : "off"}</span>

              </div>
              
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 z-10">
          <p className={labelCls}>3. display</p>

          {/*  ── display controls ── */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="grid gap-x-3 gap-y-1 items-center" style={{ gridTemplateColumns: "130px 1fr auto" }}>
              <label className={labelCls}>alignment</label>
              <div className="flex gap-1.5 col-span-2">
                {(["left", "center", "right"] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => setAlign(a)}
                    className={`px-3 py-1 border rounded-sm font-mono text-[11px] cursor-pointer transition-all
                      ${align === a ? "border-neutral-700 bg-neutral-100 opacity-100" : "border-neutral-300 bg-transparent opacity-50 hover:opacity-80"}`}
                  >
                    {a === "left" ? "⬛▪▪" : a === "center" ? "▪⬛▪" : "▪▪⬛"}
                  </button>
                ))}
              </div>
              {([
                ["font size",    fontSize,    setFontSize,    "0.05", "0.6","0.01",  (v: number) => v.toFixed(2)],
                ["line height",  lineHeight,  setLineHeight,  "0.8",  "3",  "0.05",  (v: number) => v.toFixed(2)],
                ["motion ease",         ease,        setEase,        "0",    "1",  "0.01",  (v: number) => v.toFixed(2)],
              ] as const).map(([name, val, setter, min, max, step, fmt]) => (
                <Control name={name} val={val} setter={setter} min={min} max={max} step={step} fmt={fmt} />
              ))}


            </div>
            
          </div>
        </div>
      </div>

      {/* ── user defined style library ── */}
      {showLibrary && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
          onClick={()=>setShowLibrary(false)}
        >
          <div
            className="bg-[#242424] border border-neutral-300 rounded shadow-xl p-5 w-[50vw] flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <p className={labelCls}>User defined style library</p>
            <div className="flex flex-wrap gap-2 flex-1 min-h-60 items-start">
              {userPresets.map(p => {
                const isActive = activePresetId === p.fbKey
                return (
                  <button
                    key={p.fbKey}
                    onClick={() => applyPreset(p, p.fbKey)}
                    style={{ backgroundColor: '#ffffff', color: '#1a1a1a', borderColor: '#1a1a1a', ...(isActive ? { outlineColor: '#1a1a1a' } : {}) } as React.CSSProperties}
                    className={`${presetBtnBase} border group ${isActive ? "scale-105 outline outline-2 outline-offset-2" : ""}`}
                  >
                    {p.name}
                    {p.author && <span className="text-[10px] italic opacity-55">by {p.author}</span>}
                    <span
                      role="button"
                      onClick={e => openDeleteModal(p, e)}
                      className="ml-0.5 text-sm leading-none cursor-pointer"
                      title="delete"
                    >
                      ×
                    </span>
                  </button>
                )
              })}
            </div>

            {/* save button + popover */}
            <div className="flex gap-2 w-full justify-end">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-1.5 border border-neutral-400 rounded-sm font-mono text-[12px] tracking-wide bg-transparent cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              >
                + add mine
              </button>
              <button
                onClick={() => setShowLibrary(false)}
                className="px-3 py-1.5 border border-neutral-400 rounded-sm font-mono text-[12px] tracking-wide bg-transparent cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              >
                close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── save modal ── */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
          onClick={()=>setShowSaveDialog(false)}
        >
          <div
            className="bg-[#242424] border border-neutral-300 rounded shadow-xl p-5 w-80 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-[11px] text-[#1a1a1a]0 m-0">your current style set will be public.</p>
            <label className={labelCls} htmlFor="saveName">give it a cool name.</label>
            <input id="saveName" placeholder="preset name" value={saveName} onChange={e => setSaveName(e.target.value)} autoFocus className={inputCls} />
            <label className={labelCls} htmlFor="saveAuthor">who are you?</label>
            <input id="saveAuthor" placeholder="your nickname" value={saveAuthor} onChange={e => setSaveAuthor(e.target.value)} className={inputCls} />
            <label className={labelCls} htmlFor="savePassword">set a password to delete later.</label>
            <input id="savePassword" type="password" placeholder="password" value={savePassword} onChange={e => setSavePassword(e.target.value)} className={inputCls} />
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleSave}
                disabled={saving || !saveName.trim() || !saveAuthor.trim() || !savePassword.trim()}
                className="flex-1 py-1.5 rounded-sm font-mono text-[12px] bg-neutral-900 text-white cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                {saving ? "saving…" : "done"}
              </button>
              <button
                onClick={() => { setShowSaveDialog(false); setSaveName(""); setSaveAuthor(""); setSavePassword("") }}
                className="flex-1 py-1.5 rounded-sm font-mono text-[12px] border border-neutral-300 text-[#1a1a1a]0 bg-transparent cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── delete modal ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]"
          onClick={closeDeleteModal}
        >
          <div
            className="bg-[#242424] border border-neutral-300 rounded shadow-xl p-5 w-80 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="font-mono text-[13px] m-0">
              delete <strong>{deleteTarget.name}</strong>?
            </p>
            <p className="font-mono text-[11px] text-neutral-400 m-0">
              enter the password you set when saving.
            </p>
            <input
              type="password"
              placeholder="password"
              value={deletePassword}
              onChange={e => { setDeletePassword(e.target.value); setDeleteError("") }}
              autoFocus
              className={inputCls}
            />
            {deleteError && (
              <p className="font-mono text-[11px] text-red-600 m-0">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting || !deletePassword.trim()}
                className="flex-1 py-1.5 rounded-sm font-mono text-[12px] bg-red-600 text-white border-none cursor-pointer disabled:opacity-40 hover:not-disabled:opacity-80 transition-opacity"
              >
                {deleting ? "deleting…" : "delete a preset"}
              </button>
              <button
                onClick={closeDeleteModal}
                className="flex-1 py-1.5 rounded-sm font-mono text-[12px] border border-neutral-300 text-[#1a1a1a]0 bg-transparent cursor-pointer hover:opacity-60 transition-opacity"
              >
                cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ── stage ── */}
      <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id="posterize">
            <feComponentTransfer>
              <feFuncR type="discrete" tableValues="0 0.5 1" />
              <feFuncG type="discrete" tableValues="0 0.5 1" />
              <feFuncB type="discrete" tableValues="0 0.5 1" />
            </feComponentTransfer>
          </filter>
        </svg>
        <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H, filter: "url(#posterize)" }}>
          <canvas id="c" width={CANVAS_W} height={CANVAS_H} className="block" />
        </div>
        <div id="blurLayer"     className="absolute inset-0 pointer-events-none" />
        <div id="contrastLayer" className="absolute inset-0 pointer-events-none" />
        <div id="invertLayer"   className="absolute inset-0 pointer-events-none mix-blend-difference"
          style={{ display: invert ? "block" : "none" }} />
      </div>

    </div>
  )
}