import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart3, Users, Shield, Zap, RefreshCw, CheckCircle, Star, ArrowRight, Check, Building2, Globe, Lock, Mail, Phone, GraduationCap, Landmark, CalendarCheck, CreditCard, TrendingUp, Bell, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import usecaseSchool from "@/assets/usecase-school.png";
import usecaseCooperative from "@/assets/usecase-cooperative.png";
import BookDemoDialog from "@/components/BookDemoDialog";
import ContactSalesDialog from "@/components/ContactSalesDialog";
const Index = () => {
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [showContactSalesDialog, setShowContactSalesDialog] = useState(false);
  const features = [{
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track MRR, churn rate, and subscriber growth with beautiful, real-time analytics."
  }, {
    icon: RefreshCw,
    title: "Automated Billing",
    description: "Set up recurring payments once and let Paystack handle the rest automatically."
  }, {
    icon: Users,
    title: "Subscriber Management",
    description: "Manage all your subscribers, view payment history, and handle cancellations with ease."
  }, {
    icon: Shield,
    title: "Secure Payments",
    description: "Built on Paystack's secure infrastructure with industry-standard encryption."
  }, {
    icon: Zap,
    title: "Quick Integration",
    description: "Get started in minutes with our simple setup process and shareable subscription links."
  }, {
    icon: CheckCircle,
    title: "Plan Flexibility",
    description: "Create unlimited plans with custom pricing, intervals, and features."
  }];
  const stats = [{
    value: "99.9%",
    label: "Uptime Guarantee"
  }, {
    value: "50+",
    label: "Active Businesses"
  }, {
    value: "100+",
    label: "Transactions Processed"
  }, {
    value: "24/7",
    label: "Customer Support"
  }];
  const howItWorks = [{
    step: "1",
    title: "Create Your Account",
    description: "Sign up in seconds and access your dashboard immediately."
  }, {
    step: "2",
    title: "Set Up Plans",
    description: "Create subscription plans with custom pricing and intervals."
  }, {
    step: "3",
    title: "Share & Collect",
    description: "Share subscription links and start collecting payments automatically."
  }];
  const testimonials = [{
    quote: "Recurra transformed how we manage subscriptions. The analytics alone are worth it.",
    author: "Sarah Johnson",
    role: "CEO, TechStart",
    rating: 5
  }, {
    quote: "Best subscription management platform we've used. Simple, powerful, and reliable.",
    author: "Michael Chen",
    role: "Finance Director, EduCorp",
    rating: 5
  }, {
    quote: "The automated billing saved us countless hours. Highly recommend for any business.",
    author: "Emily Rodriguez",
    role: "Operations Manager, MediaFlow",
    rating: 5
  }];
  const pricingFeatures = ["Unlimited subscription plans", "Real-time analytics dashboard", "Automated billing & invoicing", "Subscriber management tools", "Payment gateway integration", "24/7 customer support", "Advanced reporting", "Custom branding options"];
  const footerLinks = {
    product: [{
      name: "Features",
      href: "/#features"
    }, {
      name: "Pricing",
      href: "/#pricing"
    }, {
      name: "Integrations",
      href: "/help"
    }, {
      name: "API Documentation",
      href: "/help"
    }],
    company: [{
      name: "About Us",
      href: "/about"
    }, {
      name: "Careers",
      href: "/careers"
    }, {
      name: "Press",
      href: "/press"
    }, {
      name: "Contact",
      href: "/contact"
    }],
    resources: [{
      name: "Blog",
      href: "/blog"
    }, {
      name: "Help Center",
      href: "/help"
    }, {
      name: "Community",
      href: "/community"
    }, {
      name: "Status",
      href: "/status"
    }],
    legal: [{
      name: "Privacy Policy",
      href: "/privacy"
    }, {
      name: "Terms of Service",
      href: "/terms"
    }, {
      name: "Cookie Policy",
      href: "/cookies"
    }, {
      name: "GDPR",
      href: "/gdpr"
    }]
  };
  return <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero Section - Premium Split Layout */}
    <section className="relative overflow-hidden pt-20 pb-12 md:pt-24 md:pb-16 lg:pt-32 lg:pb-24">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/10 border border-accent/20 mb-4 md:mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-accent">Trusted by leading institutions</span>
            </div>

            <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl animate-fade-in font-mono">Billing Automation <span className="block mt-1 md:mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              So Simple, So Powerful
            </span>
            </h1>

            <p className="mt-4 md:mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in font-mono">
              The most powerful, customizable and easy to integrate subscription billing software
              used by hundreds of businesses worldwide to simplify revenue operations.
            </p>

            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4 animate-fade-in">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent/20 font-mono">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => setShowDemoDialog(true)} className="w-full sm:w-auto border-border hover:border-accent/50 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 hover:bg-accent/5 font-mono">
                Book a Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-6 md:mt-10 pt-6 md:pt-8 border-t border-border/50 animate-fade-in">
              <p className="text-sm text-muted-foreground mb-4">Powering subscriptions for</p>
              <div className="flex items-center gap-4 md:gap-8 opacity-60 flex-wrap">
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

          {/* Right Content - Dashboard Preview (Hidden on smaller screens) */}
          <div className="hidden lg:block order-1 lg:order-2 animate-fade-in">
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
                <img alt="Recurra Dashboard Preview - Analytics and subscription management interface" className="w-full h-auto rounded-lg shadow-lg" src="/lovable-uploads/3e644e03-1101-487c-9e2f-0e34126ff0f1.png" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Book Demo Dialog */}
    <BookDemoDialog open={showDemoDialog} onOpenChange={setShowDemoDialog} />

    {/* Stats Section - Floating Cards */}
    <section className="py-10 md:py-16 relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => <div key={index} className="group relative p-4 md:p-6 rounded-2xl bg-card border border-border/50 text-center transition-all duration-500 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </div>)}
        </div>
      </div>
    </section>

    {/* Features Section - Bento Grid Style */}
    <section id="features" className="py-12 md:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Features</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-mono">
            All the Power You Need
          </h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground font-mono">
            Powerful features designed for institutions and businesses
          </p>
        </div>

        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return <Card key={index} className="group relative p-5 md:p-8 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-accent/30 hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 group-hover:bg-accent/20 transition-all duration-300">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </Card>;
          })}
        </div>
      </div>
    </section>

    {/* How It Works Section - Timeline Style */}
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Process</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-mono">
            How It Works
          </h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground font-mono">
            Get started in three simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-accent/20 via-accent to-accent/20" />

            {howItWorks.map((item, index) => <div key={index} className="relative text-center transition-all duration-500 hover:scale-105">
              <div className="relative z-10 mx-auto mb-4 md:mb-6 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent/80 text-xl md:text-2xl font-bold text-accent-foreground shadow-lg shadow-accent/20">
                {item.step}
              </div>
              <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground">{item.description}</p>
            </div>)}
          </div>
        </div>
      </div>
    </section>

    {/* Use Case 1: Schools Section */}
    <section id="use-cases" className="py-14 md:py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
          {/* Left: Image */}
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-accent/30 via-accent/20 to-accent/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Glass Frame */}
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-accent/20 backdrop-blur-sm bg-card/30 p-2 md:p-4 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent" />
              <img
                src={usecaseSchool}
                alt="School Fee Management Dashboard - Digital payment flows for educational institutions"
                className="relative w-full h-auto rounded-2xl shadow-lg"
              />
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 px-3 py-1.5 md:px-4 md:py-2 rounded-xl glass-card border border-accent/30 shadow-lg animate-floating">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono">Active Schools</p>
                  <p className="text-sm font-semibold text-foreground font-mono">15+ Institutions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="lg:pl-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/10 border border-accent/20 mb-4 md:mb-6">
              <GraduationCap className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent font-mono">For Educational Institutions</span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-6 font-mono">
              Streamline School Fees Collection with{" "}
              <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                Automated Billing
              </span>
            </h2>

            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed font-mono">
              Eliminate the chaos of manual fee collection. Recurra automates tuition payments,
              sends timely reminders, and provides real-time tracking—so your admin team can
              focus on education, not paperwork.
            </p>

            {/* Feature Points */}
            <div className="grid gap-3 md:gap-4 mb-6 md:mb-8">
              {[
                { icon: CalendarCheck, title: "Automated Term Billing", desc: "Set up recurring fees per term or semester with automatic collection" },
                { icon: Bell, title: "Smart Payment Reminders", desc: "Automated notifications to parents before due dates" },
                { icon: TrendingUp, title: "Real-time Fee Tracking", desc: "Dashboard showing collected vs outstanding fees instantly" },
                { icon: RefreshCw, title: "Failed Payment Recovery", desc: "Auto-retry failed payments up to 3 times within the billing cycle" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-card/50 border border-border/50 hover:border-accent/30 hover:bg-card transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 font-mono">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground font-mono">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent/20 font-mono">
                Get Started for Schools
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>

    {/* Use Case 2: Loan Cooperatives Section */}
    <section className="py-14 md:py-24 relative overflow-hidden bg-muted/30">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-bl from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-20 items-center">
          {/* Left: Content (Reversed order on desktop) */}
          <div className="lg:pr-8 order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/10 border border-accent/20 mb-4 md:mb-6">
              <Landmark className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent font-mono">For Loan Cooperatives</span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4 md:mb-6 font-mono">
              Simplify Loan Repayments with{" "}
              <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                Smart Recovery
              </span>
            </h2>

            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 leading-relaxed font-mono">
              Transform your cooperative's loan management. Automate monthly repayments,
              track member contributions, and reduce defaulters with intelligent retry
              mechanisms that recover failed payments automatically.
            </p>

            {/* Feature Points */}
            <div className="grid gap-3 md:gap-4 mb-6 md:mb-8">
              {[
                { icon: CreditCard, title: "Automated Loan Deductions", desc: "Schedule monthly repayments with direct debit from member accounts" },
                { icon: RefreshCw, title: "Intelligent Retry System", desc: "Up to 3 automatic retries for failed payments within the cycle" },
                { icon: Users, title: "Member Portal Access", desc: "Members can view loan balance, payment history, and upcoming dues" },
                { icon: Shield, title: "Defaulter Management", desc: "Automated flagging and escalation for overdue accounts" },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl bg-card/50 border border-border/50 hover:border-accent/30 hover:bg-card transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1 font-mono">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground font-mono">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-accent/20 font-mono">
                Get Started for Cooperatives
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Right: Image */}
          <div className="relative group order-1 lg:order-2">
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-l from-accent/30 via-accent/20 to-accent/30 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Glass Frame */}
            <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-accent/20 backdrop-blur-sm bg-card/30 p-2 md:p-4 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-bl from-accent/10 via-transparent to-transparent" />
              <img
                src={usecaseCooperative}
                alt="Cooperative Loan Management System - Automated repayment tracking for financial cooperatives"
                className="relative w-full h-auto rounded-2xl shadow-lg"
              />
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-2 -left-2 md:-bottom-4 md:-left-4 px-3 py-1.5 md:px-4 md:py-2 rounded-xl glass-card border border-accent/30 shadow-lg animate-floating">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Landmark className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-mono">Recovery Rate</p>
                  <p className="text-sm font-semibold text-foreground font-mono">98.5% Success</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Testimonials Section - Modern Cards */}
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Testimonials</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-mono">
            Trusted by Businesses Worldwide
          </h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground font-mono">
            See what our customers have to say
          </p>
        </div>

        <div className="grid gap-4 md:gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => <Card key={index} className="group p-5 md:p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-accent/30">
            <div className="mb-4 md:mb-6 flex gap-1">
              {[...Array(testimonial.rating)].map((_, i) => <Star key={i} className="h-5 w-5 fill-accent text-accent" />)}
            </div>
            <p className="mb-4 md:mb-6 text-muted-foreground italic text-base md:text-lg leading-relaxed">
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
          </Card>)}
        </div>
      </div>
    </section>

    {/* Pricing Section - Premium Card */}
    <section id="pricing" className="py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Pricing</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-mono">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground font-mono">
            Everything you need to grow your subscription business
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="relative p-6 md:p-10 overflow-hidden transition-all duration-500 hover:shadow-2xl border-accent/20">
            {/* Premium Badge */}
            <div className="absolute top-6 right-6">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-accent/10 text-accent border border-accent/20">
                Most Popular
              </span>
            </div>

            <div className="text-center mb-6 md:mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Professional Plan
              </h3>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl md:text-5xl font-bold text-foreground">Free</span>
                <span className="text-muted-foreground">to get started</span>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
              {pricingFeatures.map((feature, index) => <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                  <Check className="h-3 w-3 text-accent" />
                </div>
                <span className="text-sm md:text-base text-muted-foreground">{feature}</span>
              </div>)}
            </div>

            <Link to="/auth" className="block">
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base md:text-lg py-4 md:py-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/20">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </section>

    <section id="faq" className="py-12 md:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />

      <div className="container relative mx-auto px-4 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/10 border border-accent/20 mb-4 md:mb-6">
            <HelpCircle className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent font-mono">FAQ</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-mono">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground font-mono">
            Everything you need to know about Recurra
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="p-4 md:p-6 lg:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  What is Recurra and how does it work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  Recurra is a subscription management platform that automates billing for businesses and institutions.
                  You create subscription plans, share payment links with your customers, and we handle the rest—including
                  automatic charging, failed payment retries, and real-time analytics. All payments are processed securely
                  through Paystack.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  Is Recurra free to use?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  Yes! Recurra is completely free to get started. There are no setup fees or monthly charges.
                  You only pay the standard Paystack transaction fees when you successfully collect payments
                  from your subscribers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  How does the automatic retry system work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  When a payment fails (due to insufficient funds, expired card, etc.), Recurra automatically
                  attempts to charge the subscriber up to 3 times within the billing cycle. This intelligent
                  retry system has a 98.5% recovery rate, significantly reducing payment failures and lost revenue.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  Can I use Recurra for school fee collection?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  Absolutely! Recurra is perfect for educational institutions. You can set up recurring fee
                  collection per term or semester, send automated payment reminders to parents, track outstanding
                  fees in real-time, and generate detailed financial reports. Over 15 schools already trust Recurra
                  for their fee management.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  How do my subscribers/members make payments?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  Each subscription plan gets a unique, shareable link. Your subscribers simply click the link,
                  enter their card details, and authorize the recurring payment. They can pay using debit cards,
                  bank transfers, or USSD—all powered by Paystack's secure payment infrastructure.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  Is my data secure with Recurra?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  Yes, security is our top priority. Recurra is built on Paystack's PCI-DSS compliant infrastructure,
                  meaning all payment data is encrypted and handled according to the highest security standards.
                  We never store raw card details—all sensitive information is tokenized and secured by Paystack.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  Can I cancel or modify a subscriber's subscription?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  Yes, you have full control over all subscriptions from your dashboard. You can pause,
                  cancel, or modify any subscription at any time. Subscribers also have the option to
                  manage their own subscriptions through their member portal.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="border-border/50">
                <AccordionTrigger className="text-left font-mono font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  What kind of support does Recurra offer?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground font-mono leading-relaxed text-sm md:text-base">
                  We offer 24/7 customer support via email and phone. Our dedicated team is always ready
                  to help you with setup, troubleshooting, or any questions you might have. Enterprise
                  customers also get access to a dedicated account manager for personalized assistance.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </div>
    </section>

    {/* CTA Section - Gradient Background */}
    <section className="relative py-14 md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/30 via-transparent to-transparent" />

      <div className="container relative mx-auto px-4 md:px-6 text-center">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground max-w-3xl mx-auto font-mono">
          Ready to Transform Your Subscription Business?
        </h2>
        <p className="mt-4 md:mt-6 text-base md:text-lg text-primary-foreground/90 max-w-2xl mx-auto font-mono">
          Join hundreds of businesses already managing their subscriptions with Recurra.
          Start your free trial today, no credit card required.
        </p>
        <div className="mt-6 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
          <Link to="/auth">
            <Button size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl font-mono">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={() => setShowContactSalesDialog(true)} className="w-full sm:w-auto border-white/30 text-white px-6 py-4 md:px-8 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 bg-accent font-mono">
            Contact Sales
          </Button>
        </div>
      </div>
    </section>

    {/* Contact Sales Dialog */}
    <ContactSalesDialog open={showContactSalesDialog} onOpenChange={setShowContactSalesDialog} />

    {/* Enterprise Footer */}
    <footer className="bg-card border-t border-border">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 md:px-6 py-10 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <img src={logoImage} alt="Recurra Logo" className="h-8 w-8 md:h-10 md:w-10 object-cover rounded-xl" />
              <span className="text-lg md:text-xl font-bold text-foreground font-mono">Recurra</span>
            </div>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed mb-4 md:mb-6 max-w-xs font-mono">
              The most powerful subscription management platform for modern businesses and institutions.
            </p>
            <div className="flex items-center gap-4">
              <button onClick={() => window.location.reload()} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                <Globe className="h-4 w-4 text-muted-foreground" />
              </button>
              <a href="mailto:Recurrra@outlook.com" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </a>
              <a href="tel:+2348101751349" className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-accent/10 transition-colors">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base font-mono">Product</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.product.map((link, index) => <li key={index} className="font-mono">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base font-mono">Company</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.company.map((link, index) => <li key={index} className="font-mono">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base font-mono">Resources</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.resources.map((link, index) => <li key={index} className="font-mono">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base font-mono">Legal</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.legal.map((link, index) => <li key={index} className="font-mono">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <p className="text-xs md:text-sm text-muted-foreground font-mono text-center md:text-left">
              © {new Date().getFullYear()} Recurra. All rights reserved.
            </p>

            {/* Powered by Paystack */}
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="font-mono">Secured & Powered by</span>
              <span className="font-semibold text-foreground font-mono">Paystack</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>;
};
export default Index;