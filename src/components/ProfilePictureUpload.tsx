import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfilePictureUploadProps {
  currentLogoUrl?: string | null;
  orgName: string;
  onUploadComplete: (url: string) => void;
}

export function ProfilePictureUpload({ 
  currentLogoUrl, 
  orgName, 
  onUploadComplete 
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete old file if exists
      await supabase.storage
        .from('org-logos')
        .remove([`${user.id}/logo.png`, `${user.id}/logo.jpg`, `${user.id}/logo.jpeg`, `${user.id}/logo.webp`]);

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('org-logos')
        .getPublicUrl(fileName);

      // Update organization with logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast.success("Profile picture updated");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <Avatar className="h-24 w-24 ring-4 ring-accent/20 ring-offset-2 ring-offset-background transition-all group-hover:ring-accent/40">
        <AvatarImage src={currentLogoUrl || undefined} alt={orgName} />
        <AvatarFallback className="bg-gradient-to-br from-accent to-accent/70 text-accent-foreground text-3xl font-bold">
          {orgName?.charAt(0).toUpperCase() || "O"}
        </AvatarFallback>
      </Avatar>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      
      <Button
        size="icon"
        variant="secondary"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-lg transition-transform group-hover:scale-110"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
