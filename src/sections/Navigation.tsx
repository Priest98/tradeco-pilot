import { useEffect, useState, useRef } from 'react';
import { ShoppingBag, Menu, X } from 'lucide-react';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { label: 'Collections', id: 'collections' },
    { label: 'Atelier', id: 'atelier' },
    { label: 'Academy', id: 'academy' },
    { label: 'Lookbook', id: 'lookbook' },
    { label: 'Contact', id: 'contact' },
  ];

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 w-full z-[1000] transition-all duration-500 ${
          isScrolled
            ? 'bg-parchment/95 backdrop-blur-sm shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="w-full px-6 lg:px-12 py-5 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-3 group"
          >
            <img
              src={isScrolled ? '/images/logo-green.png' : '/images/logo-white.png'}
              alt="Sewphie Stitches"
              className="h-10 w-auto transition-all duration-300"
            />
            <span
              className={`font-display text-lg tracking-wide hidden sm:block transition-colors duration-300 ${
                isScrolled ? 'text-forest' : 'text-white'
              }`}
            >
              Sewphie Stitches
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`font-mono text-xs uppercase tracking-[0.18em] transition-colors duration-300 hover:text-copper ${
                  isScrolled ? 'text-text-primary' : 'text-white/90'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              className={`transition-colors duration-300 hover:text-copper ${
                isScrolled ? 'text-text-primary' : 'text-white/90'
              }`}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`lg:hidden transition-colors duration-300 ${
              isScrolled ? 'text-text-primary' : 'text-white'
            }`}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[999] bg-forest transition-all duration-500 lg:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollToSection(link.id)}
              className="font-display text-3xl text-parchment hover:text-copper transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navigation;
