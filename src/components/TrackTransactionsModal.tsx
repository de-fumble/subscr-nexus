import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, MailCheck, ShieldCheck, Mail, Hash } from "lucide-react";

type Mode = "profile" | "email";

export function TrackTransactionsModal({
  children,
  open: controlledOpen,
  onOpenChange
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (val: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("profile");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = onOpenChange || setUncontrolledOpen;

  const handleOpenChange = (val: boolean) => {
    setIsOpen(val);
    if (!val) {
      setTimeout(() => {
        setValue("");
        setSuccess(false);
        setMode("profile");
      }, 300);
    }
  };

  const handleModeSwitch = (newMode: Mode) => {
    setMode(newMode);
    setValue("");
  };

  const isValid = () => {
    if (mode === "profile") return value.trim().length === 4;
    if (mode === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    return false;
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) {
      toast.error(mode === "profile" ? "Profile ID must be exactly 4 characters." : "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const body = mode === "profile"
        ? { profile_number: value.trim().toUpperCase() }
        : { email: value.trim().toLowerCase() };

      const { data, error } = await supabase.functions.invoke("track-profile-transactions", {
        body,
      });

      if (error) throw new Error(error.message || "Network error occurred.");
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast.success("Statement Generated", {
        description: "Your complete financial statement has been sent to your registered inbox.",
      });

      setTimeout(() => handleOpenChange(false), 4000);
    } catch (error: any) {
      toast.error("Request Failed", {
        description: error.message || "Could not find your profile or generate a statement.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] p-0 overflow-hidden border-border/40 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/90 to-background/50 pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <DialogHeader className="mb-6">
            <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-accent/20">
              <Search className="w-6 h-6 text-accent" />
            </div>
            <DialogTitle className="text-2xl font-bold font-mono tracking-tight">
              Track Transactions
            </DialogTitle>
            <DialogDescription className="text-sm mt-1 text-muted-foreground">
              Retrieve a full financial statement and receive it at your registered email address.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center ring-4 ring-emerald-500/20">
                <MailCheck className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground font-mono">Statement Dispatched</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
                  Your full transaction history has been forwarded securely to your registered inbox.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleTrack} className="space-y-5">
              {/* Mode Toggle */}
              <div className="flex rounded-xl border border-border/50 overflow-hidden bg-muted/30 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => handleModeSwitch("profile")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-mono font-medium transition-all duration-200 ${
                    mode === "profile"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  Profile ID
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-mono font-medium transition-all duration-200 ${
                    mode === "email"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>

              {/* Input */}
              <div className="relative">
                {mode === "profile" ? (
                  <>
                    <Input
                      key="profile"
                      type="text"
                      placeholder="e.g. 1A2B"
                      value={value}
                      onChange={(e) => setValue(e.target.value.toUpperCase().slice(0, 4))}
                      className="h-14 text-lg pl-6 pr-12 font-mono tracking-widest uppercase bg-muted/40 border-border/50 focus:border-accent transition-colors text-center"
                      maxLength={4}
                      autoComplete="off"
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <ShieldCheck className="w-5 h-5 opacity-40" />
                    </div>
                  </>
                ) : (
                  <>
                    <Input
                      key="email"
                      type="email"
                      placeholder="your@email.com"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="h-14 text-base pl-6 pr-12 font-mono bg-muted/40 border-border/50 focus:border-accent transition-colors"
                      autoComplete="email"
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Mail className="w-5 h-5 opacity-40" />
                    </div>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center px-2">
                {mode === "profile"
                  ? "Your Profile ID is the 4-character code assigned to your Recurra billing profile."
                  : "Enter the email address associated with your payments across Recurra-powered platforms."}
              </p>

              <Button
                type="submit"
                className="w-full h-13 text-base font-medium rounded-xl"
                disabled={loading || !isValid()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  "Retrieve Statement"
                )}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
