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
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  // Mobile Sidebar Component - rendered via Portal
  const MobileSidebar = () => {
    if (typeof document === 'undefined') return null;

    return createPortal(
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] md:hidden transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={() => setIsOpen(false)}
        />

        {/* Sidebar */}
        <div className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] z-[9999] bg-white backdrop-blur-2xl border-l border-border/40 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full p-6 overflow-y-auto">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/40">
              <span className="text-lg font-bold font-mono text-foreground">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-col space-y-2">
              {[
                { label: "Home", href: "/", delay: "50ms" },
                { label: "Features", href: "/#features", delay: "100ms" },
                { label: "Pricing", href: "/#pricing", delay: "150ms" },
                { label: "About", href: "/about", delay: "200ms" },
                { label: "Verify Payment", href: "/verify-transaction", delay: "250ms" },
              ].map((item, index) => (
                <a
                  key={index}
                  href={item.href}
                  className={`text-lg font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 py-3 rounded-xl transition-all duration-300 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
                  style={{ transitionDelay: item.delay }}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <button
                className={`text-left text-lg font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 py-3 rounded-xl transition-all duration-300 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
                style={{ transitionDelay: "275ms" }}
                onClick={() => {
                  setIsOpen(false);
                  setIsTrackOpen(true);
                }}
              >
                Track Transactions
              </button>

              <a
                href="https://t.me/+TrNKLnH49UZkMWNk"
                target="_blank"
                rel="noopener noreferrer"
                className={`text-lg font-mono font-medium text-accent hover:text-accent/80 hover:bg-accent/10 px-4 py-3 rounded-xl transition-all duration-300 flex items-center gap-2 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
                style={{ transitionDelay: "300ms" }}
                onClick={() => setIsOpen(false)}
              >
                Join Community
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>

            <div className={`mt-auto pt-8 space-y-4 transition-all duration-500 delay-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              {session ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full text-base font-mono h-12 border border-border/50 justify-start px-4">
                      Dashboard
                    </Button>
                  </Link>
                  <Button onClick={() => {
                    handleSignOut();
                    setIsOpen(false);
                  }} variant="outline" className="w-full text-base font-mono h-12 justify-start px-4 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full text-base font-mono h-12 border border-border/50 justify-center">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-accent hover:bg-accent/90 text-base font-mono h-12 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  };

  return (
    <>
      {/* Recurra IQ Banner - above navbar */}
      <div className="bg-accent text-accent-foreground text-center text-xs sm:text-sm py-2 px-4 font-mono w-full relative z-50">
        <a href="https://iq.recurrra.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          🚀 Discover Recurra IQ — AI-powered subscription intelligence
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-5 md:px-6 py-3 md:py-4">
          <Link to="/" className="flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
            <img src={logoImage} alt="Recurra Logo" className="h-10 w-10 md:h-12 md:w-12 object-cover rounded-xl" />
            <span className="text-lg md:text-xl font-bold text-foreground font-mono">Recurra</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="/#features" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105 font-mono">
              Features
            </a>
            <a href="/#pricing" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105 font-mono">
              Pricing
            </a>
            <Link to="/about" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105 font-mono">
              About
            </Link>
            <Link to="/verify-transaction" className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105 font-mono">
              Verify Payment
            </Link>
            <button 
              onClick={() => setIsTrackOpen(true)}
              className="text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:scale-105 font-mono"
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
                  <Button variant="ghost" className="transition-all duration-300 hover:scale-105 font-mono">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-accent hover:bg-accent/90 transition-all duration-300 hover:scale-105 font-mono rounded-full px-6">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 transition-colors active:scale-95"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar - Portaled to body */}
      <MobileSidebar />

      {/* Modals */}
      <TrackTransactionsModal open={isTrackOpen} onOpenChange={setIsTrackOpen} />
    </>
  );
};

export default Navbar;