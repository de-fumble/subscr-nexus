import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface MaskedApiKeyProps {
  value: string | null;
  onChange: (value: string) => void;
  onRegenerate?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showRegenerateButton?: boolean;
}

export function MaskedApiKey({
  value,
  onChange,
  onRegenerate,
  label,
  placeholder = "Enter API key",
  disabled = false,
  showRegenerateButton = false,
}: MaskedApiKeyProps) {
  const [isEditing, setIsEditing] = useState(!value);
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  // Mask the key showing only last 4 characters
  const getMaskedValue = (key: string | null) => {
    if (!key) return "";
    if (key.length <= 8) return "•".repeat(key.length);
    return "•".repeat(key.length - 4) + key.slice(-4);
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Input
          type={showFull ? "text" : "password"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="glass-card border-border/50"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowFull(!showFull)}
          >
            {showFull ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              Save
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg font-mono text-sm text-muted-foreground">
        {showFull ? value : getMaskedValue(value)}
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowFull(!showFull)}
          className="h-8 w-8"
        >
          {showFull ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          className="h-8 w-8"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        {showRegenerateButton && onRegenerate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="ml-2"
          >
            Regenerate
          </Button>
        )}
      </div>
    </div>
  );
}
