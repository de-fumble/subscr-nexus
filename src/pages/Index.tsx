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
  TrendingUp,
  Clock,
  DollarSign,
  Star,
  ArrowRight,
  Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import dashboardPreview from "@/assets/dashboard-preview.png";

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

  const stats = [
    { value: "99.9%", label: "Uptime Guarantee" },
    { value: "500+", label: "Active Businesses" },
    { value: "50K+", label: "Transactions Processed" },
    { value: "24/7", label: "Customer Support" },
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Create Your Account",
      description: "Sign up in seconds and access your dashboard immediately.",
    },
    {
      step: "2",
      title: "Set Up Plans",
      description: "Create subscription plans with custom pricing and intervals.",
    },
    {
      step: "3",
      title: "Share & Collect",
      description: "Share subscription links and start collecting payments automatically.",
    },
  ];

  const testimonials = [
    {
      quote: "Recurra transformed how we manage subscriptions. The analytics alone are worth it.",
      author: "Sarah Johnson",
      role: "CEO, TechStart",
      rating: 5,
    },
    {
      quote: "Best subscription management platform we've used. Simple, powerful, and reliable.",
      author: "Michael Chen",
      role: "Finance Director, EduCorp",
      rating: 5,
    },
    {
      quote: "The automated billing saved us countless hours. Highly recommend for any business.",
      author: "Emily Rodriguez",
      role: "Operations Manager, MediaFlow",
      rating: 5,
    },
  ];

  const pricingFeatures = [
    "Unlimited subscription plans",
    "Real-time analytics dashboard",
    "Automated billing & invoicing",
    "Subscriber management tools",
    "Payment gateway integration",
    "24/7 customer support",
    "Advanced reporting",
    "Custom branding options",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/20 via-background to-background animate-fade-in" />
        
        <div className="container relative mx-auto px-6">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold leading-tight text-foreground sm:text-6xl lg:text-7xl animate-fade-in">
              Subscription Management
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                So Simple, So Powerful
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl animate-fade-in">
              The most powerful, customizable and easy to integrate subscription billing software 
              used by hundreds of businesses worldwide to simplify revenue operations.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in">
              <Link to="/auth">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  Get Started - It's Free
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-primary px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                Book a Demo
              </Button>
            </div>
          </div>

          <div className="mt-20 rounded-2xl border border-border bg-card p-4 shadow-2xl transition-all duration-500 hover:shadow-3xl animate-fade-in">
            <img 
              src={dashboardPreview} 
              alt="Recurra Dashboard Preview - Analytics and subscription management interface" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center transition-all duration-300 hover:scale-110"
              >
                <div className="text-4xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-foreground">
              All the Power You Need
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
                  className="group p-8 transition-all duration-500 hover:shadow-2xl hover:border-accent/50 hover:-translate-y-2"
                >
                  <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 group-hover:bg-accent/20 transition-all duration-300 group-hover:scale-110">
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

      {/* How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid gap-12 md:grid-cols-3 max-w-5xl mx-auto">
            {howItWorks.map((item, index) => (
              <div
                key={index}
                className="text-center transition-all duration-500 hover:scale-105"
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground transition-all duration-300 hover:scale-110">
                  {item.step}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-foreground">
              Trusted by Businesses Worldwide
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See what our customers have to say
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
              >
                <div className="mb-4 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-accent text-accent"
                    />
                  ))}
                </div>
                <p className="mb-6 text-muted-foreground italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <h2 className="text-4xl font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to grow your subscription business
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="p-10 transition-all duration-500 hover:shadow-2xl hover:scale-105">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-foreground mb-2">
                  Professional Plan
                </h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-foreground">Free</span>
                  <span className="text-muted-foreground">to get started</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {pricingFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-accent flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to="/auth" className="block">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-primary-foreground">
            Ready to Transform Your Subscription Business?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/90 max-w-2xl mx-auto">
            Join hundreds of businesses already managing their subscriptions with Recurra. 
            Start your free trial today, no credit card required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3 transition-all duration-300 hover:scale-105">
              <img 
                src={logoImage} 
                alt="Recurra Logo" 
                className="h-10 w-10 object-cover rounded-xl"
              />
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
