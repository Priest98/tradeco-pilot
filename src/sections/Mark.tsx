import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Mark = () => {
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

      // Paragraph + CTA
      scrollTl.fromTo(
        paragraphRef.current,
        { x: '24vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      // Background slow scale
      scrollTl.fromTo(
        bgRef.current,
        { scale: 1 },
        { scale: 1.02, ease: 'none' },
        0.3
      );

      // SETTLE (30-70%) - hold

      // EXIT (70-100%)
      scrollTl.fromTo(
        microRef.current,
        { y: 0, opacity: 1 },
        { y: -10, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        titleRef.current,
        { y: 0, opacity: 1 },
        { y: '6vh', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        paragraphRef.current,
        { x: 0, opacity: 1 },
        { x: '12vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        bgRef.current,
        { scale: 1.02, y: 0, opacity: 1 },
        { scale: 1.05, y: '-2vh', opacity: 0.3, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-screen h-screen overflow-hidden z-[70]"
      data-settle="0.50"
    >
      {/* Full Background Image */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-[1]"
      >
        <img
          src="/images/atelier_studio_1776636095764.png"
          alt="The Atelier"
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
        Sewphie Stitches — Atelier
      </span>

      {/* Title */}
      <h2
        ref={titleRef}
        className="absolute font-display text-white uppercase tracking-[-0.02em] leading-[0.85]"
        style={{
          left: '6vw',
          bottom: '22vh',
          fontSize: 'clamp(44px, 6vw, 104px)',
          zIndex: 6,
          textShadow: '0 2px 20px rgba(0,0,0,0.4)',
        }}
      >
        CONSULTATION
      </h2>

      {/* Paragraph Block with CTA */}
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
        <p className="text-parchment/90 text-sm md:text-base leading-relaxed mb-6">
          "True luxury is personal. Let us welcome you to the atelier to discuss fabrics, fit, and the fine details of your next masterpiece."
        </p>
        <button
          className="px-8 py-4 bg-copper text-white font-mono text-sm uppercase tracking-[0.12em] rounded-full hover:bg-[#a67b5b] transition-colors shadow-lg"
          onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Request a Private Consultation
        </button>
      </div>
    </section>
  );
};

export default Mark;
