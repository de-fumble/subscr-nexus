import React from "react";
import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-center"
      expand={false}
      richColors={false}
      closeButton={false}
      visibleToasts={2}
      gap={10}
      offset={20}
      className="apple-toaster"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: [
            // Base — pill / dynamic island feel
            "apple-toast",
            "group",
          ].join(" "),
          title: "apple-toast-title",
          description: "apple-toast-description",
          success: "apple-toast--success",
          error: "apple-toast--error",
          warning: "apple-toast--warning",
          info: "apple-toast--info",
          loading: "apple-toast--loading",
          actionButton: "apple-toast-action",
          cancelButton: "apple-toast-cancel",
        },
      }}
      icons={{
        success: (
          <span className="apple-toast-icon apple-toast-icon--success">
            <CheckCircle2 strokeWidth={2} />
          </span>
        ),
        error: (
          <span className="apple-toast-icon apple-toast-icon--error">
            <AlertCircle strokeWidth={2} />
          </span>
        ),
        warning: (
          <span className="apple-toast-icon apple-toast-icon--warning">
            <AlertTriangle strokeWidth={2} />
          </span>
        ),
        info: (
          <span className="apple-toast-icon apple-toast-icon--info">
            <Info strokeWidth={2} />
          </span>
        ),
        loading: (
          <span className="apple-toast-icon apple-toast-icon--loading">
            <Loader2 strokeWidth={2} className="apple-spinner" />
          </span>
        ),
      }}
      {...props}
    />
  );
};

export { Toaster };
