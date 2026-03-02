import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import React, { Suspense, useState, useRef, useEffect } from 'react'
import { SpotLight, Text, ScrollControls, Scroll, Html, useScroll } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import { TextureLoader, Vector3, Color } from 'three'

// Inject Quicksand and Cormorant Garamond fonts
if (typeof document !== 'undefined') {
  const link = document.createElement('link')
  link.href = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap'
  link.rel = 'stylesheet'
  document.head.appendChild(link)
}

// ─── AUDIO CONFIGURATION ────────────────────────────────────────────────────
// Map sections to audio files - update these paths to your actual audio files
const SECTION_AUDIO = {
  invasion: '/audio/invasion.mp3',
  rise: '/audio/rise.mp3',
  clash: '/audio/clash.mp3', // unified
  abandoned: '/audio/abandoned.mp3',
  union: '/audio/union.mp3',
}

const AUDIO_START = {
  invasion: 12,
  rise: 100,
  clash: 100,
  abandoned: 30,
  union: 14
}
// ─── STORY ARC ───────────────────────────────────────────────────────────────
//  Opening quote (starts on dark blue)
//  DIVIDER "The Italian Invasion"   → invasion images: light blue → dark blue
//  DIVIDER "Ethiopia Rises"         → rise images: light red → dark red
//  DIVIDER "Italy Returns"          → clash: blue↔red alternating (purple midpoint)
//  DIVIDER "A Child Alone"          → abandoned: pure black
//  DIVIDER "Reconciliation"         → union: soft flower purple (lavender/violet)

// Quotes for each artwork - elegant and meaningful with golden serif styling
const ART_QUOTES = {
  // Act 1: Invasion
  'The Crossing': '"He came to Ethiopia with the colonial campaign."',
  'The March': '"He came to Ethiopia with the colonial campaign."',
  'The Commander': '"My great-great-grandfather — I will call him the Commander — was an Italian military officer."',
  'The Collapse': '"Adwa, for him, was a defeat. A complete collapse."',
  
  // Act 2: Rise
  'The Proclamation': '"He put his word on the Virgin Mary, calling on everyone to support, to give everything they had."',
  'The Myth': '"It was not just the warriors who fought. They believed Saint George was among them, guiding and protecting their every step."',
  'Queen Tayitu': '"People on our side do not remember it as cruelty. They remember it as intelligence."',
  'The Victory': '"He survived. That was the miracle my father always ended with. He came home."',
  
  // Act 3: Clash
  'The Return': '"His grandson came back. That was my grandfather."',
  'The Patriots': '"There were those who took to the bush rather than submit."',
  'The Occupation': '"It was the atmosphere. The fear. The cruelty of the occupation."',
  'The Stand': '"When mountains stand together, not even eagles can divide them."',
  
  // Act 4: Abandoned
  'Left Behind': '"He was around ten, eleven years old. He was left in Ethiopia. He could not return to Italy. He was a child alone."',
  
  // Act 5: Union
  'The Grace': '"You are not being cared for because your people deserved mercy. You are being cared for because you are a child."',
  'The Acceptance': '"Yes. And I have sat with that. I am not Black by skin - I know that. But I am Black by heart. I was raised here."',
  'Family': '"But they chose to see a child as a child before they chose to be political. That is the lesson I would want you to carry. Not just the victory. The humanity underneath it."'
}

// Updated GALLERY_ITEMS with corrected titles
const GALLERY_ITEMS = [
  // ── DIVIDER 1 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'The Italian Invasion: His Story', sub: 'Colonial ambition, 1895', colorA: '#4a6fa8', colorB: '#2a4a90' },

  // ── ACT 1: INVASION (3 imgs + collapse quote) — light blue deepening to dark blue ──────────
  { section: 'invasion', title: 'The March',     imgPath: '/Occupazione_italiana_di_Adigrat_1895.jpg' },
  { section: 'invasion', title: 'The Commander', imgPath: '/comander.jpg' },
  { section: 'invasion', title: 'The Collapse',  imgPath: '/collapse.webp' },

  // ── DIVIDER 2 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'Ethiopia Rises to Defend: Her Story', sub: 'The Battle of Adwa, 1896', colorA: '#882222', colorB: '#882222' },

  // ── ACT 2: RISE (4 imgs) — light red deepening to dark red ───────────────
  { section: 'rise', title: 'The Proclamation', imgPath: '/minilik.jpg' },
  { section: 'rise', title: 'The Myth',    imgPath: '/gathering.webp' },
  { section: 'rise', title: 'Queen Tayitu',     imgPath: '/Empress-Taytu.jpg' },
  { section: 'rise', title: 'The Victory',      imgPath: '/victory.jpg' },

  // ── DIVIDER 3 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'Italy Returns for Revenge: Conflict of Bloodlines', sub: 'Ethiopia resists again, 1935–1941', colorA: '#882222', colorB: '#3a5fa0' },

  // ── ACT 3: CLASH (4 imgs) — blue↔red alternating, purple midpoints ────────
  { section: 'clash_blue', title: 'The Return',     imgPath: '/return.jpg' },
  { section: 'clash_red',  title: 'The Patriots',   imgPath: '/worriors.jpg' },
  { section: 'clash_blue', title: 'The Occupation', imgPath: '/occupation.jpg' },
  { section: 'clash_red',  title: 'The Stand',      imgPath: '/stand.jpg' },

  // ── DIVIDER 4 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'A Child Alone: His Grandfather', sub: 'Neither side. Nowhere. Ethiopia, 1941', colorA: '#606060', colorB: '#303030' },

  // ── ACT 4: ABANDONED (1 img) — pure black ────────────────────────────────
  { section: 'abandoned', title: 'Left Behind', imgPath: '/alone.jpg' },

  // ── DIVIDER 5 ─────────────────────────────────────────────────────────────
  { section: 'divider', label: 'Reconciliation', sub: 'Two bloodlines, one family', colorA: '#5533aa', colorB: '#3d2288' },

  // ── ACT 5: UNION (3 imgs) — soft flower purple ────────────────────────────
  { section: 'union', title: 'The Grace',      imgPath: '/reconcilation.jpg' },
  { section: 'union', title: 'The Acceptance', imgPath: '/dad.jpg' },
  { section: 'union', title: 'Family',         imgPath: '/family.jpg' },
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

// Golden color for quotes
const QUOTE_COLOR = '#D4AF37' // Rich golden color

// ─── LAYOUT ──────────────────────────────────────────────────────────────────
const GAP           = 4
const IMAGE_WIDTH   = 3.3
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
  union:      ['#100520', '#3e0a40', '#3e0a40'],
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
  stops.push([1, '#640066'])
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

// ─── AUDIO MANAGER COMPONENT ─────────────────────────────────────────────────
// ─── AUDIO MANAGER COMPONENT ─────────────────────────────────────────────────
// ─── AUDIO MANAGER COMPONENT (Autoplay Policy Compliant) ───────────────────
const AudioManager = () => {
  const scroll = useScroll()
  const [currentSection, setCurrentSection] = useState('invasion')
  const audioRefs = useRef({})
  const [userInteracted, setUserInteracted] = useState(false)

  // 🔑 Treat blue/red as ONE logical section
  const getLogicalSection = (section) => {
    if (section === 'clash_blue' || section === 'clash_red') return 'clash'
    return section
  }

  // INIT AUDIO
  useEffect(() => {
    const sections = ['invasion', 'rise', 'clash', 'abandoned', 'union']

    sections.forEach(section => {
      const src = SECTION_AUDIO[section]
      if (!src) return

      const audio = new Audio(src)
      audio.loop = true
      audio.volume = 0.5
      audio.preload = 'auto'

      audioRefs.current[section] = audio
    })

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
    }
  }, [])

  // SCROLL DETECTION
  useFrame(() => {
    const scrollPos = scroll.offset * TOTAL_WIDTH

    let detected = currentSection
  let minDistance = Infinity

  LAID_OUT.forEach(item => {
    if (item.section !== 'divider') {
      // 👇 shift trigger earlier (25% into image instead of center)
      const triggerPoint = item.x + IMAGE_WIDTH * 0.25

      const dist = Math.abs(scrollPos - triggerPoint)

      if (dist < minDistance) {
        minDistance = dist
        detected = item.section
      }
    }
  })

    const logicalCurrent = getLogicalSection(currentSection)
    const logicalNext = getLogicalSection(detected)

    if (logicalNext !== logicalCurrent) {
      // update section
      setCurrentSection(detected)

      // stop all audio
      Object.values(audioRefs.current).forEach(a => a?.pause())

      // play new section
      const nextAudio = audioRefs.current[logicalNext]

      if (nextAudio && userInteracted) {
        nextAudio.currentTime = AUDIO_START[logicalNext] || 0
        nextAudio.play().catch(() => {})
      }
    } else {
      // same logical section → just update visuals
      setCurrentSection(detected)
    }
  })

  // USER INTERACTION (required for audio)
  useEffect(() => {
    const startAudio = () => {
      if (userInteracted) return

      setUserInteracted(true)

      const logical = getLogicalSection(currentSection)
      const current = audioRefs.current[logical]

      if (current) {
        current.currentTime = AUDIO_START[logical] || 0
        current.play().catch(() => {})
      }
    }

    window.addEventListener('click', startAudio)
    window.addEventListener('keydown', startAudio)
    window.addEventListener('touchstart', startAudio)

    return () => {
      window.removeEventListener('click', startAudio)
      window.removeEventListener('keydown', startAudio)
      window.removeEventListener('touchstart', startAudio)
    }
  }, [currentSection, userInteracted])

  return (
    <Html position={[10, -3, 0]}>
      {!userInteracted && (
        <button
          style={{
            padding: '10px 16px',
            background: '#111',
            color: 'white',
            border: '1px solid #444',
            cursor: 'pointer'
          }}
          onClick={() => {
            setUserInteracted(true)

            const logical = getLogicalSection(currentSection)
            const current = audioRefs.current[logical]

            if (current) {
              current.currentTime = AUDIO_START[logical] || 0
              current.play().catch(() => {})
            }
          }}
        >
          Enable Sound
        </button>
      )}
    </Html>
  )
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
  const quote = ART_QUOTES[item.title] || '"..."'

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

      {/* Title — local serif font */}
      <Text
        position={[item.x, -h / 4 - 0.35, 0.06]}
        anchorX="center"
        anchorY="middle"
        scale={[1.3, 1.3, 1.3]}
        color={labelColor}
        letterSpacing={0.08}
        font="/fonts/Serif.ttf"
      >
        {item.title}
      </Text>

      {/* Quote — local serif italic font, positioned below title */}
      <Text
        position={[item.x, -h / 4 - 0.65, 0.06]}
        anchorX="center"
        anchorY="end"
        scale={[0.85, 0.85, 0.90]}
        color={QUOTE_COLOR}
        letterSpacing={0.04}
        fontSize={0.15}
        maxWidth={2.8}
        textAlign="center"
        lineHeight={1.7}
        font="/fonts/Serif-Italic.ttf"
      >
        {quote}
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
        <AudioManager />
        <Scroll>
          <Text
            position={[0, 0.5, 0]}
            anchorX="center"
            anchorY="bottom"
            scale={[textScale, textScale, textScale]}
            color="#C58b00"
            font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
          >
            "You carry both sides
          </Text>
          <Text
            position={[0, 0.3, 0]}
            anchorX="center"
            anchorY="top"
            scale={[textScale, textScale, textScale]}
            color="#C58b00"
            font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
          >
            You do not get the luxury of a simple story."
          </Text>
           <Text
            position={[0, -0.5, 0]}
            anchorX="center"
            anchorY="top"
            scale={[textScale, textScale, textScale]}
            color="#ffffff"
            font="https://fonts.gstatic.com/s/sacramento/v5/buEzpo6gcdjy0EiZMBUG4C0f-w.woff"
          >
            Click anywhere to start Audio, and Scroll to move 
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
