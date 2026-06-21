import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

function getIcon(variant?: "default" | "destructive") {
  if (variant === "destructive") {
    return (
      <span className="apple-toast-icon apple-toast-icon--error shrink-0">
        <AlertCircle strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="apple-toast-icon apple-toast-icon--success shrink-0">
      <CheckCircle2 strokeWidth={2} />
    </span>
  );
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="up">
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            {getIcon(variant)}
            <div className="flex-1 min-w-0">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
