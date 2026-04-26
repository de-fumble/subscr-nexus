import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, QrCode, Check, Download } from "lucide-react";
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
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleOpenPlansHub = () => window.open(plansHubUrl, "_blank");

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
    toast.success("QR Code downloaded");
  };

  return (
    <div className="rounded-lg border-none bg-[#0a2e2e] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-bold text-white">Your Plans Hub</h3>
        <p className="text-sm text-teal-100/70 mt-1">
          Share this link with your customers so they can browse and subscribe to your plans.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-64">
          <Input
            value={plansHubUrl}
            readOnly
            className="h-9 text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50 pr-10 focus-visible:ring-white/30"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="absolute right-0 top-0 h-9 w-9 text-white hover:text-white hover:bg-white/10"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 sm:flex-none h-9 font-medium bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" 
            onClick={handleOpenPlansHub}
          >
            Preview
          </Button>

          <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 shrink-0 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              >
                <QrCode className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Plans Hub QR Code</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="p-4 bg-white rounded-lg border">
                  <QRCodeSVG
                    id="plans-hub-qr-code"
                    value={plansHubUrl}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    Copy Link
                  </Button>
                  <Button className="flex-1" onClick={handleDownloadQR}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};