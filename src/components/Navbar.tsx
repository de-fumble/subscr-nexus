import { Button } from "@/components/ui/button";
import { X, Repeat, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import logoImage from "@/assets/logo.png";
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  return <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        {session ? <>
          <Link to="/dashboard">
            <Button variant="ghost" className="transition-all duration-300 hover:scale-105">Dashboard</Button>
          </Link>
          <Button onClick={handleSignOut} variant="outline" className="transition-all duration-300 hover:scale-105">
            Sign Out
          </Button>
        </> : <>
          <Link to="/auth">
            <Button variant="ghost" className="transition-all duration-300 hover:scale-105 font-mono">Sign In</Button>
          </Link>
          <Link to="/auth">
            <Button className="bg-accent hover:bg-accent/90 transition-all duration-300 hover:scale-105 font-mono rounded-full px-6">Get Started</Button>
          </Link>
        </>}
      </div>

      <button
        className="md:hidden flex flex-col items-center justify-center gap-0.5 p-1 transition-transform active:scale-95"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <>
            <X className="h-5 w-5 text-foreground" />
            <span className="text-[10px] font-mono leading-none text-foreground uppercase tracking-wider">Close</span>
          </>
        ) : (
          <>
            <Repeat className="h-5 w-5 text-foreground" />
            <span className="text-[10px] font-mono leading-none text-foreground uppercase tracking-wider">Menu</span>
          </>
        )}
      </button>
    </div>

    {/* Premium Mobile Menu Overlay */}
    <div className={`fixed inset-x-0 top-[65px] h-[calc(100vh-65px)] bg-background/95 backdrop-blur-2xl transition-all duration-500 ease-in-out md:hidden ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'}`}>
      <div className="flex flex-col h-full p-6 overflow-y-auto">
        <div className="flex flex-col space-y-6">
          <a href="/#features" className="text-2xl font-mono font-medium text-foreground/80 hover:text-foreground hover:pl-2 transition-all duration-300 border-b border-border/40 pb-4" onClick={() => setIsOpen(false)}>
            Features
          </a>
          <a href="/#pricing" className="text-2xl font-mono font-medium text-foreground/80 hover:text-foreground hover:pl-2 transition-all duration-300 border-b border-border/40 pb-4" onClick={() => setIsOpen(false)}>
            Pricing
          </a>
          <Link to="/about" className="text-2xl font-mono font-medium text-foreground/80 hover:text-foreground hover:pl-2 transition-all duration-300 border-b border-border/40 pb-4" onClick={() => setIsOpen(false)}>
            About
          </Link>

          <a
            href="https://t.me/+TrNKLnH49UZkMWNk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl font-mono font-medium text-accent hover:text-accent/80 hover:pl-2 transition-all duration-300 border-b border-border/40 pb-4 flex items-center gap-2"
            onClick={() => setIsOpen(false)}
          >
            Join Community
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>

        <div className="mt-auto pb-8 space-y-4">
          {session ? (
            <>
              <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-lg font-mono h-12 border border-border/50">
                  Dashboard
                </Button>
              </Link>
              <Button onClick={() => {
                handleSignOut();
                setIsOpen(false);
              }} variant="outline" className="w-full text-lg font-mono h-12">
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-lg font-mono h-12 border border-border/50">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-accent hover:bg-accent/90 text-lg font-mono h-12 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  </nav>;
};
export default Navbar;