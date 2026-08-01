/* EMBER COFFEE — App.js
   Apple-style scroll-controlled video + editorial motion
   No autoplay, no loop, pure scroll scrub
*/
document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger);

  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPct = document.getElementById('loader-pct');
  const grain = document.getElementById('grain');
  const cursorLight = document.getElementById('cursor-light');
  const pageLight = document.getElementById('page-light');
  const video = document.getElementById('hero-video');
  const nav = document.getElementById('nav');
  const navProgressBar = document.getElementById('nav-progress-bar');
  const metaProgress = document.getElementById('meta-progress');
  const metaTime = document.getElementById('meta-time');
  const metaTemp = document.getElementById('meta-temp');
  const heroTrack = document.getElementById('hero-track');
  const heroStage = document.getElementById('hero-stage');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  // ---------- LENIS ----------
  const lenis = new Lenis({
    duration: 1.22,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    smoothTouch: false,
    touchMultiplier: 1.8,
  });

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // ---------- CURSOR LIGHT (independent) ----------
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let curX = mouseX, curY = mouseY;
  let cursorActive = false;

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!cursorActive) {
      cursorActive = true;
      gsap.to(cursorLight, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    }
  }
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  (function cursorLoop() {
    curX += (mouseX - curX) * 0.07;
    curY += (mouseY - curY) * 0.07;
    if (cursorLight) {
      cursorLight.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%,-50%)`;
    }
    // subtle page light responds a bit differently independent
    if (pageLight) {
      const px = (curX / window.innerWidth - 0.5) * 40;
      const py = (curY / window.innerHeight - 0.5) * 40;
      pageLight.style.transform = `translate3d(${px * 0.3}px, ${py * 0.3}px, 0)`;
    }
    requestAnimationFrame(cursorLoop);
  })();

  // ---------- MOBILE MENU ----------
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !isOpen);
      menuToggle.classList.toggle('active', !isOpen);
      if (!isOpen) {
        lenis.stop();
        gsap.to(menuToggle.children, { rotate: (i)=> i===0?45:-45, y: (i)=> i===0?3:-3, duration:0.5, ease:'power3.inOut' });
      } else {
        lenis.start();
        gsap.to(menuToggle.children, { rotate:0, y:0, duration:0.5, ease:'power3.inOut' });
      }
    });
    mobileMenu.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=>{
      mobileMenu.classList.remove('open');
      lenis.start();
      gsap.to(menuToggle.children, { rotate:0, y:0, duration:0.4 });
    }));
  }

  // ---------- VIDEO SETUP ----------
  let videoDuration = 10; // fallback for 10s spec
  let videoReady = false;
  let targetProgress = 0; // 0..1 from ScrollTrigger
  let smoothProgress = 0; // eased
  let currentVideoTime = 0;
  let targetVideoTime = 0;
  let isHeroActive = true;
  let ticking = false;

  // Prevent autoplay/loop per spec
  if (video) {
    video.autoplay = false;
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.pause();
    video.currentTime = 0.001;

    const updateLoaderWithVideo = (p) => {
      if (loaderBar) loaderBar.style.width = `${Math.min(95, p * 100)}%`;
      if (loaderPct) loaderPct.textContent = `${String(Math.floor(Math.min(99, p*100))).padStart(2,'0')}%`;
    };

    // Buffer tracking for loader
    video.addEventListener('progress', () => {
      try {
        if (video.buffered.length) {
          const b = video.buffered.end(video.buffered.length - 1) / (video.duration || videoDuration);
          updateLoaderWithVideo(b * 0.9);
        }
      } catch {}
    });

    video.addEventListener('loadedmetadata', () => {
      if (video.duration && !isNaN(video.duration)) videoDuration = video.duration;
      // iOS needs tiny seek to prime frames
      video.currentTime = 0.001;
      videoReady = true;
      console.log('[EMBER] video metadata', videoDuration);
    });

    video.addEventListener('canplaythrough', () => {
      videoReady = true;
      if (loaderBar) loaderBar.style.width = '100%';
      if (loaderPct) loaderPct.textContent = '100%';
      setTimeout(hideLoader, 420);
    });

    video.addEventListener('error', (e) => {
      console.warn('[EMBER] video load error, using fallback', e);
      videoReady = false;
      videoDuration = 10;
      // hide after short delay anyway
      setTimeout(hideLoader, 600);
      // hide video element visually but keep UI working
      if (video) video.style.opacity = '0.55';
    });

    // Safety: if file not found locally on GH pages initial deploy without mp4, loader still finishes
    setTimeout(() => {
      if (!videoReady) {
        console.log('[EMBER] video timeout — proceeding');
        hideLoader();
      }
    }, 3800);
  } else {
    setTimeout(hideLoader, 800);
  }

  function hideLoader() {
    if (loader && !loader.classList.contains('hidden')) {
      loader.classList.add('hidden');
      gsap.fromTo('#hero-stage .hero-content', { opacity:0 }, { opacity:1, duration:1.2, ease:'power2.out', delay:0.2 });
      initScrollAnimations();
    }
  }

  // Fallback immediate hide if loader missing
  if (!loader) initScrollAnimations();

  // ---------- HERO SCRUB LOGIC (Apple-style) ----------
  let heroScrollTrigger = null;

  function initScrollAnimations() {
    // ---------- HERO TRACK: progress source ----------
    heroScrollTrigger = ScrollTrigger.create({
      trigger: heroTrack,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.2, // tiny native scrub, we smooth further
      onUpdate: (self) => {
        targetProgress = self.progress;
        // nav progress overall page? We'll handle separately, but use hero progress for meta
        // Scrub active only in hero
        isHeroActive = self.progress < 0.999;
      }
    });

    // ---------- SMOOTH RENDERING LOOP ----------
    let lastTime = performance.now();
    const lerp = (a,b,t)=> a + (b-a)*t;

    function heroRender() {
      const now = performance.now();
      const dt = Math.min(32, now - lastTime) / 16.666;
      lastTime = now;

      // eased interpolation — crucial for no jumps
      // use exponential smoothing dependent on dt
      const ease = 0.08; // tuned for buttery
      smoothProgress = lerp(smoothProgress, targetProgress, 1 - Math.pow(1 - ease, dt));

      // Clamp
      smoothProgress = Math.max(0, Math.min(1, smoothProgress));

      const p = smoothProgress;
      targetVideoTime = p * videoDuration;

      // Video time smoothing (separate from progress to avoid frame stutter)
      if (videoReady && video && isHeroActive) {
        // Avoid seeking if difference micro
        const diff = targetVideoTime - currentVideoTime;
        if (Math.abs(diff) > 0.001) {
          currentVideoTime = lerp(currentVideoTime, targetVideoTime, 1 - Math.pow(1 - 0.18, dt));
          // For browsers that support fastSeek, use it when seeking large delta
          if (Math.abs(diff) > 0.3 && 'fastSeek' in video) {
            try { video.fastSeek(currentVideoTime); } catch(e){ video.currentTime = currentVideoTime; }
          } else {
            // Direct assign is okay now due to smoothing
            video.currentTime = currentVideoTime;
          }
        }
      } else if (video && !isHeroActive) {
        // hold final frame
        if (Math.abs(video.currentTime - videoDuration) > 0.05) {
          video.currentTime = videoDuration - 0.05;
          currentVideoTime = videoDuration - 0.05;
        }
        video.pause();
      }

      // ---------- SYNC UI WITH TIMELINE ----------
      syncHeroUI(p);

      requestAnimationFrame(heroRender);
    }
    heroRender();

    // ---------- NAV COMPRESSION & GLOBAL PROGRESS ----------
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const prog = self.progress;
        if (navProgressBar) navProgressBar.style.width = `${prog * 100}%`;
        if (prog > 0.02) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      }
    });

    // Cursor grain evolve ( already in syncHeroUI partially)
    // Section reveals — spring based
    revealSections();
  }

  function syncHeroUI(p) {
    // p 0..1
    const els = {
      l1: document.getElementById('h-l1'),
      l2: document.getElementById('h-l2'),
      l3: document.getElementById('h-l3'),
      eyebrow: document.getElementById('h-eyebrow'),
      kicker: document.getElementById('h-kicker'),
      copy: document.getElementById('h-copy'),
      cta: document.getElementById('h-cta'),
      meta: document.getElementById('h-meta'),
      scroll: document.getElementById('h-scroll'),
      grain: document.getElementById('grain'),
      video: video
    };

    // helpers
    const clamp01 = (v)=> Math.max(0, Math.min(1, v));
    const map = (p, a,b) => clamp01((p-a)/(b-a));

    // Headlines: subtle translate, scale, fade — Apple style
    if (els.l1) {
      const m1 = map(p, 0, 0.32); // fade out
      gsap.set(els.l1, {
        y: -m1 * 90,
        scale: 1 - m1 * 0.08,
        opacity: 1 - m1,
        filter: `blur(${m1*6}px)`,
        transformOrigin: '50% 50%'
      });
    }
    if (els.l2) {
      const m2 = map(p, 0.12, 0.5);
      gsap.set(els.l2, {
        y: -m2 * 110,
        scale: 1 - m2 * 0.09,
        opacity: 1 - m2,
        filter: `blur(${m2*8}px)`
      });
    }
    if (els.l3) {
      const m3 = map(p, 0.22, 0.62);
      gsap.set(els.l3, {
        y: -m3 * 130,
        x: m3 * -20, // subtle editorial drift
        scale: 1 - m3 * 0.06,
        opacity: 1 - m3,
        rotation: m3 * -1.5,
        filter: `blur(${m3*6}px)`
      });
    }

    // Eyebrow / kicker fade early
    if (els.eyebrow) gsap.set(els.eyebrow, { opacity: 1 - map(p, 0, 0.22)*1.2, y: -map(p,0,0.22)*20 });
    if (els.kicker) gsap.set(els.kicker, { opacity: 1 - map(p, 0.02, 0.28), y: -map(p,0.02,0.28)*16 });

    // Copy + CTA
    if (els.copy) gsap.set(els.copy, { opacity: 1 - map(p, 0.35, 0.68), y: -map(p,0.35,0.68)*40 });
    if (els.cta) {
      const m = map(p, 0.42, 0.72);
      gsap.set(els.cta, {
        opacity: 1 - m,
        y: -m*32,
        scale: 1 - m*0.04,
        filter: `blur(${m*4}px)`
      });
      // glass reflections shift naturally with scroll
      const reflect = els.cta.querySelector('.cta-reflect');
      if (reflect) reflect.style.transform = `translateX(${ -80 + p*160 }%) skewX(-18deg)`;
    }

    if (els.meta) gsap.set(els.meta, { opacity: 1 - map(p, 0.5, 0.78), y: -map(p,0.5,0.78)*30 });
    if (els.scroll) gsap.set(els.scroll, { opacity: 1 - map(p, 0, 0.18)*2 });

    // Video transform + filter evolution
    if (els.video) {
      const scale = 1.06 + p * 0.12;
      const brightness = 0.95 - p * 0.15;
      const saturate = 1.05 + p * 0.15;
      const blur = p > 0.92 ? (p-0.92)*18 : 0; // only slight blur near end as transition
      gsap.set(els.video, {
        scale: scale,
        filter: `contrast(1.05) brightness(${brightness}) saturate(${saturate}) blur(${blur}px)`
      });
    }

    // Grain opacity evolution
    if (els.grain) {
      els.grain.style.opacity = (0.032 + p * 0.06).toFixed(3);
    }

    // Navigation compresses near end
    if (p > 0.72) nav.classList.add('compressed');
    else nav.classList.remove('compressed');

    // Meta values
    if (metaProgress) metaProgress.textContent = `${(p*100).toFixed(1).padStart(4,'0')}%`;
    if (metaTime) metaTime.textContent = `${currentVideoTime.toFixed(1).padStart(4,'0')}s / ${videoDuration.toFixed(1)}s`;
    if (metaTemp) {
      const temp = 187 + p * 17;
      metaTemp.textContent = `${187}°C → ${temp.toFixed(0)}°C`;
    }

    // Background wash transition seamless
    const wash = document.getElementById('hero-wash');
    if (wash) wash.style.opacity = `${1 - p}`;

    // Glass reflections shift across drink cards (parallax small)
    document.querySelectorAll('.drink-glass-reflect').forEach((el,i)=>{
      el.style.transform = `translateX(${-30 + p*60 + Math.sin(p*3 + i)*8 }%)`;
    });
  }

  function revealSections() {
    // Generic fade-ups
    const revealEls = gsap.utils.toArray('.content-section .eyeline, .display, .lead, .story-right p, .section-desc, .drink-card, .col-card, .rp, .machine-frame, .g-item, .journal-card, .contact-grid > *');
    revealEls.forEach(el=>{
      gsap.fromTo(el,
        { y: 40, opacity:0, willChange:'transform, opacity' },
        { y:0, opacity:1, duration:1.1, ease:'power3.out',
          scrollTrigger:{
            trigger: el,
            start:'top 86%',
            once: true
          },
          overwrite:'auto'
        }
      );
    });

    // Staggered headers
    gsap.utils.toArray('.story-stats, .drinks-header, .collection-header, .journal-head').forEach(block=>{
      const children = block.children;
      gsap.fromTo(children,
        { y:24, opacity:0 },
        { y:0, opacity:1, duration:0.9, stagger:0.08, ease:'power3.out',
          scrollTrigger:{ trigger:block, start:'top 84%', once:true }
        }
      );
    });

    // Drink cards 3D tilt mouse (GPU)
    const cards = document.querySelectorAll('[data-tilt]');
    cards.forEach(card=>{
      card.addEventListener('mousemove', (e)=>{
        const rect = card.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        gsap.to(card, { rotationY: dx*8, rotationX: -dy*8, transformPerspective:1000, transformOrigin:'center', duration:0.8, ease:'power3.out' });
      });
      card.addEventListener('mouseleave', ()=>{
        gsap.to(card, { rotationY:0, rotationX:0, duration:1.1, ease:'elastic.out(1,0.5)' });
      });
    });

    // Roastery sticky enhanced? Already CSS, add parallax on scroll
    ScrollTrigger.create({
      trigger:'#roastery',
      start:'top bottom',
      end:'bottom top',
      onUpdate:self=>{
        const mg = document.querySelector('.machine-glow');
        if (mg) mg.style.transform = `translate3d(0, ${self.progress * 60 - 30}px, 0)`;
      }
    });

    // Gallery light parallax
    gsap.utils.toArray('.g-item .ph').forEach(ph=>{
      gsap.to(ph, {
        yPercent: -8,
        ease:'none',
        scrollTrigger:{
          trigger: ph.parentElement,
          start:'top bottom',
          end:'bottom top',
          scrub:1.2
        }
      });
    });
  }

  // ---------- Smooth anchor scroll ----------
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href');
      if (id.length>1 && document.querySelector(id)) {
        e.preventDefault();
        const target = document.querySelector(id);
        lenis.scrollTo(target, { offset: -56, duration: 1.4 });
      }
    });
  });

  // ---------- PERFORMANCE: pause video when not hero ----------
  let heroObserver = new IntersectionObserver((entries)=>{
    entries.forEach(ent=>{
      isHeroActive = ent.isIntersecting;
      if (!ent.isIntersecting && video) {
        video.pause();
      }
    });
  }, { threshold: 0 });

  if (heroTrack) heroObserver.observe(heroTrack);

  // ---------- VIDEO PRELOAD for GitHub Pages ----------
  if (video) {
    const showHint = (msg) => {
      const hint = document.createElement('div');
      hint.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:10;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(12px);padding:12px 18px;border-radius:100px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(245,241,235,0.7);pointer-events:none;transition:opacity .8s ease";
      hint.textContent = msg;
      heroStage?.appendChild(hint);
      setTimeout(()=> { hint.style.opacity='0'; }, 4200);
    };

    fetch('./coffeebackground.mp4', { method:'HEAD' }).then(r=>{
      if (!r.ok) {
        console.warn('[EMBER] coffeebackground.mp4 not found — using cinematic fallback for preview. Upload your file to repo root to replace.');
        // Cinematic fallback (Pexels free, CC0, coffee pour) for GitHub Pages preview before upload
        const fallbackSrc = 'https://videos.pexels.com/video-files/29068399/12556689_1920_1080_30fps.mp4';
        // Keep original source as first, add fallback only if load error will happen
        video.addEventListener('error', () => {
          if (video.currentSrc.includes('pexels') === false) {
            video.src = fallbackSrc;
            video.load();
            video.pause();
            showHint('Preview fallback playing — upload coffeebackground.mp4 to use your 10s hero');
          }
        }, { once: true });
        // Try to trigger error path by attempting load; if file missing, browser will fire error
        // Also show hint immediately so user knows
        setTimeout(()=> {
          if (video.networkState === 3 || video.readyState === 0) {
            video.src = fallbackSrc;
            video.load();
          }
        }, 600);
        showHint('coffeebackground.mp4 not found — preview fallback active');
      } else {
        console.log('[EMBER] coffeebackground.mp4 found, using local hero');
      }
    }).catch(()=>{
      // offline or HEAD blocked by server (GitHub Pages may block HEAD) — ignore, rely on video error event
    });
  }

  // ---------- Accessibility: reduced motion ----------
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) {
    // lower smooth intensity
    grain.style.display='none';
    if (cursorLight) cursorLight.style.display='none';
  }

  // ---------- Resize handling ----------
  let resizeTimeout;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(()=> ScrollTrigger.refresh(), 250);
  });

  // Initial loader progress fake if video stalls
  let fake = 0;
  const fakeInt = setInterval(()=>{
    fake += 0.02 + Math.random()*0.06;
    if (fake < 0.92 && loaderBar && !videoReady) {
      loaderBar.style.width = `${fake*100}%`;
      if (loaderPct) loaderPct.textContent = `${String(Math.floor(fake*100)).padStart(2,'0')}%`;
    } else clearInterval(fakeInt);
  }, 120);

});
