# EMBER COFFEE — Cinematic Scroll-Driven Landing

Production-ready, GitHub Pages compatible landing for **EMBER COFFEE**.
Apple-style scroll-scrubbed 10s hero video — no autoplay, no loop, pure scroll timeline.

### Live Structure
```
/
├── index.html              # Main page (pure HTML)
├── style.css               # Editorial + smoked glass UI system
├── app.js                  # Lenis + GSAP ScrollTrigger scrub engine
├── coffeebackground.mp4    # <-- Upload your 10-second hero here (root)
└── .nojekyll               # GitHub Pages flag
```

### The Key Interaction — How It Works

1. **Hero track is 350vh** — gives you scroll runway.
2. **`#hero-stage` is sticky 100vh** — pinned while you scroll.
3. **Video has no `autoplay` or `loop`**. JS forces `pause()`, `muted`, `playsInline`.
4. **ScrollTrigger** reads progress 0→1 over `#hero-track`.
5. **Eased lerp loop** (0.08 progress, 0.18 time) smooths `currentTime`:
   ```js
   smoothProgress += (targetProgress - smoothProgress) * 0.08
   video.currentTime = lerp(currentTime, target*Duration, 0.18)
   ```
   Reverse scroll naturally plays video backwards.
6. **Once progress hits 1**, video pauses on final frame. Observer stops scrubbing. Seamless wash transitions into Story.
7. **UI sync**: headlines translate/scale/fade, glass reflections shift `translateX(p*160%)`, nav compresses at p>0.72, grain opacity 0.032 → 0.092, lighting evolves, meta temp 187→204°C.

Performance notes:
- `will-change: transform, filter`
- `transform: translateZ(0)` GPU
- No video decode outside hero via `IntersectionObserver`
- Lenis 1.1.18 smooth scroll + GSAP ticker sync (`lenis.raf`)
- Spring tilts via `perspective(1000px) rotateY/X`

### Deploy to GitHub Pages

1. Upload `coffeebackground.mp4` (10s, ~1080p, <12MB, H.264) to repo root. Name must be exactly `coffeebackground.mp4`.
2. Commit `index.html`, `style.css`, `app.js`, `.nojekyll`.
3. Repo → Settings → Pages → Source: `main` / root.
4. Wait ~1 min.

Works without build. All via CDN:
- `gsap@3.12.5` + `ScrollTrigger`
- `lenis@1.1.18` (studio-freight successor)
- Google Fonts: Bodoni Moda, Instrument Serif, Newsreader, Inter

If `coffeebackground.mp4` is missing, page loads a Pexels coffee pour fallback for preview and shows a small pill hint. Replace by uploading your file — no code change needed.

### Editing Content

- Hero copy: `#h-l1/l2/l3`, `#h-copy`
- Drinks: `.drink-card`
- Collection: `.col-card`
- Colors: `:root` in `style.css` — `--ember`, `--paper`, `--bg`

### Requirements Met

- [x] No autoplay/loop
- [x] Scroll drives video 0→100% frame-by-frame, reversible, eased interpolation, no jumps
- [x] Center clean, subtle dark overlays only at edges
- [x] Headlines translate/scale/fade synced to timeline
- [x] Glass reflections shift naturally
- [x] Navigation compresses
- [x] Cursor lighting independent (800px radial, lerp 0.07)
- [x] Grain + lighting evolve
- [x] Seamless transition after hero
- [x] Sections: Story, Signature Drinks, Collection, Roastery, Gallery, Journal, Contact
- [x] Editorial minimal, smoked glass UI, oversized typography, architectural spacing, spring, GSAP, Lenis, CSS 3D, GPU
- [x] Video only scrubbed in hero, paused on final frame
- [x] GitHub Pages ready — HTML/CSS/JS only

Crafted slowly. Remembered forever.
