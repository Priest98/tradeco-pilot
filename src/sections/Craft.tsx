import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Craft = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLDivElement>(null);
  const textileRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
        },
      });

      // ENTRANCE (0-30%)
      // Textile wipe entrance
      scrollTl.fromTo(
        textileRef.current,
        { x: 0, rotate: -8, scale: 1.1, opacity: 0 },
        { x: '38vw', rotate: 0, scale: 1, opacity: 1, ease: 'none' },
        0
      );

      // Micro label
      scrollTl.fromTo(
        microRef.current,
        { y: -12, opacity: 0 },
        { y: 0, opacity: 1, ease: 'none' },
        0
      );

      // Title
      scrollTl.fromTo(
        titleRef.current,
        { x: '-18vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0.05
      );

      // Paragraph
      scrollTl.fromTo(
        paragraphRef.current,
        { x: '24vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      // Background parallax
      scrollTl.fromTo(
        bgRef.current,
        { y: 0 },
        { y: '-1vh', ease: 'none' },
        0.3
      );

      // SETTLE (30-70%) - hold

      // EXIT (70-100%)
      scrollTl.fromTo(
        textileRef.current,
        { x: '38vw', rotate: 0, scale: 1, opacity: 1 },
        { x: '120vw', rotate: 10, scale: 0.95, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        microRef.current,
        { y: 0, opacity: 1 },
        { y: -10, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        titleRef.current,
        { x: 0, y: 0, opacity: 1 },
        { y: '6vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        paragraphRef.current,
        { x: 0, opacity: 1 },
        { x: '18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        bgRef.current,
        { scale: 1, y: '-1vh', opacity: 1 },
        { scale: 1.05, y: '-2vh', opacity: 0.3, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="atelier"
      className="relative w-screen h-screen overflow-hidden z-30"
      data-settle="0.50"
    >
      {/* Full Background Image */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-[1]"
      >
        <img
          src="/images/bespoke_suiting_1776636027493.png"
          alt="Bespoke Suiting"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
      </div>

      {/* Textile Wipe Fragment */}
      <div
        ref={textileRef}
        className="absolute rounded-[12px] overflow-hidden shadow-[0_18px_40px_rgba(12,15,10,0.3)]"
        style={{
          left: '-18vw',
          top: '34vh',
          width: '18vw',
          height: '18vw',
          zIndex: 10,
        }}
      >
        <img
          src="/images/textile-pattern.jpg"
          alt="Textile pattern"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Micro Label */}
      <span
        ref={microRef}
        className="absolute font-mono text-xs uppercase tracking-[0.18em] text-white/80"
        style={{
          left: '6vw',
          top: '7vh',
          zIndex: 6,
        }}
      >
        Sewphie Stitches — Menswear & Suiting
      </span>

      {/* Title */}
      <h2
        ref={titleRef}
        className="absolute font-display text-white uppercase tracking-[-0.02em] leading-[0.85]"
        style={{
          left: '6vw',
          bottom: '8vh',
          fontSize: 'clamp(44px, 6vw, 104px)',
          zIndex: 6,
          textShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}
      >
        BESPOKE SUITING
      </h2>

      {/* Paragraph Block */}
      <div
        ref={paragraphRef}
        className="absolute bg-forest/80 backdrop-blur-sm rounded-[22px] p-6 md:p-8"
        style={{
          right: '6vw',
          bottom: '10vh',
          width: 'min(34vw, 420px)',
          zIndex: 6,
        }}
      >
        <p className="text-parchment/90 text-sm md:text-base leading-relaxed">
          "Sharp tailoring in deep charcoal and subtle gold. From the exact roll of the lapel to the perfect break of the trouser, our bespoke suits are crafted for undeniable presence."
        </p>
      </div>
    </section>
  );
};

export default Craft;
