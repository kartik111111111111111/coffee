/* EMBER COFFEE — Fixed video + blob preload = totally loaded before play, scrub within next section */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const log = (...a) => console.log('[EMBER]', ...a);

  const loader = $('#loader');
  const loaderBar = $('#loader-bar');
  const loaderPct = $('#loader-pct');
  const loaderMsg = $('#loader-msg');
  const video = $('#hero-video');
  const videoFallback = $('#video-fallback');
  const nav = $('#nav');
  const navProgressBar = $('#nav-progress-bar');
  const heroTrack = $('#hero-track');
  const heroStage = $('#hero-stage');
  const grain = $('#grain');
  const cursorLight = $('#cursor-light');
  const pageLight = $('#page-light');
  const menuToggle = $('#menu-toggle');
  const mobileMenu = $('#mobile-menu');

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    log('GSAP missing');
    setTimeout(()=>location.reload(), 1200);
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Lenis — start stopped until video totally loaded
  let lenis = null;
  try {
    const Ctor = window.Lenis;
    if (Ctor) {
      lenis = new Ctor({
        duration: 1.12,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
        touchMultiplier: 1.5,
        orientation: 'vertical',
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t*1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
  } catch (e) { log('Lenis fail', e); }

  // cursor light independent
  let mx = innerWidth/2, my = innerHeight/2, cx=mx, cy=my, cActive=false;
  addEventListener('mousemove', (e)=>{ mx=e.clientX; my=e.clientY; if(!cActive){ cActive=true; gsap.to(cursorLight,{opacity:1,duration:0.5}); } }, {passive:true});
  (function curLoop(){ cx+=(mx-cx)*0.08; cy+=(my-cy)*0.08; if(cursorLight) cursorLight.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`; if(pageLight){ const px=(cx/innerWidth-0.5)*28; const py=(cy/innerHeight-0.5)*22; pageLight.style.transform=`translate3d(${px}px,${py}px,0)`; } requestAnimationFrame(curLoop); })();

  // menu
  if (menuToggle) {
    menuToggle.addEventListener('click', ()=>{
      const open = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !open);
      if (lenis) { if(!open) lenis.stop(); else if(loaderDone) lenis.start(); }
      gsap.to(menuToggle.children,{rotate:i=>open?0:(i===0?45:-45), y:i=>open?0:(i===0?3:-3), duration:0.4, ease:'power3.inOut'});
    });
    mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{ mobileMenu.classList.remove('open'); if(lenis && loaderDone) lenis.start(); }));
  }

  // ===== LOADER: BLOB PRELOAD = TOTALLY LOADED =====
  let loaderDone = false;
  let videoDuration = 10; // fallback
  let videoBlobUrl = null;
  let fullyLoaded = false;

  function setLoader(pct, msg){
    const c = Math.max(0, Math.min(1, pct));
    if(loaderBar) loaderBar.style.width = `${c*100}%`;
    if(loaderPct) loaderPct.textContent = `${String(Math.floor(c*100)).padStart(2,'0')}%`;
    if(msg && loaderMsg) loaderMsg.textContent = msg;
  }
  function hideLoader(){
    if(loaderDone || !fullyLoaded) return;
    loaderDone = true;
    setLoader(1, 'READY');
    gsap.to(loader,{opacity:0, duration:0.7, ease:'power3.inOut', onComplete:()=>{ loader.classList.add('hidden'); ScrollTrigger.refresh(); }});
    gsap.fromTo('#hero-stage .hero-content',{opacity:0},{opacity:1,duration:0.9,ease:'power2.out',delay:0.12});
    if(lenis) lenis.start();
    // ensure first frame
    if(video){ try{ video.pause(); if(video.readyState>=1) video.currentTime=0.001; }catch{} }
    log('Loader hidden, video totally loaded, blob url:', videoBlobUrl ? 'yes' : 'no');
  }

  async function preloadVideoBlob(){
    const localSrc = './coffeebackground.mp4';
    const fallbackSrc = 'https://videos.pexels.com/video-files/29068399/12556689_1920_1080_30fps.mp4';
    let srcToTry = localSrc;

    async function fetchWithProgress(url){
      log('Fetching', url);
      setLoader(0.03, 'FETCHING HERO');
      const res = await fetch(url, {cache:'force-cache'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentLength = parseInt(res.headers.get('Content-Length')||'0',10);
      const reader = res.body.getReader();
      let received = 0;
      const chunks = [];
      while(true){
        const {done, value} = await reader.read();
        if(done) break;
        chunks.push(value);
        received += value.length;
        if(contentLength){
          const pct = received / contentLength;
          // map fetch 0-1 to loader 0.08-0.92
          setLoader(0.08 + pct*0.84, `DOWNLOADING • ${Math.floor(pct*100)}% • ${(received/1024/1024).toFixed(2)}MB`);
        } else {
          setLoader(Math.min(0.92, 0.08 + received/ (3*1024*1024)), `DOWNLOADING • ${(received/1024/1024).toFixed(2)}MB`);
        }
      }
      const blob = new Blob(chunks, {type: res.headers.get('Content-Type')||'video/mp4'});
      return blob;
    }

    try{
      let blob;
      try{
        blob = await fetchWithProgress(srcToTry);
      }catch(e){
        log('Local fetch failed', e.message, 'trying fallback remote');
        setLoader(0.12, 'LOCAL NOT CACHED — REMOTE PREVIEW');
        srcToTry = fallbackSrc;
        blob = await fetchWithProgress(srcToTry);
      }

      setLoader(0.93, 'DECODING');
      videoBlobUrl = URL.createObjectURL(blob);
      video.src = videoBlobUrl;
      video.load();
      // wait for metadata + canplaythrough
      await new Promise((resolve, reject)=>{
        let resolved = false;
        const onMeta = ()=>{
          if(video.duration && !isNaN(video.duration)) videoDuration = video.duration;
          log('blob metadata', videoDuration);
          try{ video.currentTime = 0.001; }catch{}
        };
        const onCanPlayThrough = ()=>{
          if(resolved) return;
          resolved = true;
          cleanup();
          resolve();
        };
        const onError = (ev)=>{
          cleanup();
          reject(ev);
        };
        const cleanup = ()=>{
          video.removeEventListener('loadedmetadata', onMeta);
          video.removeEventListener('canplaythrough', onCanPlayThrough);
          video.removeEventListener('error', onError);
        };
        video.addEventListener('loadedmetadata', onMeta);
        video.addEventListener('canplaythrough', onCanPlayThrough, {once:true});
        video.addEventListener('error', onError, {once:true});
        // safety timeout for canplaythrough — if not firing, use canplay
        setTimeout(()=>{
          if(!resolved && video.readyState>=3){
            log('canplaythrough timeout, using readyState', video.readyState);
            resolved = true;
            cleanup();
            resolve();
          }
        }, 2500);
      });

      video.classList.add('is-ready');
      if(videoFallback) videoFallback.classList.add('is-hidden');
      fullyLoaded = true;
      setLoader(0.99, 'PREPARED');
      setTimeout(hideLoader, 320);

    }catch(err){
      log('Blob preload failed', err);
      // fallback to letting video element load normally (still better than broken)
      setLoader(0.88, 'FALLBACK DIRECT LOAD');
      try{
        video.src = srcToTry;
        video.load();
        video.addEventListener('canplaythrough', ()=>{
          fullyLoaded = true;
          video.classList.add('is-ready');
          if(videoFallback) videoFallback.classList.add('is-hidden');
          setLoader(1,'READY (DIRECT)');
          setTimeout(hideLoader, 350);
        }, {once:true});
      }catch{
        // ultimate gradient fallback
        setLoader(1,'GRADIENT FALLBACK');
        fullyLoaded = true;
        setTimeout(hideLoader, 400);
      }
    }
  }

  // start blob preload
  preloadVideoBlob();

  // ===== SCROLL SCRUB =====
  // Make video fixed, so it plays "within next section" as final frame lingering
  // Hero track is 280vh scroll driver
  let targetP = 0;
  let smoothP = 0;
  let vidTime = 0;
  let heroVisible = true;

  function initScrub(){
    // driver
    ScrollTrigger.create({
      trigger: heroTrack,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false,
      onUpdate: (self)=>{
        targetP = self.progress; // 0..1 across 280vh
        heroVisible = self.progress < 0.999;
      }
    });

    // overall nav progress
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self)=>{
        if(navProgressBar) navProgressBar.style.width = `${self.progress*100}%`;
        if(self.progress>0.02) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
      }
    });

    // Fade video into next section — keep final frame visible for 40vh into Story
    ScrollTrigger.create({
      trigger: '#story',
      start: 'top 90%',
      end: 'top 10%',
      scrub: true,
      onUpdate: (self)=>{
        // as story enters, keep video at 100% time but reduce brightness/opacity slightly
        const p = self.progress; // 0 when story bottom enters, 1 when top hits
        if(video){
          const opacity = 1 - p*0.65; // linger final frame within next section
          video.style.opacity = `${opacity}`;
          if(videoFallback) videoFallback.style.opacity = `${opacity*0.4}`;
        }
        // tint wash
        const wash = document.getElementById('hero-wash');
        if(wash) wash.style.opacity = `${0.6 - p*0.6}`;
      }
    });

    // render loop — direct mapping for ultra responsive scrub (no double lag)
    let last = performance.now();
    function frame(){
      const now = performance.now();
      const dt = Math.min(33, now-last)/16.666;
      last = now;

      // ease only a little for smoothness, but very responsive (0.22)
      const ease = 0.22;
      smoothP += (targetP - smoothP) * (1 - Math.pow(1 - ease, dt));
      smoothP = Math.max(0, Math.min(1, smoothP));

      // direct video time — no second smoothing layer, so it feels 1:1 with scroll and reversible instantly
      vidTime = smoothP * videoDuration;

      if(video && fullyLoaded && video.readyState>=1){
        const diff = Math.abs(video.currentTime - vidTime);
        if(diff > 0.001){
          // direct assignment for perfect Apple-like scrub; fastSeek for large jumps
          if(diff>0.4 && 'fastSeek' in video){
            try{ video.fastSeek(vidTime); }catch{ video.currentTime = vidTime; }
          } else {
            video.currentTime = vidTime;
          }
        }
        if(!video.paused){ try{ video.pause(); }catch{} }
      }

      syncUI(smoothP);
      requestAnimationFrame(frame);
    }
    frame();
    reveals();
  }

  function syncUI(p){
    const clamp = (v,a=0,b=1)=>Math.max(a,Math.min(b,v));
    const map = (a,b)=>clamp((p-a)/(b-a));
    const get = id=>document.getElementById(id);

    const l1=get('h-l1'), l2=get('h-l2'), l3=get('h-l3');
    if(l1){ const m=map(0,0.30); gsap.set(l1,{ y:-m*80, scale:1-m*0.07, opacity:1-m, filter:`blur(${m*5}px)` }); }
    if(l2){ const m=map(0.10,0.48); gsap.set(l2,{ y:-m*100, scale:1-m*0.08, opacity:1-m, filter:`blur(${m*7}px)` }); }
    if(l3){ const m=map(0.20,0.60); gsap.set(l3,{ y:-m*120, x:-m*16, scale:1-m*0.05, opacity:1-m, rotation:-m*1.2, filter:`blur(${m*5}px)` }); }

    const eyeb=get('h-eyebrow'), kick=get('h-kicker'), copy=get('h-copy'), cta=get('h-cta'), meta=get('h-meta'), scr=get('h-scroll');
    if(eyeb) gsap.set(eyeb,{ opacity:1-map(0,0.20)*1.2, y:-map(0,0.20)*18 });
    if(kick) gsap.set(kick,{ opacity:1-map(0.02,0.26), y:-map(0.02,0.26)*14 });
    if(copy) gsap.set(copy,{ opacity:1-map(0.33,0.66), y:-map(0.33,0.66)*36 });
    if(cta){
      const m=map(0.40,0.70);
      gsap.set(cta,{ opacity:1-m, y:-m*28, scale:1-m*0.04, filter:`blur(${m*3}px)` });
      const r=cta.querySelector('.cta-reflect'); if(r) r.style.transform=`translateX(${-80+p*160}%) skewX(-18deg)`;
    }
    if(meta) gsap.set(meta,{ opacity:1-map(0.48,0.76), y:-map(0.48,0.76)*26 });
    if(scr) gsap.set(scr,{ opacity:1-map(0,0.18)*2 });

    // video scale/brightness evolves with timeline
    if(video){
      const sc=1.06+p*0.10, br=0.96-p*0.12, sat=1.05+p*0.12;
      // only apply if not being faded by story trigger (story trigger controls opacity)
      const currentOp = parseFloat(video.style.opacity)||1;
      if(currentOp>0.3){
        gsap.set(video,{ scale:sc, filter:`contrast(1.05) brightness(${br}) saturate(${sat})` });
      }
    }
    if(grain) grain.style.opacity=(0.032+p*0.055).toFixed(3);
    if(p>0.70) nav.classList.add('compressed'); else nav.classList.remove('compressed');

    const metaP=get('meta-progress'), metaT=get('meta-time'), metaTmp=get('meta-temp');
    if(metaP) metaP.textContent=`${(p*100).toFixed(1).padStart(4,'0')}%`;
    if(metaT) metaT.textContent=`${vidTime.toFixed(1).padStart(3,'0')}s / ${videoDuration.toFixed(1)}s`;
    if(metaTmp){ const t=187+p*17; metaTmp.textContent=`187°C → ${t.toFixed(0)}°C`; }

    document.querySelectorAll('.drink-glass-reflect').forEach((el,i)=>{ el.style.transform=`translateX(${-30+p*60+Math.sin(p*3+i)*6}%)`; });
  }

  function reveals(){
    gsap.utils.toArray('.content-section .eyeline, .display, .lead, .story-right p, .section-desc, .drink-card, .col-card, .rp, .machine-frame, .g-item, .journal-card, .contact-grid > *')
      .forEach(el=>{ gsap.fromTo(el,{y:40,opacity:0},{y:0,opacity:1,duration:0.95,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}); });
    document.querySelectorAll('[data-tilt]').forEach(card=>{
      card.addEventListener('mousemove',(e)=>{ const r=card.getBoundingClientRect(); const dx=(e.clientX-(r.left+r.width/2))/r.width; const dy=(e.clientY-(r.top+r.height/2))/r.height; gsap.to(card,{rotationY:dx*8,rotationX:-dy*8,transformPerspective:1000,duration:0.7,ease:'power3.out'}); });
      card.addEventListener('mouseleave',()=>{ gsap.to(card,{rotationY:0,rotationX:0,duration:0.9,ease:'elastic.out(1,0.45)'}); });
    });
  }

  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    a.addEventListener('click',(e)=>{ const id=a.getAttribute('href'); if(id.length>1){ const t=document.querySelector(id); if(t){ e.preventDefault(); if(lenis) lenis.scrollTo(t,{offset:-56,duration:1.2}); else t.scrollIntoView({behavior:'smooth'}); } } });
  });

  initScrub();
  addEventListener('resize',()=>{ clearTimeout(window._rt); window._rt=setTimeout(()=>ScrollTrigger.refresh(),180); });

  window.__emberDebug = ()=>({ target:targetP, smooth:smoothP, vidTime, dur:videoDuration, loaded:fullyLoaded, done:loaderDone, rs:video?.readyState, src:video?.currentSrc?.slice(-70) });
});
