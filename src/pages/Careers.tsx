import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";

const Careers = () => {
  const openPositions = [
    {
      title: "Senior Backend Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Full-time",
    },
    {
      title: "Customer Success Manager",
      department: "Operations",
      location: "Lagos, Nigeria",
      type: "Full-time",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Careers</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground font-mono">
              Join Our Team
            </h1>
            <p className="mt-6 text-lg text-muted-foreground font-mono">
              Help us build the future of subscription management. We're always looking for talented individuals who share our passion for great products.
            </p>
          </div>

          {/* Why Join */}
          <Card className="p-8 md:p-12 mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-4 font-mono">Why Join Recurra?</h2>
            <div className="grid md:grid-cols-3 gap-6 text-muted-foreground font-mono">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Remote-First Culture</h3>
                <p className="text-sm">Work from anywhere in the world with flexible hours that suit your lifestyle.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Impactful Work</h3>
                <p className="text-sm">Your contributions directly help businesses manage their finances better.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Growth Opportunities</h3>
                <p className="text-sm">We invest in our team's professional development and career growth.</p>
              </div>
            </div>
          </Card>

          {/* Open Positions */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-8 font-mono">Open Positions</h2>
            <div className="space-y-4">
              {openPositions.map((position, index) => (
                <Card key={index} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-accent/30 transition-colors">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground font-mono">{position.title}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground font-mono">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" className="font-mono">
                    Apply Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Careers;
