import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Newspaper, Download, Mail } from "lucide-react";

const Press = () => {
  const pressReleases = [
    {
      date: "December 2024",
      title: "Recurra Launches Enterprise Subscription Management Platform",
      description: "New platform helps schools and cooperatives automate their billing processes.",
    },
    {
      date: "November 2024",
      title: "Recurra Partners with Leading Financial Institutions",
      description: "Strategic partnerships expand payment processing capabilities across Africa.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Press</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground font-mono">
              News & Media
            </h1>
            <p className="mt-6 text-lg text-muted-foreground font-mono">
              Get the latest news about Recurra, including press releases, media coverage, and company announcements.
            </p>
          </div>

          {/* Media Contact */}
          <Card className="p-8 mb-16 text-center">
            <Mail className="h-8 w-8 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2 font-mono">Media Inquiries</h2>
            <p className="text-muted-foreground font-mono mb-4">
              For press inquiries, please contact our media team at:
            </p>
            <a href="mailto:Nebulatech.innovations@outlook.com" className="text-accent hover:underline font-mono">
              Nebulatech.innovations@outlook.com
            </a>
          </Card>

          {/* Press Releases */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-8 font-mono flex items-center gap-2">
              <Newspaper className="h-6 w-6 text-accent" />
              Press Releases
            </h2>
            <div className="space-y-4">
              {pressReleases.map((release, index) => (
                <Card key={index} className="p-6 hover:border-accent/30 transition-colors">
                  <span className="text-sm text-accent font-mono">{release.date}</span>
                  <h3 className="text-lg font-semibold text-foreground mt-1 font-mono">{release.title}</h3>
                  <p className="text-muted-foreground font-mono mt-2">{release.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Brand Assets */}
          <Card className="p-8 mt-16">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground font-mono">Brand Assets</h2>
                <p className="text-muted-foreground font-mono mt-1">
                  Download our logo, brand guidelines, and media kit.
                </p>
              </div>
              <Button variant="outline" className="font-mono">
                <Download className="mr-2 h-4 w-4" />
                Download Media Kit
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Press;
