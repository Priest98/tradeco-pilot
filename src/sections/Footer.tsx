import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Instagram, Send, MapPin, Phone, Mail } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const newsletterRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [newsEmail, setNewsEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Headline
      ScrollTrigger.create({
        trigger: headlineRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.fromTo(
            headlineRef.current,
            { y: 40, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
          );
        },
        once: true,
      });

      // Form
      ScrollTrigger.create({
        trigger: formRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.fromTo(
            formRef.current,
            { x: 60, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.8, ease: 'power2.out' }
          );
        },
        once: true,
      });

      // Newsletter
      ScrollTrigger.create({
        trigger: newsletterRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.fromTo(
            newsletterRef.current,
            { scale: 0.98, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' }
          );
        },
        once: true,
      });

      // Links columns
      ScrollTrigger.create({
        trigger: linksRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.fromTo(
            linksRef.current?.children || [],
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out' }
          );
        },
        once: true,
      });

      // Bottom
      ScrollTrigger.create({
        trigger: bottomRef.current,
        start: 'top 90%',
        onEnter: () => {
          gsap.fromTo(
            bottomRef.current,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }
          );
        },
        once: true,
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // WhatsApp integration
    const message = `Hello Sewphie Stitches! I'm ${formData.name}. ${formData.message}`;
    const whatsappUrl = `https://wa.me/2349065368362?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setNewsEmail('');
  };

  const footerLinks = [
    {
      title: 'Shop',
      links: ['New Arrivals', 'Best Sellers', 'Gift Card'],
    },
    {
      title: 'Atelier',
      links: ['Our Story', 'Sustainability', 'Care'],
    },
    {
      title: 'Academy',
      links: ['Courses', 'Mentorship', 'FAQs'],
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="relative w-full bg-parchment z-[80]"
    >
      {/* Decorative top image */}
      <div className="w-full h-[35vh] overflow-hidden">
        <img
          src="/images/lookbook_main_1776636129036.png"
          alt="Sewphie Stitches"
          className="w-full h-full object-cover object-top opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-parchment" />
      </div>

      <div className="px-6 lg:px-12 py-16 lg:py-24">
        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 mb-20">
          {/* Left: Headline */}
          <h2
            ref={headlineRef}
            className="font-display text-4xl md:text-5xl lg:text-6xl text-text-primary leading-tight"
          >
            Request a
            <br />
            Private Consultation.
          </h2>

          {/* Right: Contact Form */}
          <div
            ref={formRef}
            className="bg-forest/5 rounded-[22px] p-8 md:p-10"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.18em] text-text-secondary mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-transparent border-b border-text-secondary/30 py-3 text-text-primary focus:outline-none focus:border-copper transition-colors"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.18em] text-text-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-transparent border-b border-text-secondary/30 py-3 text-text-primary focus:outline-none focus:border-copper transition-colors"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div>
                <label className="block font-mono text-xs uppercase tracking-[0.18em] text-text-secondary mb-2">
                  Message
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full bg-transparent border-b border-text-secondary/30 py-3 text-text-primary focus:outline-none focus:border-copper transition-colors resize-none"
                  placeholder="Tell us about your vision..."
                  required
                />
              </div>
              <button
                type="submit"
                className="px-8 py-4 bg-forest text-parchment font-mono text-sm uppercase tracking-[0.12em] rounded-full hover:bg-copper transition-colors shadow-lg flex items-center gap-3"
              >
                <Send size={16} />
                Send via WhatsApp
              </button>
            </form>
          </div>
        </div>

        {/* Newsletter Block */}
        <div
          ref={newsletterRef}
          className="bg-forest rounded-[22px] p-8 md:p-12 mb-20 text-center"
        >
          <h3 className="font-display text-3xl md:text-4xl text-parchment mb-4">
            Notes from the Atelier
          </h3>
          <p className="text-parchment/70 mb-8 max-w-md mx-auto leading-relaxed">
            Step inside the world of Sewphie Stitches. Join our private mailing list to receive exclusive looks at our upcoming collections, behind-the-scenes glimpses of our tailoring process, and priority access to our design academy updates.
          </p>
          {subscribed ? (
            <p className="text-copper font-mono text-sm uppercase tracking-[0.12em]">
              Thank you for subscribing!
            </p>
          ) : (
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
              <input
                type="email"
                value={newsEmail}
                onChange={(e) => setNewsEmail(e.target.value)}
                className="flex-1 bg-parchment/10 border border-parchment/30 rounded-full px-6 py-4 text-parchment placeholder:text-parchment/50 focus:outline-none focus:border-copper transition-colors"
                placeholder="your@email.com"
                required
              />
              <button
                type="submit"
                className="px-8 py-4 bg-copper text-white font-mono text-sm uppercase tracking-[0.12em] rounded-full hover:bg-[#a67b5b] transition-colors"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>

        {/* Footer Links */}
        <div
          ref={linksRef}
          className="grid grid-cols-2 md:grid-cols-3 gap-10 mb-16"
        >
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h4 className="font-mono text-xs uppercase tracking-[0.18em] text-text-secondary mb-6">
                {column.title}
              </h4>
              <ul className="space-y-4">
                {column.links.map((link) => (
                  <li key={link}>
                    <button className="text-text-primary hover:text-copper transition-colors text-sm">
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 mb-16 text-text-secondary text-sm">
          <div className="flex items-center gap-3">
            <MapPin size={16} className="text-copper" />
            <span>Lagos, Nigeria</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-copper" />
            <span>+234 906 536 8362</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-copper" />
            <span>hello@sewphiestitches.com</span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          ref={bottomRef}
          className="border-t border-text-secondary/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/images/logo-green.png" alt="Sewphie Stitches" className="h-8 w-auto" />
            <span className="font-display text-lg text-text-primary">Sewphie Stitches</span>
          </div>

          {/* Social + Legal */}
          <div className="flex items-center gap-8">
            <a
              href="https://instagram.com/sewphiestitches"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-copper transition-colors"
            >
              <Instagram size={20} />
            </a>
            <button className="font-mono text-xs uppercase tracking-[0.12em] text-text-secondary hover:text-copper transition-colors">
              Privacy
            </button>
            <button className="font-mono text-xs uppercase tracking-[0.12em] text-text-secondary hover:text-copper transition-colors">
              Terms
            </button>
          </div>

          {/* Copyright */}
          <p className="font-mono text-xs text-text-secondary/60">
            © 2025 Sewphie Stitches. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Footer;
