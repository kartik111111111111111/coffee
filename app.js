/* EMBER — final: loader shows % + random text only, waits for total load, fixed-video scrub */
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

  if (!window.gsap || !window.ScrollTrigger) {
    location.reload();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Lenis
  let lenis = null;
  try {
    if (window.Lenis) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.4,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t*1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
  } catch {}

  // cursor light
  const cursorLight = $('#cursor-light');
  const pageLight = $('#page-light');
  let mx = innerWidth/2, my = innerHeight/2, cx=mx, cy=my, cOn=false;
  addEventListener('mousemove', (e)=>{ mx=e.clientX; my=e.clientY; if(!cOn){ cOn=true; gsap.to(cursorLight,{opacity:1,duration:0.5}); } }, {passive:true});
  (function lp(){ cx+=(mx-cx)*0.08; cy+=(my-cy)*0.08; if(cursorLight) cursorLight.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`; if(pageLight){ pageLight.style.transform=`translate3d(${(cx/innerWidth-0.5)*26}px,${(cy/innerHeight-0.5)*18}px,0)`; } requestAnimationFrame(lp); })();

  // menu
  const menuToggle = $('#menu-toggle');
  const mobileMenu = $('#mobile-menu');
  if (menuToggle) {
    menuToggle.addEventListener('click', ()=>{
      const open = mobileMenu.classList.contains('open');
      mobileMenu.classList.toggle('open', !open);
      if (lenis) { if(!open) lenis.stop(); else if(loaderDone) lenis.start(); }
    });
    mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{ mobileMenu.classList.remove('open'); if(lenis && loaderDone) lenis.start(); }));
  }

  // Loader texts — only % + random editorial, no technical words
  const randomLines = [
    'Wood stacked at dawn',
    'Listening for first crack',
    'Ember, not flame',
    '6kg small batch',
    '22 minutes, one vinyl side',
    '72 hours rest',
    'Tracing back to a tree',
    'Chikmagalur morning',
    'Remembered forever',
    'Jackfruit smoke',
    'Pune, FC Road, lane 4',
    'Twelve seats, no laptops'
  ];
  let phraseIdx = 0;
  function randomPhrase(){ phraseIdx = (phraseIdx + 1) % randomLines.length; return randomLines[phraseIdx]; }

  let loaderDone = false;
  let fullyLoaded = false;
  let videoDuration = 10;

  function setLoader(pct){
    const c = Math.max(0, Math.min(1, pct));
    if(loaderBar) loaderBar.style.width = `${c*100}%`;
    if(loaderPct) loaderPct.textContent = `${String(Math.floor(c*100)).padStart(2,'0')}%`;
  }

  function hideLoader(){
    if(loaderDone || !fullyLoaded) return;
    loaderDone = true;
    setLoader(1);
    if(loaderMsg) loaderMsg.textContent = randomLines[8];
    gsap.to(loader, {opacity:0, duration:0.7, ease:'power3.inOut', onComplete:()=>{ loader.classList.add('hidden'); ScrollTrigger.refresh(); }});
    gsap.fromTo('#hero-stage .hero-content',{opacity:0},{opacity:1, duration:0.8, delay:0.1});
    if(lenis) lenis.start();
    if(video){ try{ video.pause(); video.currentTime = 0.001; }catch{} }
  }

  // rotate random text every 420ms until loaded
  let phraseInt = setInterval(()=>{
    if(!loaderDone && loaderMsg) loaderMsg.textContent = randomPhrase();
  }, 420);
  if(loaderMsg) loaderMsg.textContent = randomLines[0];

  // VIDEO — wait for totally loaded (buffered 100%)
  if(video){
    video.autoplay = false;
    video.loop = false;
    video.muted = true;
    video.setAttribute('playsinline','');
    video.preload = 'auto';
    setLoader(0.02);

    video.addEventListener('loadedmetadata', ()=>{
      if(video.duration && !isNaN(video.duration)) videoDuration = video.duration;
      log('metadata', videoDuration);
    });

    const check = ()=>{
      if(fullyLoaded) return;
      try{
        let pct = 0;
        if(video.buffered && video.buffered.length){
          const end = video.buffered.end(video.buffered.length-1);
          const dur = video.duration || videoDuration || 10;
          pct = dur ? end/dur : 0;
        } else {
          // if no buffered info, use readyState as proxy
          if(video.readyState>=4) pct = 1;
          else if(video.readyState>=3) pct = 0.85;
        }
        // avoid going backwards
        const cur = parseFloat(loaderBar?.style.width)||0;
        const vis = Math.max(pct, cur/100);
        setLoader(Math.min(0.99, vis));

        // totally loaded when buffered >= 99% and readyState 4
        if(video.readyState >= 4){
          const dur = video.duration || videoDuration;
          const buffered = video.buffered.length ? video.buffered.end(video.buffered.length-1) : dur;
          const bp = dur ? buffered/dur : 0;
          if(bp >= 0.99 || (video.buffered.length===0 && video.readyState>=4)){
            if(video.duration) videoDuration = video.duration;
            fullyLoaded = true;
            video.classList.add('is-ready');
            if(videoFallback) videoFallback.classList.add('is-hidden');
            clearInterval(phraseInt);
            setLoader(1);
            log('totally loaded', videoDuration, bp);
            setTimeout(hideLoader, 300);
          }
        }
      }catch(e){ log('check err', e); }
    };

    video.addEventListener('progress', check);
    video.addEventListener('canplay', check);
    video.addEventListener('canplaythrough', ()=>{
      // canplaythrough is close to totally loaded, do final check
      setLoader(0.92);
      check();
      // if browser never buffers 100% till play, force after short delay if readyState 4
      setTimeout(()=>{ if(video.readyState>=4){ fullyLoaded=true; video.classList.add('is-ready'); if(videoFallback) videoFallback.classList.add('is-hidden'); setLoader(1); hideLoader(); } }, 600);
    });
    video.addEventListener('error', ()=>{
      log('video error, trying fallback');
      // fallback remote — still show only % + random text
      const fallback = 'https://videos.pexels.com/video-files/29068399/12556689_1920_1080_30fps.mp4';
      if(video.src !== fallback){
        video.src = fallback;
        video.load();
      } else {
        // even fallback failed, allow entry with gradient
        fullyLoaded = true;
        setLoader(1);
        hideLoader();
      }
    });

    video.load();
    // poll
    setInterval(check, 180);
  } else {
    fullyLoaded = true;
    hideLoader();
  }

  // ===== SCROLL SCRUB — FIXED VIDEO, USABLE =====
  let targetP = 0, smoothP = 0, vTime = 0;

  function initScrub(){
    ScrollTrigger.create({
      trigger: heroTrack,
      start: 'top top',
      end: 'bottom top', // full 280vh driver
      onUpdate: (s)=>{ targetP = s.progress; }
    });

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (s)=>{
        if(navProgressBar) navProgressBar.style.width = `${s.progress*100}%`;
        if(s.progress>0.02) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
      }
    });

    // fade final frame into next section
    ScrollTrigger.create({
      trigger: '#story',
      start: 'top 92%',
      end: 'top 15%',
      scrub: true,
      onUpdate: (s)=>{
        if(video){
          const op = 1 - s.progress*0.7;
          video.style.opacity = op;
          if(videoFallback) videoFallback.style.opacity = op*0.35;
        }
      }
    });

    let last = performance.now();
    function tick(){
      const now = performance.now();
      const dt = Math.min(33, now-last)/16.666;
      last = now;
      smoothP += (targetP - smoothP) * (1 - Math.pow(1 - 0.20, dt)); // responsive, not laggy
      smoothP = Math.max(0, Math.min(1, smoothP));
      vTime = smoothP * videoDuration;

      if(video && fullyLoaded && video.readyState>=1){
        if(Math.abs(video.currentTime - vTime) > 0.002){
          // direct 1:1 scrub, seamless reverse
          video.currentTime = vTime;
        }
        if(!video.paused){ try{ video.pause(); }catch{} }
      }

      // UI sync
      const map = (a,b)=> Math.max(0, Math.min(1, (smoothP-a)/(b-a)));
      const g = (id)=>document.getElementById(id);
      const l1=g('h-l1'), l2=g('h-l2'), l3=g('h-l3');
      if(l1){ const m=map(0,0.32); gsap.set(l1,{y:-m*80,scale:1-m*0.07,opacity:1-m,filter:`blur(${m*5}px)`}); }
      if(l2){ const m=map(0.12,0.50); gsap.set(l2,{y:-m*100,scale:1-m*0.08,opacity:1-m,filter:`blur(${m*7}px)`}); }
      if(l3){ const m=map(0.22,0.62); gsap.set(l3,{y:-m*120,x:-m*16,scale:1-m*0.06,opacity:1-m,filter:`blur(${m*5}px)`}); }
      const ey=g('h-eyebrow'), ki=g('h-kicker'), cp=g('h-copy'), ca=g('h-cta'), me=g('h-meta'), sc=g('h-scroll');
      if(ey) gsap.set(ey,{opacity:1-map(0,0.22)*1.2,y:-map(0,0.22)*18});
      if(ki) gsap.set(ki,{opacity:1-map(0.02,0.28),y:-map(0.02,0.28)*14});
      if(cp) gsap.set(cp,{opacity:1-map(0.35,0.68),y:-map(0.35,0.68)*36});
      if(ca){ const m=map(0.42,0.70); gsap.set(ca,{opacity:1-m,y:-m*28,filter:`blur(${m*3}px)`}); const r=ca.querySelector('.cta-reflect'); if(r) r.style.transform=`translateX(${-80+smoothP*160}%) skewX(-18deg)`; }
      if(me) gsap.set(me,{opacity:1-map(0.5,0.78),y:-map(0.5,0.78)*26});
      if(sc) gsap.set(sc,{opacity:1-map(0,0.18)*2});
      if(video){ gsap.set(video,{scale:1.06+smoothP*0.10}); }
      const grainEl = document.getElementById('grain'); if(grainEl) grainEl.style.opacity=(0.032+smoothP*0.05).toFixed(3);
      if(smoothP>0.70) nav.classList.add('compressed'); else nav.classList.remove('compressed');
      const mp=g('meta-progress'), mt=g('meta-time'), mtmp=g('meta-temp');
      if(mp) mp.textContent=`${(smoothP*100).toFixed(1).padStart(4,'0')}%`;
      if(mt) mt.textContent=`${vTime.toFixed(1).padStart(3,'0')}s / ${videoDuration.toFixed(1)}s`;
      if(mtmp){ const t=187+smoothP*17; mtmp.textContent=`187°C → ${t.toFixed(0)}°C`; }

      requestAnimationFrame(tick);
    }
    tick();

    // reveals
    gsap.utils.toArray('.content-section .eyeline, .display, .lead, .story-right p, .section-desc, .drink-card, .col-card, .rp, .machine-frame, .g-item, .journal-card, .contact-grid > *')
      .forEach(el=>{ gsap.fromTo(el,{y:38,opacity:0},{y:0,opacity:1,duration:0.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}); });
  }

  initScrub();
  addEventListener('resize',()=>{ clearTimeout(window._r); window._r=setTimeout(()=>ScrollTrigger.refresh(),180); });

  // anchor
  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    a.addEventListener('click',(e)=>{ const id=a.getAttribute('href'); if(id.length>1){ const t=document.querySelector(id); if(t){ e.preventDefault(); if(lenis && loaderDone) lenis.scrollTo(t,{offset:-56,duration:1.15}); else t.scrollIntoView({behavior:'smooth'}); } } });
  });

  window.__ember = ()=>({target:targetP, smooth:smoothP, vTime, dur:videoDuration, loaded:fullyLoaded, rs:video?.readyState, buf: video?.buffered?.length? video.buffered.end(video.buffered.length-1):0 });
});
