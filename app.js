/* EMBER COFFEE — App.js | Loader waits for total video load */
document.addEventListener('DOMContentLoaded', () => {
  const log = (...a) => console.log('[EMBER]', ...a);

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

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    log('GSAP missing');
    setTimeout(()=>location.reload(), 1500);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Lenis — start stopped to respect loader
  let lenis = null;
  try {
    const Ctor = window.Lenis || window.lenis;
    if (Ctor) {
      lenis = new Ctor({
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
      lenis.stop(); // lock scroll until video fully loaded
      log('Lenis active, stopped for loader');
    }
  } catch (e) { log('Lenis init fail', e); }

  // Cursor light independent
  let mx = window.innerWidth/2, my = window.innerHeight/2, cx=mx, cy=my, cActive=false;
  window.addEventListener('mousemove', (e)=>{ mx=e.clientX; my=e.clientY; if(!cActive){ cActive=true; gsap.to(cursorLight,{opacity:1,duration:0.6}); } }, {passive:true});
  (function curLoop(){ cx+=(mx-cx)*0.07; cy+=(my-cy)*0.07; if(cursorLight) cursorLight.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`; if(pageLight){ const px=(cx/window.innerWidth-0.5)*36; const py=(cy/window.innerHeight-0.5)*28; pageLight.style.transform=`translate3d(${px}px,${py}px,0)`; } requestAnimationFrame(curLoop); })();

  // Mobile menu
  if (menuToggle){
    menuToggle.addEventListener('click', ()=>{
      const open = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !open);
      if(lenis){ if(!open) lenis.stop(); else { if(loaderDone) lenis.start(); } }
      gsap.to(menuToggle.children,{rotate:i=>open?0:(i===0?45:-45), y:i=>open?0:(i===0?3:-3), duration:0.45, ease:'power3.inOut'});
    });
    mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click', ()=>{ mobileMenu.classList.remove('open'); if(lenis && loaderDone) lenis.start(); gsap.to(menuToggle.children,{rotate:0,y:0,duration:0.35}); }));
  }

  // ===== LOADER: MUST WAIT UNTIL VIDEO TOTALLY LOADED =====
  let loaderDone = false;
  let videoDuration = 10;
  let videoFullyLoaded = false;
  let triedFallback = false;
  const FALLBACK_SRC = 'https://videos.pexels.com/video-files/29068399/12556689_1920_1080_30fps.mp4';

  function setLoader(pct, msg){
    const clamped = Math.max(0, Math.min(1, pct));
    if(loaderBar) loaderBar.style.width = `${clamped*100}%`;
    if(loaderPct) loaderPct.textContent = `${String(Math.floor(clamped*100)).padStart(2,'0')}%`;
    if(msg && loaderMsg) loaderMsg.textContent = msg;
  }

  function hideLoader(){
    if(loaderDone) return;
    if(!videoFullyLoaded){
      log('hideLoader called but video not fully loaded — ignoring');
      return;
    }
    loaderDone = true;
    setLoader(1, 'READY');
    log('Hiding loader — video totally loaded');
    gsap.to(loader, { opacity:0, duration:0.85, ease:'power3.inOut', onComplete:()=>{ loader.classList.add('hidden'); ScrollTrigger.refresh(); }});
    gsap.fromTo('#hero-stage .hero-content', {opacity:0}, {opacity:1, duration:1, ease:'power2.out', delay:0.15});
    if(lenis) lenis.start();
    if(video){ try{ video.pause(); video.currentTime = 0.001; }catch{} }
  }

  // Check if buffered enough
  function checkBuffered(){
    if(!video || videoFullyLoaded) return;
    try{
      let pct = 0;
      if(video.buffered && video.buffered.length){
        const dur = video.duration || videoDuration;
        const end = video.buffered.end(video.buffered.length-1);
        pct = dur ? end / dur : 0;
      } else {
        // fallback to readyState progress estimation
        if(video.readyState >= 4) pct = 1;
        else if(video.readyState >= 3) pct = 0.9;
        else pct = 0;
      }
      // never go backwards visually
      const curWidth = loaderBar ? parseFloat(loaderBar.style.width)||0 : 0;
      const visualPct = Math.max(pct, curWidth/100);
      if(!loaderDone){
        if(video.readyState < 2) setLoader(Math.max(0.05, visualPct*0.6), `LOADING HERO • ${Math.floor(visualPct*100)}%`);
        else if(video.readyState < 4) setLoader(Math.max(0.25, visualPct*0.9), `DECODING • ${Math.floor(visualPct*100)}%`);
        else setLoader(visualPct, `BUFFERING • ${Math.floor(visualPct*100)}%`);
      }

      // Totally loaded condition: buffered >= 99.5% AND readyState 4
      if(video.readyState >= 4){
        const dur = video.duration || videoDuration;
        const bufferedEnd = video.buffered.length ? video.buffered.end(video.buffered.length-1) : dur;
        const bufferedPct = dur ? bufferedEnd/dur : 0;
        if(bufferedPct >= 0.995 || video.buffered.length===0){
          videoFullyLoaded = true;
          if(video.duration && !isNaN(video.duration)) videoDuration = video.duration;
          video.classList.add('is-ready');
          if(videoFallback) videoFallback.classList.add('is-hidden');
          log('Video totally loaded', videoDuration, 'buffered', bufferedPct);
          setLoader(1, `READY • ${videoDuration.toFixed(1)}s`);
          setTimeout(hideLoader, 380); // tiny delay for visual 100%
        }
      }
    }catch(e){ log('checkBuffered err', e); }
  }

  let bufferInterval = null;

  if(video){
    video.autoplay = false;
    video.loop = false;
    video.muted = true;
    video.setAttribute('playsinline','');
    video.preload = 'auto';
    video.pause();
    setLoader(0.02, 'INITIALIZING');

    video.addEventListener('loadstart', ()=>{ setLoader(0.05,'LOAD START'); log('loadstart', video.currentSrc); });
    video.addEventListener('loadedmetadata', ()=>{
      if(video.duration && !isNaN(video.duration)) videoDuration = video.duration;
      setLoader(0.18,'METADATA • '+videoDuration.toFixed(1)+'s');
      log('metadata', videoDuration);
      try{ video.currentTime = 0.001; }catch{}
    });
    video.addEventListener('progress', checkBuffered);
    video.addEventListener('canplay', ()=>{ setLoader(0.75,'CAN PLAY'); checkBuffered(); });
    video.addEventListener('canplaythrough', ()=>{
      setLoader(0.96,'CAN PLAY THROUGH');
      log('canplaythrough');
      // do NOT hide yet — wait for 100% buffered check
      checkBuffered();
    });
    video.addEventListener('waiting', ()=>{ if(loaderMsg) loaderMsg.textContent='BUFFERING…'; });
    video.addEventListener('playing', ()=>{ try{ video.pause(); }catch{} });

    video.addEventListener('error', ()=>{
      log('video error', video.error, 'src', video.currentSrc);
      if(!triedFallback){
        triedFallback = true;
        setLoader(0.12,'LOCAL FAILED — TRYING PREVIEW');
        // Switch to remote preview but still must totally load
        video.src = FALLBACK_SRC;
        video.load();
        videoFullyLoaded = false;
      } else {
        // both failed — cannot ever be "totally loaded", show fallback gradient and force hide after message
        log('Both sources failed');
        setLoader(1,'GRADIENT FALLBACK — NO VIDEO FILE');
        videoFullyLoaded = true; // allow loader to hide in fallback mode
        setTimeout(hideLoader, 600);
      }
    });

    // Start loading
    video.load();

    // Poll buffered every 120ms — guarantees progress even if progress event sparse
    bufferInterval = setInterval(checkBuffered, 120);

    // Safety: if for some reason video never fires events (cache?), check after 500ms
    setTimeout(checkBuffered, 500);

  } else {
    // No video element — shouldn't happen, but hide loader with gradient
    log('No video element');
    videoDuration = 10;
    videoFullyLoaded = true;
    setTimeout(hideLoader, 400);
  }

  // ===== SCROLL SCRUB =====
  let targetProgress = 0;
  let smoothProgress = 0;
  let currentTimeSmoothed = 0;
  let heroVisible = true;

  function initScroll(){
    ScrollTrigger.create({
      trigger: heroTrack,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self)=>{
        targetProgress = self.progress;
        heroVisible = self.progress < 0.999 && self.progress >=0;
      },
      onLeave: ()=>{ heroVisible=false; },
      onEnterBack: ()=>{ heroVisible=true; }
    });

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self)=>{
        const p=self.progress;
        if(navProgressBar) navProgressBar.style.width=`${p*100}%`;
        if(p>0.02) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
      }
    });

    let last = performance.now();
    function render(){
      const now = performance.now();
      const dt = Math.min(33, now-last)/16.666;
      last = now;
      const ease = 0.085;
      smoothProgress += (targetProgress - smoothProgress) * (1 - Math.pow(1 - ease, dt));
      smoothProgress = Math.max(0, Math.min(1, smoothProgress));
      const p = smoothProgress;

      const targetTime = p * videoDuration;
      const tEase = 0.20;
      currentTimeSmoothed += (targetTime - currentTimeSmoothed) * (1 - Math.pow(1 - tEase, dt));

      if(video && videoFullyLoaded){
        if(video.readyState >=1){
          const diff = Math.abs(video.currentTime - currentTimeSmoothed);
          if(diff > 0.35 && 'fastSeek' in video && heroVisible){
            try{ video.fastSeek(currentTimeSmoothed); }catch{ video.currentTime = currentTimeSmoothed; }
          }else if(diff>0.002){
            video.currentTime = currentTimeSmoothed;
          }
        }
        if(!video.paused) try{ video.pause(); }catch{}
        if(!heroVisible){
          try{ if(Math.abs(video.currentTime-(videoDuration-0.01))>0.02) video.currentTime=videoDuration-0.01; }catch{}
        }
      }

      syncHero(p);
      requestAnimationFrame(render);
    }
    render();
    reveals();
  }

  function syncHero(p){
    const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const map = (a,b)=>clamp((p-a)/(b-a));
    const get = id=>document.getElementById(id);

    const l1=get('h-l1'), l2=get('h-l2'), l3=get('h-l3');
    const eyebrow=get('h-eyebrow'), kicker=get('h-kicker'), copy=get('h-copy'), cta=get('h-cta'), meta=get('h-meta'), scroll=get('h-scroll');

    if(l1){ const m=map(0,0.32); gsap.set(l1,{ y:-m*90, scale:1-m*0.08, opacity:1-m, filter:`blur(${m*6}px)` }); }
    if(l2){ const m=map(0.12,0.50); gsap.set(l2,{ y:-m*110, scale:1-m*0.09, opacity:1-m, filter:`blur(${m*8}px)` }); }
    if(l3){ const m=map(0.22,0.62); gsap.set(l3,{ y:-m*130, x:-m*18, scale:1-m*0.06, opacity:1-m, rotation:-m*1.4, filter:`blur(${m*6}px)` }); }
    if(eyebrow) gsap.set(eyebrow,{ opacity:1-map(0,0.22)*1.2, y:-map(0,0.22)*20 });
    if(kicker) gsap.set(kicker,{ opacity:1-map(0.02,0.28), y:-map(0.02,0.28)*16 });
    if(copy) gsap.set(copy,{ opacity:1-map(0.35,0.68), y:-map(0.35,0.68)*40 });
    if(cta){
      const m=map(0.42,0.72);
      gsap.set(cta,{ opacity:1-m, y:-m*32, scale:1-m*0.04, filter:`blur(${m*4}px)` });
      const ref=cta.querySelector('.cta-reflect'); if(ref) ref.style.transform=`translateX(${-80+p*160}%) skewX(-18deg)`;
    }
    if(meta) gsap.set(meta,{ opacity:1-map(0.5,0.78), y:-map(0.5,0.78)*30 });
    if(scroll) gsap.set(scroll,{ opacity:1-map(0,0.20)*2 });

    if(video){
      const sc=1.06+p*0.12, bright=0.95-p*0.14, sat=1.05+p*0.14, bl=p>0.92?(p-0.92)*16:0;
      gsap.set(video,{ scale:sc, filter:`contrast(1.05) brightness(${bright}) saturate(${sat}) blur(${bl}px)` });
    }
    if(grain) grain.style.opacity=(0.032+p*0.06).toFixed(3);
    if(p>0.72) nav.classList.add('compressed'); else nav.classList.remove('compressed');

    const metaP=get('meta-progress'), metaT=get('meta-time'), metaTemp=get('meta-temp');
    if(metaP) metaP.textContent=`${(p*100).toFixed(1).padStart(4,'0')}%`;
    if(metaT) metaT.textContent=`${currentTimeSmoothed.toFixed(1).padStart(3,'0')}s / ${videoDuration.toFixed(1)}s`;
    if(metaTemp){ const t=187+p*17; metaTemp.textContent=`187°C → ${t.toFixed(0)}°C`; }

    const wash=document.getElementById('hero-wash'); if(wash) wash.style.opacity=`${1-p}`;
    document.querySelectorAll('.drink-glass-reflect').forEach((el,i)=>{ el.style.transform=`translateX(${-30+p*60+Math.sin(p*3+i)*7}%)`; });
  }

  function reveals(){
    const items=gsap.utils.toArray('.content-section .eyeline, .display, .lead, .story-right p, .section-desc, .drink-card, .col-card, .rp, .machine-frame, .g-item, .journal-card, .contact-grid > *');
    items.forEach(el=>{ gsap.fromTo(el,{y:44,opacity:0},{y:0,opacity:1,duration:1.05,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}); });
    document.querySelectorAll('[data-tilt]').forEach(card=>{
      card.addEventListener('mousemove',(e)=>{ const r=card.getBoundingClientRect(); const dx=(e.clientX-(r.left+r.width/2))/r.width; const dy=(e.clientY-(r.top+r.height/2))/r.height; gsap.to(card,{rotationY:dx*9,rotationX:-dy*9,transformPerspective:1000,duration:0.8,ease:'power3.out'}); });
      card.addEventListener('mouseleave',()=>{ gsap.to(card,{rotationY:0,rotationX:0,duration:1,ease:'elastic.out(1,0.45)'}); });
    });
  }

  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    a.addEventListener('click',(e)=>{ const id=a.getAttribute('href'); if(id.length>1){ const t=document.querySelector(id); if(t){ e.preventDefault(); if(lenis && loaderDone) lenis.scrollTo(t,{offset:-56,duration:1.3}); else t.scrollIntoView({behavior:'smooth'}); } } });
  });

  initScroll();
  let rt; window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(()=>ScrollTrigger.refresh(),200); });

  window.__emberDebug = () => ({ targetProgress, smoothProgress, currentTimeSmoothed, videoDuration, fullyLoaded:videoFullyLoaded, loaderDone, readyState:video?.readyState, buffered: video?.buffered?.length? video.buffered.end(video.buffered.length-1):0, src:video?.currentSrc });
});
