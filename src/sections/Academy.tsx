import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Academy = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const mainPortraitRef = useRef<HTMLDivElement>(null);
  const topCardRef = useRef<HTMLDivElement>(null);
  const bottomCardRef = useRef<HTMLDivElement>(null);
  const textileRef = useRef<HTMLDivElement>(null);
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
      // Main portrait
      scrollTl.fromTo(
        mainPortraitRef.current,
        { x: '40vw', scale: 1.08, opacity: 0 },
        { x: 0, scale: 1, opacity: 1, ease: 'none' },
        0
      );

      // Top angled card
      scrollTl.fromTo(
        topCardRef.current,
        { x: '-30vw', y: '-20vh', rotate: -22, opacity: 0 },
        { x: 0, y: 0, rotate: -12, opacity: 1, ease: 'none' },
        0
      );

      // Bottom angled card
      scrollTl.fromTo(
        bottomCardRef.current,
        { x: '-30vw', y: '20vh', rotate: 20, opacity: 0 },
        { x: 0, y: 0, rotate: 10, opacity: 1, ease: 'none' },
        0.05
      );

      // Textile wipe
      scrollTl.fromTo(
        textileRef.current,
        { x: 0, opacity: 0 },
        { x: '55vw', opacity: 1, ease: 'none' },
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

      // Paragraph
      scrollTl.fromTo(
        paragraphRef.current,
        { x: '22vw', opacity: 0 },
        { x: 0, opacity: 1, ease: 'none' },
        0
      );

      // SETTLE (30-70%) - hold

      // EXIT (70-100%)
      scrollTl.fromTo(
        mainPortraitRef.current,
        { x: 0, scale: 1, opacity: 1 },
        { x: '18vw', scale: 1.04, opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        topCardRef.current,
        { x: 0, opacity: 1 },
        { x: '-20vw', opacity: 0, ease: 'power2.in' },
        0.7
      );

      scrollTl.fromTo(
        bottomCardRef.current,
        { x: 0, opacity: 1 },
        { x: '-20vw', opacity: 0, ease: 'power2.in' },
        0.72
      );

      scrollTl.fromTo(
        textileRef.current,
        { x: '55vw', opacity: 1 },
        { x: '120vw', rotate: 12, opacity: 0, ease: 'power2.in' },
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
        paragraphRef.current,
        { x: 0, opacity: 1 },
        { x: '18vw', opacity: 0, ease: 'power2.in' },
        0.7
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="academy"
      className="relative w-screen h-screen bg-parchment overflow-hidden z-[60]"
      data-settle="0.50"
    >
      {/* Main Portrait Card */}
      <div
        ref={mainPortraitRef}
        className="absolute rounded-[22px] overflow-hidden shadow-[0_18px_40px_rgba(12,15,10,0.18)]"
        style={{
          left: '18vw',
          top: '10vh',
          width: '74vw',
          height: '80vh',
          zIndex: 2,
        }}
      >
        <img
          src="/images/academy-main.jpg"
          alt="The Academy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Top-left Angled Card */}
      <div
        ref={topCardRef}
        className="absolute rounded-[16px] overflow-hidden shadow-[0_12px_30px_rgba(12,15,10,0.2)]"
        style={{
          left: '-6vw',
          top: '6vh',
          width: '28vw',
          height: '22vh',
          zIndex: 4,
          transform: 'rotate(-12deg)',
        }}
      >
        <img
          src="/images/academy-angled-top.jpg"
          alt="Fashion design"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom-left Angled Card */}
      <div
        ref={bottomCardRef}
        className="absolute rounded-[16px] overflow-hidden shadow-[0_12px_30px_rgba(12,15,10,0.2)]"
        style={{
          left: '-4vw',
          bottom: '6vh',
          width: '30vw',
          height: '24vh',
          zIndex: 4,
          transform: 'rotate(10deg)',
        }}
      >
        <img
          src="/images/academy-angled-bottom.jpg"
          alt="Fabric swatches"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Textile Wipe */}
      <div
        ref={textileRef}
        className="absolute rounded-[12px] overflow-hidden shadow-[0_18px_40px_rgba(12,15,10,0.3)]"
        style={{
          left: '-18vw',
          top: '30vh',
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
        className="absolute font-mono text-xs uppercase tracking-[0.18em] text-text-primary/70"
        style={{
          left: '6vw',
          top: '7vh',
          zIndex: 6,
        }}
      >
        Sewphie Stitches — Education
      </span>

      {/* Title */}
      <h2
        ref={titleRef}
        className="absolute font-display text-text-primary uppercase tracking-[-0.02em] leading-[0.85]"
        style={{
          left: '6vw',
          bottom: '20vh',
          fontSize: 'clamp(44px, 6vw, 104px)',
          zIndex: 6,
          textShadow: '0 2px 12px rgba(244,239,230,0.8)',
        }}
      >
        THE ACADEMY
      </h2>

      {/* Paragraph Block with CTA */}
      <div
        ref={paragraphRef}
        className="absolute bg-forest/85 backdrop-blur-sm rounded-[22px] p-6 md:p-8"
        style={{
          right: '6vw',
          bottom: '10vh',
          width: 'min(34vw, 420px)',
          zIndex: 6,
        }}
      >
        <p className="text-parchment/90 text-sm md:text-base leading-relaxed mb-6">
          "Learn the discipline behind the drama. Courses in draping, pattern-making, and collection building—for designers ready to refine their voice."
        </p>
        <button
          className="px-8 py-4 bg-copper text-white font-mono text-sm uppercase tracking-[0.12em] rounded-full hover:bg-[#a67b5b] transition-colors shadow-lg"
          onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Explore Programs
        </button>
      </div>
    </section>
  );
};

export default Academy;
