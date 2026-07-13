import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Statement = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLDivElement>(null);

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
        { x: '24vw', rotate: 2, opacity: 0 },
        { x: 0, rotate: 0, opacity: 1, ease: 'none' },
        0
      );

      // Background subtle scale
      scrollTl.fromTo(
        bgRef.current,
        { scale: 1 },
        { scale: 1.02, ease: 'none' },
        0
      );

      // SETTLE (30-70%) - no animation

      // EXIT (70-100%)
      scrollTl.fromTo(
        microRef.current,
        { y: 0, opacity: 1 },
        { y: -10, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        titleRef.current,
        { x: 0, opacity: 1 },
        { x: '-10vw', y: '6vh', opacity: 0, ease: 'power2.in' },
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
        { scale: 1.02, y: 0, opacity: 1 },
        { scale: 1.06, y: '-2vh', opacity: 0.3, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="collections"
      className="relative w-screen h-screen overflow-hidden z-20"
      data-settle="0.50"
    >
      {/* Full Background Image */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-[1]"
      >
        <img
          src="/images/asoebi_excellence_1776635982738.png"
          alt="AsoEbi Excellence"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
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
        Sewphie Stitches — AsoEbi
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
        ASOEBI EXCELLENCE
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
          "Intricate hand-beaded lace, rich emeralds, and masterful corsetry. AsoEbi pieces designed not just to attend, but to command the occasion."
        </p>
      </div>
    </section>
  );
};

export default Statement;
