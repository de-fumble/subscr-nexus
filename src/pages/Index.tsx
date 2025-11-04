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
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background" />
        
        <div className="container relative mx-auto px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold leading-tight text-foreground sm:text-6xl lg:text-7xl">
              Smart Subscription
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Management Platform
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Recurra helps institutions and businesses manage recurring payments,
              monitor subscriber activities, and gain actionable insights through
              powerful analytics—all powered by Paystack.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-semibold"
                >
                  Get Started Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-primary px-8 py-6 text-lg font-semibold"
              >
                View Demo
              </Button>
            </div>
          </div>

          <div className="mt-20 rounded-2xl border border-border bg-card p-4 shadow-2xl">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="mx-auto h-20 w-20 text-accent mb-4" />
                <p className="text-muted-foreground">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-foreground">
              Everything you need to manage subscriptions
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed for institutions and businesses
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group p-8 transition-all duration-300 hover:shadow-lg hover:border-accent/50"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 group-hover:bg-accent/20 transition-colors">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-primary to-primary/80 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/90">
            Join institutions and businesses managing subscriptions with Recurra
          </p>
          <div className="mt-10">
            <Link to="/dashboard">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-semibold"
              >
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                <span className="text-sm font-bold text-primary-foreground">
                  R
                </span>
              </div>
              <span className="text-lg font-bold text-foreground">Recurra</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Recurra. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
