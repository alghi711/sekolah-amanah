(function(){
  'use strict';
  const carousel=document.querySelector('#admission-carousel');
  if(!carousel)return;
  const track=document.querySelector('#banner-track');
  const slides=Array.from(carousel.querySelectorAll('.banner-slide'));
  const dots=Array.from(carousel.querySelectorAll('[data-banner-slide]'));
  const play=document.querySelector('#banner-play');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let current=0,playing=!reduced.matches,hovering=false,inView=true,timer,pointerPlayState=null,motionPaused=false;
  function schedule(){
    clearTimeout(timer);
    if(playing&&!hovering&&inView&&!document.hidden&&!motionPaused)timer=setTimeout(()=>{show(current+1);schedule();},8000);
  }
  function syncPlay(){
    play.textContent=playing?'Ⅱ Jeda':'▶ Putar';
    play.setAttribute('aria-pressed',String(playing));
    play.setAttribute('aria-label',playing?'Jeda pergantian banner otomatis':'Mulai pergantian banner otomatis');
    schedule();
  }
  function show(index,manual=false){
    current=(index+slides.length)%slides.length;
    track.style.transform=`translateX(-${current*100}%)`;
    slides.forEach((slide,i)=>{const active=i===current;slide.inert=!active;slide.tabIndex=active?0:-1;slide.setAttribute('aria-hidden',String(!active));dots[i].setAttribute('aria-pressed',String(active));});
    const name=slides[current].dataset.name;
    document.querySelector('#banner-name').textContent=name;
    document.querySelector('#banner-counter').textContent=`${String(current+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    document.querySelector('#banner-full').href=slides[current].querySelector('img').getAttribute('src');
    if(manual){playing=false;syncPlay();document.querySelector('#banner-status').textContent=`Banner ${current+1} dari ${slides.length}: ${name}.`;}
  }
  document.querySelector('#banner-prev').addEventListener('click',()=>show(current-1,true));
  document.querySelector('#banner-next').addEventListener('click',()=>show(current+1,true));
  dots.forEach(dot=>dot.addEventListener('click',()=>show(Number(dot.dataset.bannerSlide),true)));
  play.addEventListener('pointerdown',event=>{if(event.button===0)pointerPlayState=playing;});
  play.addEventListener('pointercancel',()=>{pointerPlayState=null;});
  play.addEventListener('click',()=>{playing=!(pointerPlayState??playing);pointerPlayState=null;syncPlay();});
  carousel.addEventListener('mouseenter',()=>{hovering=true;schedule();});
  carousel.addEventListener('mouseleave',()=>{hovering=false;schedule();});
  carousel.addEventListener('focusin',()=>{playing=false;syncPlay();});
  carousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(current+(event.key==='ArrowLeft'?-1:1),true);}});
  document.addEventListener('visibilitychange',schedule);
  document.addEventListener('amanah:motion',event=>{motionPaused=event.detail.paused;schedule();});
  if('IntersectionObserver' in window)new window.IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();}).observe(carousel);
  reduced.addEventListener('change',event=>{if(event.matches){playing=false;syncPlay();}});
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  window.addEventListener('pageshow',schedule);
  show(0);syncPlay();
})();
