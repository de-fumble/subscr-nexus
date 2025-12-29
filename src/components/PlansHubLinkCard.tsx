import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, QrCode, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface PlansHubLinkCardProps {
  orgId: string;
  orgName: string;
}

export const PlansHubLinkCard = ({ orgId, orgName }: PlansHubLinkCardProps) => {
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const plansHubUrl = `${window.location.origin}/plans-hub/${orgId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plansHubUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenPlansHub = () => {
    window.open(plansHubUrl, "_blank");
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("plans-hub-qr-code");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${orgName.replace(/\s+/g, "-").toLowerCase()}-plans-hub-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    toast.success("QR Code downloaded!");
  };

  return (
    <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-accent" />
          Your Plans Hub Link
        </CardTitle>
        <CardDescription>
          Share this link with your customers to view your plans and payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={plansHubUrl}
            readOnly
            className="bg-muted/50 font-mono text-sm"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleOpenPlansHub}
          >
            <ExternalLink className="h-4 w-4" />
            Open Plans Hub
          </Button>

          <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">Plans Hub QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-6 py-6">
                <div className="p-4 bg-white rounded-xl shadow-lg">
                  <QRCodeSVG
                    id="plans-hub-qr-code"
                    value={plansHubUrl}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Scan this QR code to visit {orgName}'s Plans Hub
                </p>
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    className="flex-1 bg-accent hover:bg-accent/90"
                    onClick={handleDownloadQR}
                  >
                    Download QR
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};