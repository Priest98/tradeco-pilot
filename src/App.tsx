import { useEffect, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navigation from './sections/Navigation';
import Hero from './sections/Hero';
import Statement from './sections/Statement';
import Craft from './sections/Craft';
import Method from './sections/Method';
import Edit from './sections/Edit';
import Academy from './sections/Academy';
import Mark from './sections/Mark';
import Footer from './sections/Footer';

gsap.registerPlugin(ScrollTrigger);

function App() {
  // Global Scroll Snap for pinned sections
  useEffect(() => {
    // Wait for all ScrollTriggers to be created
    const timer = setTimeout(() => {
      const pinned = ScrollTrigger.getAll()
        .filter((st) => st.vars.pin)
        .sort((a, b) => a.start - b.start);

      const maxScroll = ScrollTrigger.maxScroll(window);
      if (!maxScroll || pinned.length === 0) return;

      // Build ranges and snap targets from pinned sections
      const pinnedRanges = pinned.map((st) => {
        const trigger = st.trigger as HTMLElement;
        const settleRatio = parseFloat(trigger?.dataset.settle || '0.5');
        const start = st.start / maxScroll;
        const end = (st.end ?? st.start) / maxScroll;
        const settle = (st.start + ((st.end ?? st.start) - st.start) * settleRatio) / maxScroll;
        return { start, end, settle };
      });

      // Create global snap
      ScrollTrigger.create({
        snap: {
          snapTo: (value: number) => {
            // Check if within any pinned range (with buffer)
            const inPinned = pinnedRanges.some(
              (r) => value >= r.start - 0.02 && value <= r.end + 0.02
            );
            if (!inPinned) return value; // Flowing section: free scroll

            // Find nearest settle target
            const target = pinnedRanges.reduce(
              (closest, r) =>
                Math.abs(r.settle - value) < Math.abs(closest - value) ? r.settle : closest,
              pinnedRanges[0]?.settle ?? 0
            );
            return target;
          },
          duration: { min: 0.15, max: 0.35 },
          delay: 0,
          ease: 'power2.out',
        },
      });
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Refresh ScrollTrigger on resize
  useLayoutEffect(() => {
    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative bg-parchment">
      {/* Grain Overlay */}
      <div className="grain-overlay" />

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative">
        <Hero />
        <Statement />
        <Craft />
        <Method />
        <Edit />
        <Academy />
        <Mark />
        <Footer />
      </main>
    </div>
  );
}

export default App;
