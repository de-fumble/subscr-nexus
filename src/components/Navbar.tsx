import { Button } from "@/components/ui/button";
import { X, Menu, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import logoImage from "@/assets/logo.svg";
import { useAuth } from "@/hooks/useAuth";
import { TrackTransactionsModal } from "./TrackTransactionsModal";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/#pricing" },
    { label: "About", href: "/about" },
    { label: "Verify Payment", href: "/verify-transaction" },
  ];

  return (
    <>
      {/* Recurra IQ Banner - above navbar */}
      <div className="bg-accent text-accent-foreground text-center text-xs sm:text-sm py-2 px-4 w-full relative z-50">
        <a href="https://iq.recurrra.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity font-medium">
          🚀 Discover Recurra IQ — AI-powered subscription intelligence
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-5 md:px-6 py-3 md:py-4">
          <Link to="/" className="flex items-center gap-2.5 transition-transform duration-300 hover:scale-[1.02]">
            <img src={logoImage} alt="Recurra Logo" className="h-10 w-10 md:h-12 md:w-12 object-cover rounded-xl shadow-sm" />
            <span className="text-lg md:text-xl font-bold text-foreground">Recurra</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            <a href="/#features" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105">
              Features
            </a>
            <a href="/#pricing" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105">
              Pricing
            </a>
            <Link to="/about" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105">
              About
            </Link>
            <Link to="/verify-transaction" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105">
              Verify Payment
            </Link>
            <button 
              onClick={() => setIsTrackOpen(true)}
              className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105"
            >
              Track Transactions
            </button>
            {session ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="transition-all duration-300 hover:scale-105">Dashboard</Button>
                </Link>
                <Button onClick={handleSignOut} variant="outline" className="transition-all duration-300 hover:scale-105">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="transition-all duration-300 hover:scale-105">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-accent hover:bg-accent/90 transition-all duration-300 hover:scale-105 rounded-full px-6">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className="md:hidden relative z-50 flex items-center justify-center p-2 rounded-xl text-foreground hover:bg-muted/60 transition-colors focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <Menu className={`absolute h-5 w-5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} />
              <X className={`absolute h-5 w-5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (Clean Apple-like typography & minimal layout) */}
      {mounted && createPortal(
        <div className="md:hidden">
          {/* Backdrop Blur overlay */}
          <div
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsOpen(false)}
          />

          {/* Minimal Apple-style Sheet */}
          <div
            className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] z-[9999] bg-white border-l border-border/40 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-7 pb-6">
              <div className="flex items-center gap-2.5">
                <img src={logoImage} alt="Recurra" className="h-8 w-8 object-cover rounded-xl shadow-xs" />
                <span className="font-bold text-foreground text-lg tracking-tight">Recurra</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation Links - Pure Typography, No AI Icon Bloat */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest px-2 mb-3">
                Navigation
              </div>

              {navLinks.map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-3 rounded-xl text-lg font-medium text-foreground/90 hover:text-foreground hover:bg-muted/60 transition-all duration-300 ${
                    isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                  }`}
                  style={{ transitionDelay: isOpen ? `${40 + index * 30}ms` : '0ms' }}
                >
                  {item.label}
                </a>
              ))}

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsTrackOpen(true);
                }}
                className={`w-full text-left block px-3 py-3 rounded-xl text-lg font-medium text-foreground/90 hover:text-foreground hover:bg-muted/60 transition-all duration-300 ${
                  isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                }`}
                style={{ transitionDelay: isOpen ? `${40 + navLinks.length * 30}ms` : '0ms' }}
              >
                Track Transactions
              </button>

              <div className="pt-4 pb-2">
                <div className="h-px bg-border/40 w-full" />
              </div>

              <a
                href="https://t.me/+TrNKLnH49UZkMWNk"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors ${
                  isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                }`}
                style={{ transitionDelay: isOpen ? `${40 + (navLinks.length + 1) * 30}ms` : '0ms' }}
              >
                Join Community
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Bottom Actions */}
            <div className="p-6 pt-4 border-t border-border/40 space-y-3 bg-white">
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block">
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 rounded-full font-semibold text-sm shadow-md">
                      Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    variant="ghost"
                    className="w-full h-10 text-sm text-destructive hover:bg-destructive/10 rounded-full"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)} className="block">
                    <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-12 rounded-full font-semibold text-sm shadow-md shadow-accent/15">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setIsOpen(false)} className="block text-center">
                    <span className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Already registered? <span className="text-accent underline font-semibold">Sign In</span>
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modals */}
      <TrackTransactionsModal open={isTrackOpen} onOpenChange={setIsTrackOpen} />
    </>
  );
};

export default Navbar;