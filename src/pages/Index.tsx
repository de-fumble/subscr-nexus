import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BarChart3,
  Users,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";

const Index = () => {
  const features = [
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description:
        "Track MRR, churn rate, and subscriber growth with beautiful, real-time analytics.",
    },
    {
      icon: RefreshCw,
      title: "Automated Billing",
      description:
        "Set up recurring payments once and let Paystack handle the rest automatically.",
    },
    {
      icon: Users,
      title: "Subscriber Management",
      description:
        "Manage all your subscribers, view payment history, and handle cancellations with ease.",
    },
    {
      icon: Shield,
      title: "Secure Payments",
      description:
        "Built on Paystack's secure infrastructure with industry-standard encryption.",
    },
    {
      icon: Zap,
      title: "Quick Integration",
      description:
        "Get started in minutes with our simple setup process and shareable subscription links.",
    },
    {
      icon: CheckCircle,
      title: "Plan Flexibility",
      description:
        "Create unlimited plans with custom pricing, intervals, and features.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />

      <section className="relative overflow-hidden pt-32 pb-24">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-6">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-block mb-6 rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent shadow-soft">
              Powered by Paystack
            </div>
            <h1 className="text-6xl font-bold leading-tight text-foreground sm:text-7xl lg:text-8xl mb-8 tracking-tight">
              Enterprise-Grade
              <br />
              <span className="gradient-text">
                Subscription Platform
              </span>
            </h1>
            <p className="mt-8 text-xl text-muted-foreground sm:text-2xl max-w-3xl mx-auto leading-relaxed">
              Recurra empowers institutions and businesses to effortlessly manage recurring payments,
              monitor subscriber activities, and unlock actionable insights through
              powerful analytics.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link to="/auth">
                <Button
                  size="lg"
                  variant="premium"
                  className="px-12 py-7 text-lg font-bold"
                >
                  Start Free Trial
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="px-12 py-7 text-lg font-semibold"
              >
                Schedule Demo
              </Button>
            </div>
          </div>

          <div className="mt-24 rounded-2xl border-2 border-border/30 bg-card/50 backdrop-blur-xl p-6 shadow-elegant hover:shadow-glow transition-all duration-500">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
              <div className="text-center relative z-10">
                <BarChart3 className="mx-auto h-24 w-24 text-accent mb-6 drop-shadow-lg" />
                <p className="text-lg font-semibold text-foreground">Premium Dashboard Preview</p>
                <p className="text-sm text-muted-foreground mt-2">Real-time analytics & insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
        <div className="container mx-auto px-6 relative">
          <div className="mb-20 text-center">
            <h2 className="text-5xl font-bold text-foreground mb-6">
              Everything you need to scale
            </h2>
            <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
              Enterprise-ready features designed for institutions and businesses
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group p-8 transition-all duration-500 hover:shadow-elegant hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mb-6 inline-flex rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 p-4 group-hover:from-accent/20 group-hover:to-accent/10 transition-all duration-300 shadow-soft group-hover:shadow-medium">
                    <Icon className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-foreground group-hover:text-accent transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-5xl font-bold text-white mb-6">
            Ready to transform your business?
          </h2>
          <p className="mt-4 text-xl text-white/90 max-w-2xl mx-auto mb-12">
            Join forward-thinking institutions managing subscriptions with Recurra
          </p>
          <div className="mt-10">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 px-12 py-7 text-lg font-bold shadow-elegant hover:shadow-glow transition-all hover:scale-105"
              >
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-16 bg-gradient-subtle">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-accent to-accent-deep p-2.5 shadow-medium">
                <img 
                  src={logoImage} 
                  alt="Recurra Logo" 
                  className="h-8 w-8 object-contain brightness-0 invert"
                />
              </div>
              <span className="text-2xl font-bold gradient-text">Recurra</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Recurra. Enterprise subscription management platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
