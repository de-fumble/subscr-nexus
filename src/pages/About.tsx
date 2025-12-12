import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Building2, Users, Target, Heart } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're committed to making subscription management accessible to businesses of all sizes.",
    },
    {
      icon: Users,
      title: "Customer-Centric",
      description: "Every feature we build starts with understanding our customers' real needs.",
    },
    {
      icon: Heart,
      title: "Reliability First",
      description: "We understand that payment processing is critical, so we prioritize uptime and security.",
    },
    {
      icon: Building2,
      title: "Enterprise Ready",
      description: "Built to scale with your business, from startups to large institutions.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">About Us</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground font-mono">
              Simplifying Subscriptions for Modern Businesses
            </h1>
            <p className="mt-6 text-lg text-muted-foreground font-mono">
              Recurra was built with a simple mission: make subscription management so easy that businesses can focus on what they do best.
            </p>
          </div>

          {/* Story */}
          <Card className="p-8 md:p-12 mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-4 font-mono">Our Story</h2>
            <div className="space-y-4 text-muted-foreground font-mono">
              <p>
                Recurra was founded by a team of developers and business professionals who experienced firsthand the challenges of managing recurring payments. We saw schools struggling to collect fees, cooperatives losing track of member contributions, and businesses spending hours on manual billing processes.
              </p>
              <p>
                We built Recurra to solve these problems. By integrating with Paystack's reliable payment infrastructure, we created a platform that automates the entire subscription lifecycle – from plan creation to payment collection to analytics.
              </p>
              <p>
                Today, Recurra serves businesses across various industries, helping them collect payments reliably and grow their subscription revenue with confidence.
              </p>
            </div>
          </Card>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center font-mono">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index} className="p-6 text-center">
                    <div className="inline-flex rounded-xl bg-accent/10 p-3 mb-4">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 font-mono">{value.title}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{value.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
