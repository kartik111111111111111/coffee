/* EMBER COFFEE — No video version, pure image scroll */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const log = (...a) => console.log('[EMBER]', ...a);

  const loader = $('#loader');
  const loaderBar = $('#loader-bar');
  const loaderPct = $('#loader-pct');
  const loaderMsg = $('#loader-msg');
  const nav = $('#nav');
  const navProgressBar = $('#nav-progress-bar');
  const heroTrack = $('#hero-track');
  const heroImage = $('#hero-image');
  const heroImage2 = $('#hero-image-2');
  const heroSmoke = $('#hero-smoke');

  if (!window.gsap || !window.ScrollTrigger) { location.reload(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // Lenis
  let lenis = null;
  try {
    if (window.Lenis) {
      lenis = new Lenis({
        duration: 1.08,
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

  // Loader — only % + random editorial (no downloading text)
  const lines = [
    'Wood stacked at dawn',
    'Listening for first crack',
    'Ember, not flame',
    '6kg small batch',
    '22 minutes, one vinyl side',
    '72 hours rest',
    'Tracing back to a tree',
    'Morning in the hills',
    'Remembered forever',
    'Jackfruit smoke',
    'Twelve seats, no laptops',
    'By invitation only'
  ];
  let lineIdx = 0;
  function rndLine(){ lineIdx = (lineIdx+1)%lines.length; return lines[lineIdx]; }

  let loaderDone = false;
  function setLoader(pct){
    const c=Math.max(0,Math.min(1,pct));
    if(loaderBar) loaderBar.style.width=`${c*100}%`;
    if(loaderPct) loaderPct.textContent=`${String(Math.floor(c*100)).padStart(2,'0')}%`;
  }
  function hideLoader(){
    if(loaderDone) return;
    loaderDone=true;
    setLoader(1);
    if(loaderMsg) loaderMsg.textContent='Ready';
    gsap.to(loader,{opacity:0,duration:0.7,ease:'power3.inOut',onComplete:()=>{ loader.classList.add('hidden'); ScrollTrigger.refresh(); }});
    gsap.fromTo('#hero-stage .hero-content',{opacity:0},{opacity:1,duration:0.9,delay:0.1});
    if(lenis) lenis.start();
  }

  // fake + image preload progress, no video
  let prog = 0;
  let phraseInt = setInterval(()=>{ if(!loaderDone && loaderMsg) loaderMsg.textContent = rndLine(); }, 380);
  if(loaderMsg) loaderMsg.textContent = lines[0];

  // preload hero images
  const imgs = [
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1920',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=1920'
  ];
  let loadedImgs = 0;
  function imgProgress(){
    loadedImgs++;
    const pct = 0.15 + (loadedImgs/imgs.length)*0.55 + prog*0.3;
    setLoader(Math.min(0.96, pct));
  }
  imgs.forEach(src=>{
    const im = new Image();
    im.src = src;
    im.onload = imgProgress;
    im.onerror = imgProgress;
  });

  let fakeInt = setInterval(()=>{
    prog += 0.015 + Math.random()*0.025;
    if(prog<0.88 && !loaderDone){
      // combine with image load
      const cur = parseFloat(loaderBar?.style.width||'0')/100;
      setLoader(Math.max(cur, prog*0.7));
    }
    if(prog>=0.98){
      clearInterval(fakeInt);
      clearInterval(phraseInt);
      setLoader(1);
      setTimeout(hideLoader, 320);
    }
  }, 70);

  // Scroll scrub — image based, same editorial feel as video version
  let targetP = 0, smoothP = 0;

  function initScrub(){
    ScrollTrigger.create({
      trigger: heroTrack,
      start: 'top top',
      end: 'bottom top',
      scrub: false,
      onUpdate: s=>{ targetP = s.progress; }
    });
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: s=>{
        if(navProgressBar) navProgressBar.style.width=`${s.progress*100}%`;
        if(s.progress>0.02) nav.classList.add('scrolled'); else nav.classList.remove('scrolled');
      }
    });
    // fade image into story
    ScrollTrigger.create({
      trigger: '#story',
      start: 'top 92%',
      end: 'top 18%',
      scrub: true,
      onUpdate: s=>{
        if(heroImage){
          const op = 1 - s.progress*0.68;
          document.querySelector('.visual-wrap').style.opacity = op;
        }
      }
    });

    let last = performance.now();
    function tick(){
      const now = performance.now();
      const dt = Math.min(33, now-last)/16.666;
      last = now;
      smoothP += (targetP - smoothP) * (1 - Math.pow(1 - 0.18, dt));
      smoothP = Math.max(0, Math.min(1, smoothP));
      const p = smoothP;

      // image transforms — GPU accelerated, Apple-like
      if(heroImage){
        const scale = 1.06 + p*0.18;
        const y = p * -40; // subtle parallax up
        const bright = 0.92 - p*0.14;
        const sat = 1.02 + p*0.14;
        gsap.set(heroImage, {scale, y, filter:`contrast(1.06) brightness(${bright}) saturate(${sat})`});
      }
      if(heroImage2){
        const scale = 1.12 + p*0.12;
        const x = p * -18;
        const op = 0.42 - p*0.18;
        gsap.set(heroImage2, {scale, x, opacity:op});
      }
      if(heroSmoke){
        gsap.set(heroSmoke, {y: p*-30, opacity: 0.6 - p*0.25, scale:1 + p*0.08});
      }

      // hero UI sync — same as before
      const map = (a,b)=> Math.max(0, Math.min(1, (p-a)/(b-a)));
      const g = (id)=>document.getElementById(id);
      const l1=g('h-l1'), l2=g('h-l2'), l3=g('h-l3');
      if(l1){ const m=map(0,0.30); gsap.set(l1,{y:-m*80,scale:1-m*0.07,opacity:1-m,filter:`blur(${m*5}px)`}); }
      if(l2){ const m=map(0.10,0.48); gsap.set(l2,{y:-m*100,scale:1-m*0.08,opacity:1-m,filter:`blur(${m*7}px)`}); }
      if(l3){ const m=map(0.20,0.60); gsap.set(l3,{y:-m*120,x:-m*16,scale:1-m*0.06,opacity:1-m,filter:`blur(${m*5}px)`}); }
      const ey=g('h-eyebrow'), ki=g('h-kicker'), cp=g('h-copy'), ca=g('h-cta'), me=g('h-meta'), sc=g('h-scroll');
      if(ey) gsap.set(ey,{opacity:1-map(0,0.20)*1.2,y:-map(0,0.20)*18});
      if(ki) gsap.set(ki,{opacity:1-map(0.02,0.26),y:-map(0.02,0.26)*14});
      if(cp) gsap.set(cp,{opacity:1-map(0.33,0.66),y:-map(0.33,0.66)*36});
      if(ca){ const m=map(0.40,0.70); gsap.set(ca,{opacity:1-m,y:-m*28,filter:`blur(${m*3}px)`}); const r=ca.querySelector('.cta-reflect'); if(r) r.style.transform=`translateX(${-80+p*160}%) skewX(-18deg)`; }
      if(me) gsap.set(me,{opacity:1-map(0.48,0.76),y:-map(0.48,0.76)*26});
      if(sc) gsap.set(sc,{opacity:1-map(0,0.18)*2});
      const grainEl = document.getElementById('grain'); if(grainEl) grainEl.style.opacity=(0.032+p*0.05).toFixed(3);
      if(p>0.68) nav.classList.add('compressed'); else nav.classList.remove('compressed');
      const mp=g('meta-progress'), mtmp=g('meta-temp');
      if(mp) mp.textContent=`${(p*100).toFixed(0).padStart(3,'0')}%`;
      if(mtmp){ const t=187+p*17; mtmp.textContent=`187°C → ${t.toFixed(0)}°C`; }
      document.querySelectorAll('.drink-glass-reflect').forEach((el,i)=>{ el.style.transform=`translateX(${-30+p*60+Math.sin(p*3+i)*6}%)`; });

      requestAnimationFrame(tick);
    }
    tick();

    // reveals
    gsap.utils.toArray('.content-section .eyeline, .display, .lead, .story-right p, .section-desc, .drink-card, .col-card, .rp, .machine-frame, .g-item, .journal-card, .contact-grid > *')
      .forEach(el=>{ gsap.fromTo(el,{y:36,opacity:0},{y:0,opacity:1,duration:0.85,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}); });

    document.querySelectorAll('[data-tilt]').forEach(card=>{
      card.addEventListener('mousemove',(e)=>{ const r=card.getBoundingClientRect(); const dx=(e.clientX-(r.left+r.width/2))/r.width; const dy=(e.clientY-(r.top+r.height/2))/r.height; gsap.to(card,{rotationY:dx*8,rotationX:-dy*8,transformPerspective:1000,duration:0.7,ease:'power3.out'}); });
      card.addEventListener('mouseleave',()=>{ gsap.to(card,{rotationY:0,rotationX:0,duration:0.9,ease:'elastic.out(1,0.45)'}); });
    });
  }

  initScrub();
  addEventListener('resize',()=>{ clearTimeout(window._r); window._r=setTimeout(()=>ScrollTrigger.refresh(),180); });
  document.querySelectorAll('a[href^=\"#\"]').forEach(a=>{
    a.addEventListener('click',(e)=>{ const id=a.getAttribute('href'); if(id.length>1){ const t=document.querySelector(id); if(t){ e.preventDefault(); if(lenis && loaderDone) lenis.scrollTo(t,{offset:-56,duration:1.1}); else t.scrollIntoView({behavior:'smooth'}); } } });
  });
});
