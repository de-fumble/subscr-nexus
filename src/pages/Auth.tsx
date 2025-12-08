import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Shield, Zap, BarChart3 } from "lucide-react";
import logoImage from "@/assets/logo.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Check if organization is suspended
        if (authData.user) {
          const { data: org } = await supabase
            .from("organizations")
            .select("is_suspended")
            .eq("user_id", authData.user.id)
            .single();

          if (org?.is_suspended) {
            navigate("/suspended");
            return;
          }
        }

        toast.success("Welcome back!");
      } else {
        if (!orgName.trim()) {
          toast.error("Organization name is required");
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              org_name: orgName,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track MRR, churn, and growth metrics",
    },
    {
      icon: Zap,
      title: "Instant Setup",
      description: "Get started in under 5 minutes",
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description: "Powered by Paystack's infrastructure",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-12 flex-col justify-between overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        
        {/* Top Content */}
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-12">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to home</span>
          </Link>
          
          <div className="flex items-center gap-3 mb-8">
            <img 
              src={logoImage} 
              alt="Recurra Logo" 
              className="h-12 w-12 object-cover rounded-xl"
            />
            <span className="text-2xl font-bold text-white">Recurra</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Subscription Management
            <span className="block text-white/90">Made Simple</span>
          </h1>
          
          <p className="text-lg text-white/70 max-w-md">
            Join hundreds of businesses managing their subscriptions with our powerful, easy-to-use platform.
          </p>
        </div>

        {/* Features */}
        <div className="relative space-y-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="relative">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Recurra. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Back to home</span>
            </Link>
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="Recurra Logo" 
                className="h-10 w-10 object-cover rounded-xl"
              />
              <span className="text-xl font-bold text-foreground">Recurra</span>
            </div>
          </div>

          <Card className="p-8 border-border/50 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {isLogin
                  ? "Sign in to manage your subscriptions"
                  : "Get started with your free account"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-sm font-medium">
                    Organization Name
                  </Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Acme Inc."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  minLength={6}
                  className="h-12"
                />
                {!isLogin && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-accent/20"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </>
                ) : (
                  <>{isLogin ? "Sign In" : "Create Account"}</>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </Card>

          {/* Trust Badge */}
          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" />
              Secured & Powered by Paystack
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;