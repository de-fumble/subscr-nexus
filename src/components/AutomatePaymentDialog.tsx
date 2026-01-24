import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Zap, 
  Church, 
  Home, 
  GraduationCap, 
  Users,
  ArrowLeft,
  Check,
  Clock
} from "lucide-react";

interface AutomatePaymentDialogProps {
  children: React.ReactNode;
}

type PaymentType = "tithe" | "rent" | "school_fees" | "cooperative" | null;
type Duration = "6_months" | "1_year" | "2_years" | "3_years" | "tbd" | null;

const paymentTypes = [
  { id: "tithe" as const, label: "Tithe", icon: Church, description: "Automate your tithe payments" },
  { id: "rent" as const, label: "Rent (Savings)", icon: Home, description: "Save towards rent payments" },
  { id: "school_fees" as const, label: "School Fees", icon: GraduationCap, description: "Save toward education goals" },
  { id: "cooperative" as const, label: "Co-operative", icon: Users, description: "Cooperative contribution" },
];

const durations = [
  { id: "6_months" as const, label: "6 Months" },
  { id: "1_year" as const, label: "1 Year" },
  { id: "2_years" as const, label: "2 Years" },
  { id: "3_years" as const, label: "3 Years" },
  { id: "tbd" as const, label: "To Be Determined" },
];

export const AutomatePaymentDialog = ({ children }: AutomatePaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<PaymentType>(null);
  const [selectedDuration, setSelectedDuration] = useState<Duration>(null);

  const handleTypeSelect = (type: PaymentType) => {
    setSelectedType(type);
    setStep(2);
  };

  const handleDurationSelect = (duration: Duration) => {
    setSelectedDuration(duration);
    // For now, show a success message - this can be expanded later
    const typeLabel = paymentTypes.find(t => t.id === selectedType)?.label;
    const durationLabel = durations.find(d => d.id === duration)?.label;
    
    toast.success(`Automation set up for ${typeLabel} - ${durationLabel}`, {
      description: "You'll be notified when this feature is fully available.",
    });
    
    // Reset and close
    resetDialog();
  };

  const resetDialog = () => {
    setOpen(false);
    setStep(1);
    setSelectedType(null);
    setSelectedDuration(null);
  };

  const goBack = () => {
    setStep(1);
    setSelectedType(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setStep(1);
        setSelectedType(null);
        setSelectedDuration(null);
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 2 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Zap className="h-5 w-5 text-accent" />
            {step === 1 ? "Automate Payment" : "Select Duration"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              What type of payment would you like to automate?
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {paymentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-accent/50 hover:bg-muted/50 transition-all text-center"
                  >
                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              How long would you like to automate this payment for?
            </p>
            
            <div className="space-y-2">
              {durations.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => handleDurationSelect(duration.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent/50 hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                      {duration.id === "tbd" ? (
                        <Clock className="h-5 w-5 text-accent" />
                      ) : (
                        <Check className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <span className="font-medium">{duration.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              You can change this later in your settings
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
