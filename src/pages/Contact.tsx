import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoLink = `mailto:Recurrra@outlook.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`;
    window.location.href = mailtoLink;
    toast({
      title: "Opening email client",
      description: "Your default email client will open to send the message.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Contact</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground">
              Get in Touch
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Have a question or need help? We'd love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-accent/10 p-3">
                    <Mail className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email Us</h3>
                    <a href="mailto:Recurrra@outlook.com" className="text-muted-foreground hover:text-accent">
                      Recurrra@outlook.com
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-accent/10 p-3">
                    <Phone className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Call Us</h3>
                    <a href="tel:+2348101751349" className="text-muted-foreground hover:text-accent">
                      +234 810-175-1349
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-accent/10 p-3">
                    <MapPin className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Location</h3>
                    <p className="text-muted-foreground">Lagos, Nigeria</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Contact Form */}
            <Card className="p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="">Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className=""
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className=""
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject" className="">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="How can we help?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className=""
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Your message..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    className="min-h-[120px] resize-none"
                  />
                </div>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
