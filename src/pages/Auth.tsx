import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Shield, Zap, BarChart3, Building2, User, Mail } from "lucide-react";
import logoImage from "@/assets/logo.svg";
import { logAuditEvent } from "@/utils/auditLogger";
type AccountType = "institution" | "user";
type AuthMode = "login" | "signup" | "forgot-password";
const Auth = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [accountType, setAccountType] = useState<AccountType>("institution");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        // Check user type and redirect accordingly
        const userType = session.user.user_metadata?.user_type;
        if (userType === "user") {
          navigate("/user-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    };
    checkUser();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !isSigningUp) {
        const userType = session.user.user_metadata?.user_type;
        if (userType === "user") {
          navigate("/user-dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, isSigningUp]);
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (authMode === "forgot-password") {
        // Use custom Resend-powered reset email
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reset-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ email, clientOrigin: window.location.origin }),
          }
        );
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to send reset email");
        setResetEmailSent(true);
        toast.success("Password reset email sent! Check your inbox.");
        return;
      }
      if (authMode === "login") {
        const {
          data: authData,
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
          return;
        }

        // Check user type for proper routing
        const userType = authData.user?.user_metadata?.user_type;
        // Reset theme to light mode on login so it always starts fresh
        localStorage.removeItem("vite-ui-theme");

        if (userType === "user") {
          toast.success("Welcome back!");
          navigate("/user-dashboard");
        } else {
          // Check if organization is suspended and get ID for audit log
          const {
            data: org
          } = await supabase.from("organizations").select("id, is_suspended").eq("user_id", authData.user.id).maybeSingle();
          if (org?.is_suspended) {
            navigate("/suspended");
            return;
          }
          // Send login notification email (fire-and-forget, org owners only)
          supabase.functions.invoke("send-notification-email", {
            body: { event_type: "login" }
          }).catch(() => { });

          if (org?.id) {
            await logAuditEvent("login", "organization", org.id, "auth", { email: authData.user.email }, "Owner");
          }

          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      } else {
        // Signup flow
        if (accountType === "institution") {
          if (!orgName.trim()) {
            toast.error("Organization name is required");
            return;
          }
          setIsSigningUp(true);
          const {
            data: signupData,
            error
          } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
              data: {
                org_name: orgName,
                user_type: "institution"
              }
            }
          });
          if (error) {
            if (error.message.includes("already registered")) {
              toast.error("This email is already registered");
            } else {
              toast.error(error.message);
            }
            return;
          }

          const newUserId = signupData.user?.id;
          const sessionToken = signupData.session?.access_token;
          if (newUserId) {
            // Send OTP for email verification (no auth needed)
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ email, user_id: newUserId }),
              }
            );
            // Send signup notification email using the session token before signing out
            if (sessionToken) {
              fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification-email`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                    Authorization: `Bearer ${sessionToken}`,
                  },
                  body: JSON.stringify({ event_type: "signup" }),
                }
              ).catch(() => { });
            }
          }

          toast.success("Account created! Please verify your email.");
          // Sign out to prevent auto-login before verification
          await supabase.auth.signOut();
          navigate(`/verify-otp?email=${encodeURIComponent(email)}&uid=${newUserId}`);
          return;
        } else {
          // User account signup
          setIsSigningUp(true);
          const {
            data: userSignupData,
            error
          } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/user-dashboard`,
              data: {
                full_name: fullName,
                user_type: "user",
                is_staff: true
              }
            }
          });
          if (error) {
            if (error.message.includes("already registered")) {
              toast.error("This email is already registered");
            } else {
              toast.error(error.message);
            }
            return;
          }

          const newUserId = userSignupData.user?.id;
          if (newUserId) {
            // Send OTP for email verification
            await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-otp`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ email, user_id: newUserId }),
              }
            );
          }

          toast.success("Account created! Please verify your email.");
          await supabase.auth.signOut();
          navigate(`/verify-otp?email=${encodeURIComponent(email)}&uid=${newUserId}`);
          return;
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  const features = [{
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track MRR, churn, and growth metrics"
  }, {
    icon: Zap,
    title: "Instant Setup",
    description: "Get started in under 5 minutes"
  }, {
    icon: Shield,
    title: "Secure Payments",
    description: "Powered by Paystack's infrastructure"
  }];
  if (authMode === "forgot-password" && resetEmailSent) {
    return <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
        <p className="text-muted-foreground mb-6">
          We've sent a password reset link to <strong>{email}</strong>
        </p>
        <Button variant="outline" onClick={() => {
          setAuthMode("login");
          setResetEmailSent(false);
        }} className="w-full">
          Back to Login
        </Button>
      </Card>
    </div>;
  }
  return <div className="min-h-screen flex">
    {/* Left Panel - Branding */}
    <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-12 flex-col justify-between overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />

      <div className="relative">
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-12">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to home</span>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <img src={logoImage} alt="Recurra Logo" className="h-12 w-12 object-cover rounded-xl" />
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

      <div className="relative space-y-6">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return <div key={index} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-white/70">{feature.description}</p>
            </div>
          </div>;
        })}
      </div>

      <div className="relative">
        <p className="text-sm text-white/50">
          © {new Date().getFullYear()} Recurra. All rights reserved.
        </p>
      </div>
    </div>

    {/* Right Panel - Form */}
    <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-6 lg:p-12 bg-background relative">
      {/* Mobile: subtle gradient accent at top */}
      <div className="lg:hidden absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Mobile Logo & Branding */}
        <div className="lg:hidden mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs font-mono mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <img src={logoImage} alt="Recurra Logo" className="h-11 w-11 object-cover rounded-xl shadow-md" />
            <span className="text-xl font-bold text-foreground font-mono">Recurra</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Automated Billing made simple
          </p>
        </div>

        <Card className="p-6 sm:p-8 border-border/50 shadow-xl rounded-2xl">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground font-mono">
              {authMode === "forgot-password" ? "Reset Password" : authMode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground font-mono">
              {authMode === "forgot-password" ? "Enter your email to receive a reset link" : authMode === "login" ? "Sign in to continue" : "Get started with your free account"}
            </p>
          </div>

          {/* Account Type Selector (only for signup) */}
          {/* HIDING FOR NOW AS REQUESTED - WE DO NOT NEED USER ACCOUNTS YET */}
          {false && authMode === "signup" && <div className="mb-6">
            <Label className="text-sm font-medium mb-3 block font-mono">Account Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setAccountType("institution")} className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${accountType === "institution" ? "border-accent bg-accent/10 shadow-sm shadow-accent/10" : "border-border hover:border-accent/50"}`}>
                <Building2 className={`h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1.5 ${accountType === "institution" ? "text-accent" : "text-muted-foreground"}`} />
                <p className="text-sm font-semibold font-mono">Institution</p>
                <p className="text-[10px] text-muted-foreground font-mono">Manage Revenue</p>
              </button>
              <button type="button" onClick={() => setAccountType("user")} className={`p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 ${accountType === "user" ? "border-accent bg-accent/10 shadow-sm shadow-accent/10" : "border-border hover:border-accent/50"}`}>
                <User className={`h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-1.5 ${accountType === "user" ? "text-accent" : "text-muted-foreground"}`} />
                <p className="text-sm font-semibold font-mono">User</p>
                <p className="text-[10px] text-muted-foreground font-mono">Track Billing</p>
              </button>
            </div>
          </div>}

          <form onSubmit={handleAuth} className="space-y-5">
            {authMode === "signup" && accountType === "institution" && <div className="space-y-2">
              <Label htmlFor="orgName" className="text-sm font-medium">
                Organization Name
              </Label>
              <Input id="orgName" type="text" placeholder="Acme Inc." value={orgName} onChange={e => setOrgName(e.target.value)} required disabled={isLoading} className="h-12" />
            </div>}

            {authMode === "signup" && accountType === "user" && <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </Label>
              <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={isLoading} className="h-12" />
            </div>}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} className="h-12" />
            </div>

            {authMode !== "forgot-password" && <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} minLength={6} className="h-12" />
              {authMode === "signup" && <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>}
            </div>}

            {authMode === "login" && <button type="button" onClick={() => setAuthMode("forgot-password")} className="text-sm text-accent hover:text-accent/80 transition-colors">
              Forgot your password?
            </button>}

            <Button type="submit" className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold font-mono rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.01]" disabled={isLoading}>
              {isLoading ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {authMode === "forgot-password" ? "Sending..." : authMode === "login" ? "Signing in..." : "Creating account..."}
              </> : <>
                {authMode === "forgot-password" ? "Send Reset Link" : authMode === "login" ? "Sign In" : "Create Account"}
              </>}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {authMode === "forgot-password" ? <button type="button" onClick={() => setAuthMode("login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono" disabled={isLoading}>
              Back to login
            </button> : <button type="button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-mono" disabled={isLoading}>
              {authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>}
          </div>
        </Card>

        {/* Trust signals */}
        <div className="mt-6">
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secured by Paystack</span>
            <span className="w-px h-3 bg-border" />
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Instant Setup</span>
          </div>
        </div>
      </div>
    </div>
  </div>;
};
export default Auth;