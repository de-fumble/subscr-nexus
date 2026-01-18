import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SendNotificationDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please provide both title and message");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Get all organizations
      const { data: organizations, error: orgError } = await supabase
        .from("organizations")
        .select("id");

      if (orgError) throw orgError;

      if (!organizations || organizations.length === 0) {
        toast.error("No organizations found");
        return;
      }

      // Create notifications for all organizations
      const notifications = organizations.map((org) => ({
        org_id: org.id,
        title: title.trim(),
        message: message.trim(),
        created_by: user.id,
      }));

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) throw insertError;

      toast.success(`Notification sent to ${organizations.length} organization(s)`);
      setTitle("");
      setMessage("");
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending notification:", error);
      toast.error(error.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Notification to All Organizations</DialogTitle>
          <DialogDescription>
            Send a notification message that will appear in all organization dashboards.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Notification title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Notification message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Notification"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
