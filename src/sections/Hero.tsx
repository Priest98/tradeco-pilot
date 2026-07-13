import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const basePhotoRef = useRef<HTMLDivElement>(null);
  const panelARef = useRef<HTMLDivElement>(null);
  const panelBRef = useRef<HTMLDivElement>(null);
  const panelCRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Load Animation (auto-play on mount)
      const loadTl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      // Base photo card entrance
      loadTl.fromTo(
        basePhotoRef.current,
        { x: '-12vw', scale: 1.06, opacity: 0 },
        { x: 0, scale: 1, opacity: 1, duration: 1 },
        0
      );

      // Wipe panels entrance (stacked, C on top)
      loadTl.fromTo(
        panelARef.current,
        { x: 0, opacity: 0 },
        { x: '60vw', opacity: 1, duration: 0.9 },
        0.15
      );
      loadTl.fromTo(
        panelBRef.current,
        { x: 0, opacity: 0 },
        { x: '60vw', opacity: 1, duration: 0.9 },
        0.25
      );
      loadTl.fromTo(
        panelCRef.current,
        { x: 0, opacity: 0 },
        { x: '60vw', opacity: 1, duration: 0.9 },
        0.35
      );

      // Title + tagline + CTA entrance
      loadTl.fromTo(
        titleRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.5
      );
      loadTl.fromTo(
        taglineRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.58
      );
      loadTl.fromTo(
        ctaRef.current,
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.66
      );
      loadTl.fromTo(
        microRef.current,
        { y: -12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7 },
        0.4
      );

      // Scroll-driven EXIT animation (70-100%)
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset all elements to visible when scrolling back to top
            gsap.set(basePhotoRef.current, { opacity: 1, x: 0, scale: 1 });
            gsap.set([panelARef.current, panelBRef.current, panelCRef.current], { opacity: 1, x: '60vw', scale: 1 });
            gsap.set([titleRef.current, taglineRef.current, ctaRef.current, microRef.current], {
              opacity: 1, y: 0, x: 0,
            });
          },
        },
      });

      // Phase 1 (0-30%): Hold settled state (no animation)
      // Phase 2 (30-70%): Hold settled state

      // Phase 3 (70-100%): EXIT animations
      scrollTl.fromTo(
        basePhotoRef.current,
        { x: 0, scale: 1, opacity: 1 },
        { x: '18vw', scale: 1.08, opacity: 0, ease: 'power2.in' },
        0.7
      );
      scrollTl.fromTo(
        panelARef.current,
        { x: '60vw', opacity: 1 },
        { x: '120vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
      scrollTl.fromTo(
        panelBRef.current,
        { x: '60vw', opacity: 1 },
        { x: '120vw', opacity: 0, ease: 'power2.in' },
        0.72
      );
      scrollTl.fromTo(
        panelCRef.current,
        { x: '60vw', opacity: 1 },
        { x: '120vw', opacity: 0, ease: 'power2.in' },
        0.74
      );
      scrollTl.fromTo(
        titleRef.current,
        { x: 0, opacity: 1 },
        { x: '-18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
      scrollTl.fromTo(
        taglineRef.current,
        { y: 0, opacity: 1 },
        { y: '10vh', opacity: 0, ease: 'power2.in' },
        0.75
      );
      scrollTl.fromTo(
        ctaRef.current,
        { y: 0, opacity: 1 },
        { y: '10vh', opacity: 0, ease: 'power2.in' },
        0.78
      );
      scrollTl.fromTo(
        microRef.current,
        { y: 0, opacity: 1 },
        { y: '-10px', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative w-screen h-screen bg-parchment overflow-hidden z-10"
      data-settle="0.52"
    >
      {/* Base Photo Card */}
      <div
        ref={basePhotoRef}
        className="absolute rounded-[22px] overflow-hidden shadow-[0_18px_40px_rgba(12,15,10,0.18)]"
        style={{
          left: '6vw',
          top: '16vh',
          width: '88vw',
          height: '68vh',
          zIndex: 2,
        }}
      >
        <img
          src="/images/lookbook_main_1776636129036.png"
          alt="Luxury fashion"
          className="w-full h-full object-cover object-top"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
      </div>

      {/* Wipe Panel A */}
      <div
        ref={panelARef}
        className="absolute rounded-[22px] overflow-hidden"
        style={{
          left: '-60vw',
          top: '18vh',
          width: '60vw',
          height: '64vh',
          zIndex: 5,
        }}
      >
        <img
          src="/images/hero-texture-1.jpg"
          alt="Texture detail"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Wipe Panel B */}
      <div
        ref={panelBRef}
        className="absolute rounded-[22px] overflow-hidden"
        style={{
          left: '-60vw',
          top: '18vh',
          width: '60vw',
          height: '64vh',
          zIndex: 6,
        }}
      >
        <img
          src="/images/hero-texture-2.jpg"
          alt="Fabric weave"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Wipe Panel C */}
      <div
        ref={panelCRef}
        className="absolute rounded-[22px] overflow-hidden"
        style={{
          left: '-60vw',
          top: '18vh',
          width: '60vw',
          height: '64vh',
          zIndex: 7,
        }}
      >
        <img
          src="/images/hero-texture-3.jpg"
          alt="Stitching detail"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Chapter Title */}
      <h1
        ref={titleRef}
        className="absolute font-display text-white uppercase tracking-[-0.02em] leading-[0.82]"
        style={{
          left: '-2vw',
          top: '6vh',
          fontSize: 'clamp(72px, 10vw, 170px)',
          zIndex: 8,
          textShadow: '0 2px 20px rgba(0,0,0,0.3)',
        }}
      >
        BESPOKE MASTERY
      </h1>

      {/* Micro Label */}
      <span
        ref={microRef}
        className="absolute font-mono text-xs uppercase tracking-[0.18em] text-white/80"
        style={{
          top: '6vh',
          right: '6vw',
          zIndex: 9,
        }}
      >
        S/S Lookbook
      </span>

      {/* Tagline */}
      <p
        ref={taglineRef}
        className="absolute font-display text-white text-xl md:text-2xl lg:text-3xl"
        style={{
          left: '6vw',
          bottom: '9vh',
          zIndex: 9,
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}
      >
        Elevating form. Mastering the drape. True luxury in every stitch.
      </p>

      {/* CTA Button */}
      <button
        ref={ctaRef}
        className="absolute px-8 py-4 bg-copper text-white font-mono text-sm uppercase tracking-[0.12em] rounded-full hover:bg-[#a67b5b] transition-colors shadow-lg"
        style={{
          right: '6vw',
          bottom: '9vh',
          zIndex: 9,
        }}
        onClick={() => document.getElementById('collections')?.scrollIntoView({ behavior: 'smooth' })}
      >
        Discover the Collection
      </button>
    </section>
  );
};

export default Hero;
