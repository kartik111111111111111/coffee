/* EMBER COFFEE — App.js | Robust scroll-scrub fix */
document.addEventListener('DOMContentLoaded', () => {
  const log = (...a) => console.log('[EMBER]', ...a);

  // Elements
  const loader = document.getElementById('loader');
  const loaderBar = document.getElementById('loader-bar');
  const loaderPct = document.getElementById('loader-pct');
  const loaderMsg = document.getElementById('loader-msg');
  const video = document.getElementById('hero-video');
  const videoFallback = document.getElementById('video-fallback');
  const nav = document.getElementById('nav');
  const navProgressBar = document.getElementById('nav-progress-bar');
  const heroTrack = document.getElementById('hero-track');
  const grain = document.getElementById('grain');
  const cursorLight = document.getElementById('cursor-light');
  const pageLight = document.getElementById('page-light');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  // Safety: ensure gsap present
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    log('GSAP missing — waiting');
    setTimeout(() => location.reload(), 1500);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Lenis — with fallback
  let lenis = null;
  try {
    const LenisCtor = window.Lenis || window.lenis;
    if (LenisCtor) {
      lenis = new LenisCtor({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
        touchMultiplier: 1.6,
        orientation: 'vertical',
        gestureOrientation: 'vertical',
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      log('Lenis active');
    } else {
      log('Lenis not found — using native scroll');
    }
  } catch (e) {
    log('Lenis init failed', e);
  }

  // Cursor light — independent of scroll
  let mx = window.innerWidth/2, my = window.innerHeight/2, cx = mx, cy = my, active = false;
  window.addEventListener('mousemove', (e)=>{ mx=e.clientX; my=e.clientY; if(!active){ active=true; gsap.to(cursorLight,{opacity:1,duration:0.6}); } }, {passive:true});
  (function loopCursor(){ cx+=(mx-cx)*0.07; cy+=(my-cy)*0.07; if(cursorLight) cursorLight.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`; if(pageLight){ const px=(cx/window.innerWidth-0.5)*36; const py=(cy/window.innerHeight-0.5)*28; pageLight.style.transform=`translate3d(${px}px,${py}px,0)`; } requestAnimationFrame(loopCursor); })();

  // Mobile menu
  if (menuToggle){
    menuToggle.addEventListener('click', ()=>{
      const open = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !open);
      if (lenis) { if(!open) lenis.stop(); else lenis.start(); }
      gsap.to(menuToggle.children, { rotate:i=>open?0:(i===0?45:-45), y:i=>open?0:(i===0?3:-3), duration:0.45, ease:'power3.inOut' });
    });
    mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>{ mobileMenu.classList.remove('open'); if(lenis) lenis.start(); gsap.to(menuToggle.children,{rotate:0,y:0,duration:0.35}); }));
  }

  // Loader — guaranteed hide
  let loaderDone = false;
  function hideLoader(){
    if(loaderDone) return; loaderDone=true;
    if(loaderBar) loaderBar.style.width='100%';
    if(loaderPct) loaderPct.textContent='100%';
    if(loaderMsg) loaderMsg.textContent='READY';
    gsap.to(loader, { opacity:0, duration:0.7, ease:'power2.inOut', onComplete:()=>{ loader.classList.add('hidden'); ScrollTrigger.refresh(); } });
    // fade-in hero content after loader
    gsap.fromTo('#hero-stage .hero-content', {opacity:0},{opacity:1, duration:1, ease:'power2.out', delay:0.15});
  }
  // Fake loader progress 0->95% in 1.1s
  let fakeP=0; const fakeInt=setInterval(()=>{ fakeP=Math.min(0.94, fakeP+0.04+Math.random()*0.06); if(loaderBar) loaderBar.style.width=`${fakeP*100}%`; if(loaderPct) loaderPct.textContent=`${String(Math.floor(fakeP*100)).padStart(2,'0')}%`; if(fakeP>=0.94) clearInterval(fakeInt); }, 90);
  // Absolute max 1800ms -> ensure hide + init
  setTimeout(hideLoader, 1600);

  // VIDEO SETUP — bulletproof
  let videoDuration = 10; // spec says 10s
  let targetProgress = 0; // 0..1 from ScrollTrigger
  let smoothProgress = 0; // eased
  let currentTimeSmoothed = 0;
  let videoReady = false;
  let triedFallback = false;
  const FALLBACK = 'https://videos.pexels.com/video-files/29068399/12556689_1920_1080_30fps.mp4';

  if(video){
    video.autoplay = false;
    video.loop = false;
    video.muted = true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.preload = 'auto';
    video.pause();
    try { video.currentTime = 0; } catch {}

    const markReady = () => {
      if(!videoReady){
        videoReady = true;
        if(video.duration && !isNaN(video.duration)) videoDuration = video.duration;
        video.classList.add('is-ready');
        if(videoFallback) videoFallback.classList.add('is-hidden');
        log('video ready', videoDuration, 'src=', video.currentSrc.slice(-60));
        if(loaderMsg) loaderMsg.textContent = `READY • ${videoDuration.toFixed(1)}s`;
        try { video.pause(); } catch {}
      }
    };

    video.addEventListener('loadedmetadata', ()=>{
      if(video.duration) videoDuration = video.duration;
      // prime first frame then pause — critical for scrub to work
      try { video.currentTime = 0.001; } catch {}
      markReady();
    });
    video.addEventListener('canplay', markReady);
    video.addEventListener('canplaythrough', markReady);

    video.addEventListener('progress', ()=>{
      try{
        if(video.buffered.length){
          const buffered = video.buffered.end(video.buffered.length-1);
          const pct = Math.min(0.98, buffered / (videoDuration||10));
          if(!loaderDone && loaderBar) loaderBar.style.width = `${Math.max(fakeP*100, pct*100)}%`;
        }
      }catch{}
    });

    video.addEventListener('error', (e)=>{
      log('video error', video.error, 'src', video.currentSrc);
      if(!triedFallback){
        triedFallback = true;
        log('Trying fallback remote preview');
        if(loaderMsg) loaderMsg.textContent='LOADING PREVIEW FALLBACK';
        video.src = FALLBACK;
        video.load();
        // retry after short delay
        setTimeout(()=>{ if(!videoReady){ try{ video.play().then(()=>{ video.pause(); markReady(); }).catch(()=>{}); }catch{} } }, 400);
      } else {
        // both failed — show fallback gradient and still allow UI scrub
        log('Both sources failed — using gradient fallback but scrub UI continues');
        if(videoFallback) videoFallback.style.opacity='1';
        videoDuration = 10;
        videoReady = true; // allow UI to think ready so meta updates, even if no video pixels
        if(loaderMsg) loaderMsg.textContent='GRADIENT FALLBACK — SCROLL STILL WORKS';
      }
    });

    // Trigger load
    video.load();
    // Some browsers need explicit play->pause to unlock frames on first load (no autoplay spec still respected because we immediately pause and scrub drives time)
    setTimeout(()=>{
      if(!videoReady){
        video.play().then(()=>{
          video.pause();
          markReady();
          log('play->pause prime succeeded');
        }).catch(()=>{
          log('play prime blocked — waiting for metadata');
        });
      }
    }, 300);
  } else {
    log('no video element');
    videoDuration = 10;
    videoReady = true;
  }

  // HERO SCRUB
  let heroTrigger = null;
  let isHeroVisible = true;

  function initScroll(){
    // Hero progress driver
    heroTrigger = ScrollTrigger.create({
      trigger: heroTrack,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false, // we do manual smoothing
      onUpdate: (self)=>{
        targetProgress = self.progress;
        isHeroVisible = self.progress < 0.999 && self.progress >=0;
      },
      onLeave: ()=>{ isHeroVisible=false; },
      onEnterBack: ()=>{ isHeroVisible=true; }
    });

    // Nav overall progress
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self)=>{
        const p = self.progress;
        if(navProgressBar) navProgressBar.style.width = `${p*100}%`;
        if(p>0.02) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
      }
    });

    // Render loop
    let last = performance.now();
    function render(){
      const now = performance.now();
      const dt = Math.min(33, now - last)/16.666;
      last = now;

      // exponential smoothing (frame-rate independent)
      const ease = 0.085;
      smoothProgress += (targetProgress - smoothProgress) * (1 - Math.pow(1 - ease, dt));
      smoothProgress = Math.max(0, Math.min(1, smoothProgress));
      const p = smoothProgress;

      // Video time target
      const targetTime = p * videoDuration;
      // Smooth video time separately to avoid frame jumps
      const tEase = 0.20;
      currentTimeSmoothed += (targetTime - currentTimeSmoothed) * (1 - Math.pow(1 - tEase, dt));

      if(video && videoReady){
        // Only seek if readyState allows
        if(video.readyState >= 1){
          // Use fastSeek when big jump for smoother scrub (Chrome/FF)
          const diff = Math.abs(video.currentTime - currentTimeSmoothed);
          if(diff > 0.35 && 'fastSeek' in video && isHeroVisible){
            try { video.fastSeek(currentTimeSmoothed); }
            catch{ video.currentTime = currentTimeSmoothed; }
          } else if(diff > 0.002){
            // avoid micro seeks causing stutter
            video.currentTime = currentTimeSmoothed;
          }
        }
        // Ensure paused (no autoplay)
        if(!video.paused && isHeroVisible){
          // keep paused — scrub only
          // we allow pause state to remain, currentTime drives frames
          try { video.pause(); } catch {}
        }
        if(!isHeroVisible){
          // lock final frame
          try { if(Math.abs(video.currentTime - (videoDuration-0.01))>0.02) video.currentTime = videoDuration-0.01; video.pause(); } catch {}
        }
      }

      syncHero(p);
      requestAnimationFrame(render);
    }
    render();

    // Content reveals
    reveals();
  }

  function syncHero(p){
    const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const map = (p,a,b)=>clamp((p-a)/(b-a));

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
      grain: grain,
      video: video
    };
    const metaP = document.getElementById('meta-progress');
    const metaT = document.getElementById('meta-time');
    const metaTemp = document.getElementById('meta-temp');

    if(els.l1){ const m=map(p,0,0.32); gsap.set(els.l1,{ y:-m*90, scale:1-m*0.08, opacity:1-m, filter:`blur(${m*6}px)` }); }
    if(els.l2){ const m=map(p,0.12,0.50); gsap.set(els.l2,{ y:-m*110, scale:1-m*0.09, opacity:1-m, filter:`blur(${m*8}px)` }); }
    if(els.l3){ const m=map(p,0.22,0.62); gsap.set(els.l3,{ y:-m*130, x:-m*18, scale:1-m*0.06, opacity:1-m, rotation:-m*1.4, filter:`blur(${m*6}px)` }); }
    if(els.eyebrow) gsap.set(els.eyebrow,{ opacity:1-map(p,0,0.22)*1.2, y:-map(p,0,0.22)*20 });
    if(els.kicker) gsap.set(els.kicker,{ opacity:1-map(p,0.02,0.28), y:-map(p,0.02,0.28)*16 });
    if(els.copy) gsap.set(els.copy,{ opacity:1-map(p,0.35,0.68), y:-map(p,0.35,0.68)*40 });
    if(els.cta){
      const m=map(p,0.42,0.72);
      gsap.set(els.cta,{ opacity:1-m, y:-m*32, scale:1-m*0.04, filter:`blur(${m*4}px)` });
      const ref = els.cta.querySelector('.cta-reflect');
      if(ref) ref.style.transform = `translateX(${-80 + p*160}%) skewX(-18deg)`;
    }
    if(els.meta) gsap.set(els.meta,{ opacity:1-map(p,0.5,0.78), y:-map(p,0.5,0.78)*30 });
    if(els.scroll) gsap.set(els.scroll,{ opacity:1-map(p,0,0.20)*2 });

    if(els.video){
      const sc = 1.06 + p*0.12;
      const bright = 0.95 - p*0.14;
      const sat = 1.05 + p*0.14;
      const bl = p>0.92 ? (p-0.92)*16 : 0;
      gsap.set(els.video,{ scale:sc, filter:`contrast(1.05) brightness(${bright}) saturate(${sat}) blur(${bl}px)` });
    }
    if(els.grain) els.grain.style.opacity = (0.032 + p*0.06).toFixed(3);

    if(p>0.72) nav.classList.add('compressed'); else nav.classList.remove('compressed');

    if(metaP) metaP.textContent = `${(p*100).toFixed(1).padStart(4,'0')}%`;
    if(metaT) metaT.textContent = `${currentTimeSmoothed.toFixed(1).padStart(3,'0')}s / ${videoDuration.toFixed(1)}s`;
    if(metaTemp){ const t=187 + p*17; metaTemp.textContent = `187°C → ${t.toFixed(0)}°C`; }

    const wash = document.getElementById('hero-wash'); if(wash) wash.style.opacity = `${1-p}`;

    document.querySelectorAll('.drink-glass-reflect').forEach((el,i)=>{
      el.style.transform = `translateX(${-30 + p*60 + Math.sin(p*3 + i)*7}%)`;
    });
  }

  function reveals(){
    const items = gsap.utils.toArray('.content-section .eyeline, .display, .lead, .story-right p, .section-desc, .drink-card, .col-card, .rp, .machine-frame, .g-item, .journal-card, .contact-grid > *');
    items.forEach(el=>{
      gsap.fromTo(el,{ y:44, opacity:0 },{ y:0, opacity:1, duration:1.05, ease:'power3.out', scrollTrigger:{ trigger:el, start:'top 88%', once:true } });
    });
    // tilt
    document.querySelectorAll('[data-tilt]').forEach(card=>{
      card.addEventListener('mousemove', (e)=>{
        const r=card.getBoundingClientRect(); const dx=(e.clientX-(r.left+r.width/2))/r.width; const dy=(e.clientY-(r.top+r.height/2))/r.height;
        gsap.to(card,{ rotationY:dx*9, rotationX:-dy*9, transformPerspective:1000, duration:0.8, ease:'power3.out' });
      });
      card.addEventListener('mouseleave', ()=>{ gsap.to(card,{ rotationY:0, rotationX:0, duration:1, ease:'elastic.out(1,0.45)' }); });
    });
  }

  // Anchors
  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id=a.getAttribute('href'); if(id.length>1){ const t=document.querySelector(id); if(t){ e.preventDefault(); if(lenis) lenis.scrollTo(t,{offset:-56,duration:1.3}); else t.scrollIntoView({behavior:'smooth'}); } }
    });
  });

  // Init immediately — don't wait for loader
  initScroll();

  // Refresh on resize — critical for correct scrub distance
  let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=> ScrollTrigger.refresh(), 200); });

  // Debug helper for user: log current progress on scroll
  window.__emberDebug = () => ({ targetProgress, smoothProgress, currentTimeSmoothed, videoDuration, ready:videoReady, src: video?.currentSrc });

});
