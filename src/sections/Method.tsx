import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Method = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const microRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

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
      // Chapter card
      scrollTl.fromTo(
        cardRef.current,
        { x: '50vw', rotate: 3, opacity: 0 },
        { x: 0, rotate: 0, opacity: 1, ease: 'none' },
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
        0.08
      );

      // Background counter-motion
      scrollTl.fromTo(
        bgRef.current,
        { x: 0 },
        { x: '-2vw', ease: 'none' },
        0
      );

      // SETTLE (30-70%) - hold

      // EXIT (70-100%)
      scrollTl.fromTo(
        cardRef.current,
        { x: 0, y: 0, opacity: 1 },
        { x: '24vw', y: '-10vh', opacity: 0, ease: 'power2.in' },
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
        { x: 0, opacity: 1 },
        { x: '-10vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        bgRef.current,
        { scale: 1, x: '-2vw', opacity: 1 },
        { scale: 1.04, opacity: 0.3, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-screen h-screen overflow-hidden z-40"
      data-settle="0.50"
    >
      {/* Full Background Image */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-[1]"
      >
        <img
          src="/images/bridal_couture_1776636064423.png"
          alt="Bridal Couture"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
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
        Sewphie Stitches — Bridal Couture
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
        BRIDAL COUTURE
      </h2>

      {/* Chapter Card */}
      <div
        ref={cardRef}
        className="absolute rounded-[22px] p-8 md:p-10 backdrop-blur-md border border-parchment/20"
        style={{
          left: '54vw',
          top: '18vh',
          width: 'min(40vw, 480px)',
          height: 'auto',
          minHeight: '48vh',
          zIndex: 7,
          background: 'rgba(11,58,46,0.72)',
        }}
      >
        <h3 className="font-display text-3xl md:text-4xl text-parchment mb-6">
          The Custom Gown
        </h3>
        <p className="text-parchment/80 text-sm md:text-base leading-relaxed mb-8">
          Exquisite silks, ethereal silhouettes, and hand-beaded lace. Each bespoke gown is conceptualized from sketch to reality—crafted to illuminate the bride, holding its shape, movement, and elegance effortlessly.
        </p>
        <button
          className="px-8 py-4 bg-copper text-white font-mono text-sm uppercase tracking-[0.12em] rounded-full hover:bg-[#a67b5b] transition-colors shadow-lg"
          onClick={() => document.getElementById('atelier')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Begin Your Bridal Journey
        </button>
      </div>
    </section>
  );
};

export default Method;
