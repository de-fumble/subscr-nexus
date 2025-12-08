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
  Star,
  ArrowRight,
  Check,
  Building2,
  Globe,
  Lock,
  Mail,
  Phone,
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
    { value: "50+", label: "Active Businesses" },
    { value: "100+", label: "Transactions Processed" },
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

  const footerLinks = {
    product: [
      { name: "Features", href: "#features" },
      { name: "Pricing", href: "#pricing" },
      { name: "Integrations", href: "#" },
      { name: "API Documentation", href: "#" },
    ],
    company: [
      { name: "About Us", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Press", href: "#" },
      { name: "Contact", href: "#" },
    ],
    resources: [
      { name: "Blog", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "Community", href: "#" },
      { name: "Status", href: "#" },
    ],
    legal: [
      { name: "Privacy Policy", href: "#" },
      { name: "Terms of Service", href: "#" },
      { name: "Cookie Policy", href: "#" },
      { name: "GDPR", href: "#" },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section - Premium Split Layout */}
      <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-sm font-medium text-accent">Trusted by leading institutions</span>
              </div>
              
              <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-in">
                Subscription Management
                <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  So Simple, So Powerful
                </span>
              </h1>
              
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in">
                The most powerful, customizable and easy to integrate subscription billing software 
                used by hundreds of businesses worldwide to simplify revenue operations.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4 animate-fade-in">
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent/20"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-border hover:border-accent/50 px-8 py-6 text-lg font-semibold transition-all duration-300 hover:bg-accent/5"
                >
                  Book a Demo
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-10 pt-8 border-t border-border/50 animate-fade-in">
                <p className="text-sm text-muted-foreground mb-4">Powering subscriptions for</p>
                <div className="flex items-center gap-8 opacity-60">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <span className="text-sm font-medium">Schools</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium">Cooperatives</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm font-medium">Enterprises</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Dashboard Preview */}
            <div className="order-1 lg:order-2 animate-fade-in">
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-2xl opacity-50" />
                
                {/* Main Preview */}
                <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-3 shadow-2xl">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <img 
                    src={dashboardPreview} 
                    alt="Recurra Dashboard Preview - Analytics and subscription management interface" 
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Floating Cards */}
      <section className="py-16 relative">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-card border border-border/50 text-center transition-all duration-500 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid Style */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
        
        <div className="container relative mx-auto px-6">
          <div className="max-w-2xl mx-auto mb-16 text-center">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Features</span>
            <h2 className="mt-4 text-4xl font-bold text-foreground">
              All the Power You Need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed for institutions and businesses
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="group relative p-8 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-accent/30 hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative">
                    <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 group-hover:bg-accent/20 transition-all duration-300">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section - Timeline Style */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto mb-16 text-center">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Process</span>
            <h2 className="mt-4 text-4xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Get started in three simple steps
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-accent/20 via-accent to-accent/20" />
              
              {howItWorks.map((item, index) => (
                <div
                  key={index}
                  className="relative text-center transition-all duration-500 hover:scale-105"
                >
                  <div className="relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 text-2xl font-bold text-accent-foreground shadow-lg shadow-accent/20">
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
        </div>
      </section>

      {/* Testimonials Section - Modern Cards */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto mb-16 text-center">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="mt-4 text-4xl font-bold text-foreground">
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
                className="group p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-accent/30"
              >
                <div className="mb-6 flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-accent text-accent"
                    />
                  ))}
                </div>
                <p className="mb-6 text-muted-foreground italic text-lg leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="pt-4 border-t border-border/50">
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

      {/* Pricing Section - Premium Card */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto mb-16 text-center">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">Pricing</span>
            <h2 className="mt-4 text-4xl font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to grow your subscription business
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="relative p-10 overflow-hidden transition-all duration-500 hover:shadow-2xl border-accent/20">
              {/* Premium Badge */}
              <div className="absolute top-6 right-6">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/20">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-foreground mb-2">
                  Professional Plan
                </h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-foreground">Free</span>
                  <span className="text-muted-foreground">to get started</span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {pricingFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              <Link to="/auth" className="block">
                <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/20">
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section - Gradient Background */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/30 via-transparent to-transparent" />
        
        <div className="container relative mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground max-w-3xl mx-auto">
            Ready to Transform Your Subscription Business?
          </h2>
          <p className="mt-6 text-lg text-primary-foreground/90 max-w-2xl mx-auto">
            Join hundreds of businesses already managing their subscriptions with Recurra. 
            Start your free trial today, no credit card required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold transition-all duration-300"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Enterprise Footer */}
      <footer className="bg-card border-t border-border">
        {/* Main Footer Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src={logoImage} 
                  alt="Recurra Logo" 
                  className="h-10 w-10 object-cover rounded-xl"
                />
                <span className="text-xl font-bold text-foreground">Recurra</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xs">
                The most powerful subscription management platform for modern businesses and institutions.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-3">
                {footerLinks.resources.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border">
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Recurra. All rights reserved.
              </p>
              
              {/* Powered by Paystack */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Secured & Powered by</span>
                <span className="font-semibold text-foreground">Paystack</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;