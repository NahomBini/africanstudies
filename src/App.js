import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import React, { Suspense, useState, useRef, useEffect } from 'react'
import { SpotLight, Text, ScrollControls, Scroll, Html, useScroll } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { TextureLoader, Vector3, Color } from 'three'

// Inject Quicksand font
if (typeof document !== 'undefined') {
  const link = document.createElement('link')
  link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600&display=swap'
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

// ─── STORY ARC ───────────────────────────────────────────────────────────────
//  Opening quote (starts on dark blue)
//  DIVIDER "The Italian Invasion"   → invasion images: light blue → dark blue
//  DIVIDER "Ethiopia Rises"         → rise images: light red → dark red
//  DIVIDER "Italy Returns"          → clash: blue↔red alternating (purple midpoint)
//  DIVIDER "A Child Alone"          → abandoned: pure black
//  DIVIDER "Reconciliation"         → union: soft flower purple (lavender/violet)

const GALLERY_ITEMS = [
  // ── DIVIDER 1 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'The Italian Invasion', sub: 'Colonial ambition, 1895', colorA: '#4a6fa8', colorB: '#2a4a90' },

  // ── ACT 1: INVASION (3 imgs) — light blue deepening to dark blue ──────────
  { section: 'invasion', title: 'The Crossing',  imgPath: '/Occupazione_italiana_di_Adigrat_1895.jpg' },
  { section: 'invasion', title: 'The March',     imgPath: '/panther.jpeg' },
  { section: 'invasion', title: 'The Commander', imgPath: '/panther.jpeg' },

  // ── DIVIDER 2 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'Ethiopia Rises to Defend', sub: 'The Battle of Adwa, 1896', colorA: '#882222', colorB: '#882222' },

  // ── ACT 2: RISE (4 imgs) — light red deepening to dark red ───────────────
  { section: 'rise', title: 'The Proclamation', imgPath: '/beauty_and_beast.jpeg' },
  { section: 'rise', title: 'The Gathering',    imgPath: '/horse_sketch.jpeg' },
  { section: 'rise', title: 'Queen Tayitu',     imgPath: '/kindness.jpeg' },
  { section: 'rise', title: 'The Victory',      imgPath: '/crane.jpeg' },

  // ── DIVIDER 3 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'Italy Returns for Revenge', sub: 'Ethiopia resists again, 1935–1941', colorA: '#882222', colorB: '#3a5fa0' },

  // ── ACT 3: CLASH (4 imgs) — blue↔red alternating, purple midpoints ────────
  { section: 'clash_blue', title: 'The Return',     imgPath: '/foxy.jpeg' },
  { section: 'clash_red',  title: 'The Patriots',   imgPath: '/wonder.jpeg' },
  { section: 'clash_blue', title: 'The Occupation', imgPath: '/forest.jpeg' },
  { section: 'clash_red',  title: 'The Stand',      imgPath: '/lonely_together.jpeg' },

  // ── DIVIDER 4 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'A Child Alone', sub: 'Neither side. Nowhere. Ethiopia, 1941', colorA: '#606060', colorB: '#303030' },

  // ── ACT 4: ABANDONED (1 img) — pure black ────────────────────────────────
  { section: 'abandoned', title: 'Left Behind', imgPath: '/lonely_together.jpeg' },

  // ── DIVIDER 5 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'Reconciliation', sub: 'Two bloodlines, one family', colorA: '#5533aa', colorB: '#3d2288' },

  // ── ACT 5: UNION (3 imgs) — soft flower purple ────────────────────────────
  { section: 'union', title: 'The Grace',      imgPath: '/sprited_away.jpeg' },
  { section: 'union', title: 'The Acceptance', imgPath: '/beauty_and_beast.jpeg' },
  { section: 'union', title: 'Family',         imgPath: '/paradise.jpeg' },
]

// ─── LABEL COLORS ────────────────────────────────────────────────────────────
const LABEL_COLORS = {
  invasion:   '#4a6fa8',
  rise:       '#aa3333',
  clash_blue: '#3a5888',
  clash_red:  '#993333',
  abandoned:  '#505050',
  union:      '#5533aa',
}


// ─── LAYOUT ──────────────────────────────────────────────────────────────────
const GAP           = 4
const IMAGE_WIDTH   = 3
const DIVIDER_WIDTH = 3

function buildLayout(items) {
  let x = IMAGE_WIDTH + GAP + 1
  return items.map((item) => {
    const pos = x
    x += (item.section === 'divider' ? DIVIDER_WIDTH : IMAGE_WIDTH + 1) + GAP
    return { ...item, x: pos }
  })
}

const LAID_OUT    = buildLayout(GALLERY_ITEMS)
const TOTAL_WIDTH = LAID_OUT[LAID_OUT.length - 1].x + IMAGE_WIDTH + GAP + 6

// ─── BACKGROUND COLOR MAP ────────────────────────────────────────────────────
// KEY FIX: dividers NO LONGER collapse to black.
// Instead each divider stop uses the midpoint between the previous and next
// section colors — so the transition is always direct: blue→red, red→black, etc.
// The opening never dips to black between invasion and rise.
//
// Intensity arcs:
//   invasion:  light blue #122248 → mid #08152e → dark #020918
//   rise:      light red  #5a1010 → #3a0a0a → #280606 → dark red #1a0404
//   clash:     alternates blue #020918 ↔ red #250505 (purple midpoint naturally)
//   abandoned: #000000
//   union:     soft flower purple #100520 → #200a40 → #321660

const IMAGE_BG_COLORS = {
  invasion:   ['#122248', '#08152e', '#020918'],
  rise:       ['#5a1010', '#3a0a0a', '#280606', '#1a0404'],
  clash_blue: ['#020918', '#020918'],
  clash_red:  ['#250505', '#250505'],
  abandoned:  ['#000000'],
  union:      ['#100520', '#3e0a40', '#321660'],
}

function buildColorStops() {
  const counters  = {}
  const stops     = []
  let firstClash  = true
  // Track last art color so dividers can bridge smoothly
  let lastArtColor = '#122248'

  // Pre-pass: build a lookup of each item's center color
  const itemColors = []
  const tempCounters = {}
  LAID_OUT.forEach((item) => {
    if (item.section !== 'divider') {
      tempCounters[item.section] = tempCounters[item.section] || 0
      const idx  = tempCounters[item.section]++
      const cols = IMAGE_BG_COLORS[item.section] || ['#050505']
      itemColors.push(cols[Math.min(idx, cols.length - 1)])
    } else {
      itemColors.push(null) // divider placeholder
    }
  })

  LAID_OUT.forEach((item, i) => {
    const mid = (item.x + (item.section === 'divider' ? DIVIDER_WIDTH : IMAGE_WIDTH) / 2) / TOTAL_WIDTH

    if (item.section === 'divider') {
      // Find next art item's color for smooth bridge
      let nextColor = lastArtColor
      for (let j = i + 1; j < itemColors.length; j++) {
        if (itemColors[j] !== null) { nextColor = itemColors[j]; break }
      }
      // Divider midpoint = midpoint between last art color and next art color
      // This means NO black dip between sections
      const a = new Color(lastArtColor), b = new Color(nextColor)
      const bridge = new Color().lerpColors(a, b, 0.5)
      stops.push([mid, '#' + bridge.getHexString()])
    } else {
      counters[item.section] = counters[item.section] || 0
      const idx        = counters[item.section]++
      const cols       = IMAGE_BG_COLORS[item.section] || ['#050505']
      const color      = cols[Math.min(idx, cols.length - 1)]
      const centerFrac = (item.x + IMAGE_WIDTH / 2) / TOTAL_WIDTH
      lastArtColor     = color

      if (item.section === 'clash_blue' || item.section === 'clash_red') {
        if (firstClash) {
          // Slight delay — start at dark red (last rise color) at left edge
          stops.push([item.x / TOTAL_WIDTH, '#1a0404'])
          firstClash = false
        }
        stops.push([centerFrac, color])
      } else {
        stops.push([centerFrac, color])
      }
    }
  })

  stops.sort((a, b) => a[0] - b[0])
  stops.unshift([0, '#122248'])
  stops.push([1, '#321660'])
  return stops
}

const COLOR_STOPS = buildColorStops()

function sampleBg(t) {
  let lo = COLOR_STOPS[0], hi = COLOR_STOPS[COLOR_STOPS.length - 1]
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (t >= COLOR_STOPS[i][0] && t <= COLOR_STOPS[i + 1][0]) {
      lo = COLOR_STOPS[i]; hi = COLOR_STOPS[i + 1]; break
    }
  }
  const f = lo[0] === hi[0] ? 0 : (t - lo[0]) / (hi[0] - lo[0])
  return new Color().lerpColors(new Color(lo[1]), new Color(hi[1]), Math.min(Math.max(f, 0), 1))
}

// ─── SCROLL-DRIVEN BACKGROUND ────────────────────────────────────────────────
const ScrollBackground = () => {
  const scroll = useScroll()
  const { gl } = useThree()
  useFrame(() => { gl.setClearColor(sampleBg(scroll.offset), 1) })
  return null
}

// ─── SINGLE ART PIECE ────────────────────────────────────────────────────────
const WallArt = ({ item }) => {
  const { height: h } = useThree((s) => s.viewport)
  const texture    = useLoader(TextureLoader, item.imgPath)
  const labelColor = LABEL_COLORS[item.section] || '#aaaaaa'

  return (
    <group>
      <SpotLight
        position={[item.x, 2.8, 1.5]}
        penumbra={1}
        angle={0.55}
        attenuation={1}
        anglePower={5}
        intensity={12}
        distance={10}
        castShadow
        color="#ffffff"
      />

      <mesh castShadow position={[item.x, 0.1, 0]}>
        <boxBufferGeometry attach="geometry" args={[IMAGE_WIDTH, h / 2, 0.07]} />
        <meshStandardMaterial attach="material" map={texture} roughness={0.15} metalness={0.7} />
      </mesh>

      {/* Title — pure 3D Text, no HTML lag */}
      <Text
        position={[item.x, -h / 4 - 0.22, 0.06]}
        anchorX="center"
        anchorY="middle"
        scale={[1.1, 1.1, 1.1]}
        color={labelColor}
        letterSpacing={0.12}
        font="https://fonts.gstatic.com/s/quicksand/v31/6xK-dSZaM9iE8KbpRA_LJ3z8mH9BOJvgkBgv18G0wx9b.woff2"
      >
        {item.title}
      </Text>
    </group>
  )
}

// ─── DIVIDER ─────────────────────────────────────────────────────────────────
const DividerCard = ({ item }) => {
  const { height: h } = useThree((s) => s.viewport)
  const cx      = item.x + DIVIDER_WIDTH / 2
  const segH    = h * 0.75
  const textTop = 0.55
  const textBot = 0.45

  return (
    <group>
      <mesh position={[cx, textTop + segH / 2 + 0.05, 0]}>
        <planeGeometry args={[0.005, segH]} />
        <meshStandardMaterial color="#303030" transparent opacity={0.8} />
      </mesh>
      <mesh position={[cx, -(textBot + segH / 2 + 0.05), 0]}>
        <planeGeometry args={[0.005, segH]} />
        <meshStandardMaterial color="#303030" transparent opacity={0.8} />
      </mesh>

      <Text
        position={[cx, 0.28, 0.01]}
        anchorX="center"
        anchorY="middle"
        scale={[3.6, 3.6, 3.6]}
        color={item.colorA}
        font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
      >
        {item.label}
      </Text>

      <Text
        position={[cx, -0.30, 0.01]}
        anchorX="center"
        anchorY="middle"
        scale={[1.5, 1.5, 1.5]}
        color={item.colorB}
        font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
      >
        {item.sub}
      </Text>
    </group>
  )
}

// ─── SCROLL TRACKER ───────────────────────────────────────────────────────────
const ScrollTracker = ({ onScrollChange }) => {
  const scroll     = useScroll()
  const lastOffset = useRef(scroll.offset)
  const idleTimer  = useRef(null)
  useFrame(() => {
    if (Math.abs(scroll.offset - lastOffset.current) > 0.0001) {
      lastOffset.current = scroll.offset
      onScrollChange(true)
      clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(() => onScrollChange(false), 550)
    }
  })
  return null
}

// ─── SCENE ────────────────────────────────────────────────────────────────────
const Scene = () => {
  const { width: sw } = useThree((s) => s.viewport)
  const [scrolling, setScrolling] = useState(false)
  const textScale = sw < 5.5 ? 2.4 : 3.6
  const pages     = (TOTAL_WIDTH / sw) + 0.5

  return (
    <Suspense fallback={
      <Html style={{ fontSize: '6vw', whiteSpace: 'nowrap', color: 'white' }} center>
        Loading...
      </Html>
    }>
      <ScrollControls horizontal damping={20} pages={pages} distance={1}>
        <ScrollTracker onScrollChange={setScrolling} />
        <ScrollBackground />
        <Scroll>
          <Text
            position={[0, 0.5, 0]}
            anchorX="center"
            anchorY="bottom"
            scale={[textScale, textScale, textScale]}
            color="#4a6fa8"
            font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
          >
            Creativity is allowing yourself to make mistakes.
          </Text>
          <Text
            position={[0, 0.3, 0]}
            anchorX="center"
            anchorY="top"
            scale={[textScale, textScale, textScale]}
            color="#4a60a8"
            font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
          >
            Art is knowing which ones to keep.
          </Text>
          <Text
            position={[0, -0.72, 0]}
            anchorX="center"
            anchorY="top"
            scale={[2.0, 2.0, 2.0]}
            color="#2a3050"
            font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
          >
            ~ Scott Adams
          </Text>

          {LAID_OUT.map((item, i) =>
            item.section === 'divider'
              ? <DividerCard key={`div-${i}`} item={item} />
              : <WallArt key={`art-${i}`} item={item} scrolling={scrolling} />
          )}
        </Scroll>
      </ScrollControls>
    </Suspense>
  )
}

// ─── CAMERA RIG ───────────────────────────────────────────────────────────────
const Rig = () => {
  const { camera, mouse } = useThree()
  const vec = new Vector3()
  return useFrame(() =>
    camera.position.lerp(vec.set(mouse.x * 0.35, mouse.y * 0.35, camera.position.z), 0.04)
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Canvas shadows camera>
      <ambientLight intensity={0.35} color={0xffffff} />
      <Scene />
      <EffectComposer>
        <Vignette eskil={false} offset={0.08} darkness={0.65} />
      </EffectComposer>
      <Rig />
    </Canvas>
  )
}

export default App
