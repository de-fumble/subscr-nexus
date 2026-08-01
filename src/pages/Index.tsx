import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BarChart3, Users, Shield, Zap, RefreshCw, CheckCircle, Star, ArrowRight, ArrowDown, Check, Building2, Globe, Lock, Mail, Phone, GraduationCap, Landmark, CalendarCheck, CreditCard, TrendingUp, Bell, HelpCircle, UserPlus, Settings, Share2, Dumbbell, FileText, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.svg";
import dashboardPreview from "@/assets/dashboard-preview.png";
import usecaseSchool from "@/assets/usecase-school-v2.png";
import usecaseCooperative from "@/assets/usecase-cooperative-v2.png";
import BookDemoDialog from "@/components/BookDemoDialog";
import ContactSalesDialog from "@/components/ContactSalesDialog";
import { TeamSection } from "@/components/TeamSection";

// Step icons mapping
const stepIcons = [UserPlus, Settings, Share2];

// Desktop Process Steps - Horizontal with moving dot
const ProcessStepsDesktop = ({ steps }: { steps: { step: string; title: string; description: string }[] }) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="relative">
      {/* Dot indicator above */}
      <div className="flex justify-center mb-4">
        <div
          className="w-3 h-3 rounded-full bg-foreground transition-all duration-500 ease-out"
          style={{
            transform: `translateX(${(activeStep - 1) * 200}px)`,
          }}
        />
      </div>

      {/* Steps Row */}
      <div className="flex items-center justify-center gap-6">
        {steps.map((item, index) => (
          <div
            key={index}
            className={`flex items-center gap-4 px-8 py-5 rounded-full transition-all duration-500 ${activeStep === index
              ? 'bg-card shadow-xl border-2 border-accent/30 scale-105'
              : 'bg-muted/50'
              }`}
          >
            {/* Icon Circle */}
            {(() => {
              const StepIcon = stepIcons[index] || UserPlus;
              return (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${activeStep === index
                  ? 'bg-gradient-to-br from-accent via-accent/80 to-accent/60'
                  : 'bg-muted'
                  }`}>
                  <StepIcon className={`w-6 h-6 ${activeStep === index ? 'text-accent-foreground' : 'text-muted-foreground'}`} />
                </div>
              );
            })()}

            {/* Text */}
            <div className="text-left">
              <h4 className="font-semibold text-foreground text-base">{item.title}</h4>
              <p className={`text-sm text-muted-foreground transition-all duration-300 max-w-[180px] ${activeStep === index ? 'opacity-100' : 'opacity-60'
                }`}>
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mobile Process Steps - Single card with orbiting dot
const ProcessStepsMobile = ({ steps }: { steps: { step: string; title: string; description: string }[] }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveStep((prev) => (prev + 1) % steps.length);
        setIsTransitioning(false);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  const currentStep = steps[activeStep];

  return (
    <div className="flex flex-col items-center">
      {/* Card without orbiting dot on mobile */}
      <div className="relative">
        {/* Main pill-shaped card */}
        <div className="relative bg-card rounded-full px-6 py-4 shadow-lg border border-border/50 flex items-center gap-4 min-w-[280px]">
          {/* Icon with gradient */}
          {(() => {
            const StepIcon = stepIcons[activeStep] || UserPlus;
            return (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent via-accent/80 to-accent/60 flex items-center justify-center flex-shrink-0">
                <StepIcon className="w-5 h-5 text-accent-foreground" />
              </div>
            );
          })()}

          {/* Content with transition */}
          <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
            <h4 className="font-bold text-foreground text-base">{currentStep.title}</h4>
            <p className="text-sm text-muted-foreground">{currentStep.description}</p>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 mt-6">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveStep(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeStep === index ? 'bg-accent w-6' : 'bg-muted-foreground/30'
              }`}
          />
        ))}
      </div>
    </div>
  );
};

const Index = () => {
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const [showContactSalesDialog, setShowContactSalesDialog] = useState(false);
  const [showRecurraIQDialog, setShowRecurraIQDialog] = useState(false);
  const [heroWord, setHeroWord] = useState("Leader");

  useEffect(() => {
    const words = ["Leader", "Engine", "Provider", "Toolkit"];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length;
      setHeroWord(words[currentIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  const features = [{
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "See exactly where your revenue is coming from -MRR, churn, and subscriber trends updated as payments come in.",
    shortDesc: "Live MRR & churn tracking"
  }, {
    icon: RefreshCw,
    title: "Automated Billing",
    description: "Configure once. Recurra charges your subscribers on schedule via Paystack - no manual follow-up needed.",
    shortDesc: "Hands-off recurring billing"
  }, {
    icon: Users,
    title: "Subscriber Management",
    description: "Full subscriber history at a glance. Pause, cancel, or move a subscriber between plans in a few clicks.",
    shortDesc: "Full subscriber control"
  }, {
    icon: Shield,
    title: "Secure Payments",
    description: "Payments run through Paystack's PCI-DSS compliant infrastructure. Card details are tokenized—we never see them.",
    shortDesc: "PCI-DSS compliant"
  }, {
    icon: Zap,
    title: "Quick Setup",
    description: "Create a plan, copy your subscription link, share it. Most businesses are collecting payments within 10 minutes.",
    shortDesc: "Live in under 10 minutes"
  }, {
    icon: CheckCircle,
    title: "Flexible Plans",
    description: "Weekly, monthly, per-term -set any billing interval with custom pricing. Mix and match plans for different tiers.",
    shortDesc: "Any interval, any price"
  }];
  const stats = [{
    value: "99.9%",
    label: "Uptime"
  }, {
    value: "50+",
    label: "Active Businesses"
  }, {
    value: "₦10M+",
    label: "Payments Processed"
  }, {
    value: "< 10min",
    label: "Avg. Setup Time"
  }];
  const howItWorks = [{
    step: "1",
    title: "Create your account",
    description: "Sign up free. Your dashboard is ready immediately - no waiting, no approval queue."
  }, {
    step: "2",
    title: "Build your plans",
    description: "Set a name, price, and billing interval. Add a description so subscribers know what they're paying for."
  }, {
    step: "3",
    title: "Share & get paid",
    description: "Copy the subscription link and share it - WhatsApp, email, your website. Payments start flowing in automatically."
  }];
  const testimonials = [{
    quote: "We used to chase parents every term for school fees. Now the money just comes in. I check the dashboard to confirm, that's it.",
    author: "Mrs. Folake Adesanya",
    role: "Bursar, Greenfield Academy",
    rating: 5
  }, {
    quote: "Our cooperative had a real defaulter problem. Recurra's retry system quietly recovered payments we thought were gone. We didn't have to call anyone.",
    author: "Emmanuel Okonkwo",
    role: "Treasurer, Unity Cooperative Society",
    rating: 5
  }, {
    quote: "Set it up on a Friday afternoon. By Monday morning we had 12 new gym memberships all paying automatically. Honestly didn't expect it to be that fast.",
    author: "Chidi Nwosu",
    role: "Owner, FitZone Lagos",
    rating: 5
  }, {
    quote: "The failed payment recovery alone has saved us more than the cost of running the platform. It just works.",
    author: "Adeola Balogun",
    role: "Finance Lead, SaaS startup",
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
  return <div className="min-h-screen bg-background w-full overflow-x-hidden relative" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
    <Navbar />

    {/* Hero Section - Premium Centered Layout - White Background */}
    <section className="relative overflow-hidden pt-8 pb-8 md:pt-12 md:pb-16 lg:pt-16 lg:pb-24 bg-white border-t border-border/30">
      {/* Background Elements removed for clean white look */}

      <div className="container relative mx-auto px-4 sm:px-5 md:px-6 lg:px-8" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-16 items-center">
          {/* Left Content - Centered on mobile */}
          <div className="order-2 lg:order-1 text-left">
            <h1 className="text-[2rem] leading-[1.15] font-bold text-foreground sm:text-4xl md:text-5xl lg:text-6xl animate-fade-in">
              The Billing Automation{" "}
              <span className="block mt-2 font-mono bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                {heroWord}
              </span>
            </h1>

            <p className="mt-5 md:mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl animate-fade-in">
              Businesses trust Recurra to automate billing and scale revenue operations.
            </p>

            {/* CTA Buttons - Side by side like Paystack */}
            <div className="mt-8 md:mt-10 flex flex-row items-center gap-4 justify-start animate-fade-in">
              <Button size="lg" onClick={() => setShowDemoDialog(true)} className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 sm:h-14 md:h-16 px-6 sm:px-8 text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/25 rounded-full">
                Get a Demo
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Link to="/auth" className="text-accent hover:text-accent/80 font-semibold text-sm sm:text-base transition-colors">
                or Start Free Trial
              </Link>
            </div>

            {/* Trust Indicators - Compact inline display */}
            <div className="mt-8 md:mt-12 pt-6 border-t border-border/30 animate-fade-in">
              <div className="flex flex-wrap items-center justify-start gap-4 md:gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-lg md:text-xl">50+</span>
                  <span className="">businesses globally</span>
                </div>
                <div className="hidden sm:block w-px h-5 bg-border" />
                <div className="flex items-center gap-1.5">
                  <div className="flex text-accent">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-accent" />)}
                  </div>
                  <span className="">5.0 rating</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Dashboard Preview (Only visible on large screens) */}
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

    {/* Trust Logos Section - Horizontal Scroll on Mobile */}
    <section className="py-6 md:py-10 border-y border-border/30 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-5 md:px-6">
        <p className="text-center text-sm text-muted-foreground mb-5">Powering subscriptions for</p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-12">
          <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <Building2 className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            <span className="text-sm md:text-base font-semibold text-foreground">Schools</span>
          </div>
          <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <Landmark className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            <span className="text-sm md:text-base font-semibold text-foreground">Cooperatives</span>
          </div>
          <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <Globe className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            <span className="text-sm md:text-base font-semibold text-foreground">SaaS</span>
          </div>
          <div className="hidden md:flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
            <Users className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            <span className="text-sm md:text-base font-semibold text-foreground">Enterprises</span>
          </div>
        </div>
      </div>
    </section>

    {/* Business Tools Highlight Section */}
    <section className="py-10 md:py-16 relative">
      <div className="container mx-auto px-4 sm:px-5 md:px-6">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-3">More than billing</p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Experience ease in business operations
          </h2>
          <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Recurra gives you the full picture - from collecting payments to generating invoices and keeping a clean audit trail.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
          {/* Invoicing Card */}
          <div className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-accent/30 hover:shadow-xl transition-all duration-300 p-6 md:p-8">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors duration-300" />
            <img src="https://res.cloudinary.com/dmhy8rk7q/image/upload/v1785557078/new_l0om0o.png" alt="New" className="absolute top-3 right-3 z-10 w-12 h-12 object-contain" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Recurra Invoicing</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Generate professional invoices automatically with every charge. Send them to subscribers in one click, attach receipts, and keep your books clean - without touching a spreadsheet.
              </p>
              <ul className="space-y-2 mb-6">
                {["Auto-generated on every payment", "PDF receipts for subscribers", "Custom branding on invoices", "Bulk export for accounting"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth?redirect=/invoicing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:gap-2.5 transition-all duration-200">
                Start invoicing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Audit Tools Card */}
          <div className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-accent/30 hover:shadow-xl transition-all duration-300 p-6 md:p-8">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors duration-300" />
            <img src="https://res.cloudinary.com/dmhy8rk7q/image/upload/v1785557078/new_l0om0o.png" alt="New" className="absolute top-3 right-3 z-10 w-12 h-12 object-contain" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                <ScanSearch className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Recurra Audit Tools</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Every charge, retry, cancellation, and staff action is logged. Search, filter, and export your full payment history for any period - no digging through emails or Paystack dashboards.
              </p>
              <ul className="space-y-2 mb-6">
                {["Complete payment event log", "Staff activity tracking", "Searchable by date, subscriber, or plan", "Export for compliance or finance"].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:gap-2.5 transition-all duration-200">
                Explore audit tools
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features Section - Branch/Timeline Layout */}
    <section id="features" className="py-10 md:py-20 relative">
      <div className="container relative mx-auto px-4 sm:px-5 md:px-6">
        <div className="max-w-2xl mx-auto mb-8 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Features</span>
          <h2 className="mt-3 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            All the Power You Need
          </h2>
          <p className="mt-3 text-base md:text-lg text-muted-foreground">
            Powerful features designed for institutions and businesses
          </p>
        </div>

        {/* Branch/Timeline Layout - Responsive on all screens */}
        <div className="relative max-w-4xl mx-auto">
          {/* Center Line - visible on all screen sizes with gradient */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-accent/30 via-accent/50 to-accent/30 -translate-x-1/2" />

          <div className="space-y-4 md:space-y-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isLeft = index % 2 === 0;
              return (
                <div key={index} className="relative flex items-center">
                  {/* Timeline dot with glow */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent border-2 border-background z-10 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />

                  {/* Card container with glow */}
                  <div className={`w-[calc(50%-0.5rem)] sm:w-[calc(50%-0.75rem)] ${isLeft ? 'pr-1 sm:pr-2 md:pr-6' : 'pl-1 sm:pl-2 md:pl-6 ml-auto'}`}>
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-accent/10 rounded-xl blur-[2px]" />
                      <Card className="relative p-2 sm:p-3 md:p-5 border-accent/20 bg-card/95 backdrop-blur-sm rounded-xl hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center md:items-start gap-1.5 sm:gap-2.5 md:gap-3">
                          <div className="flex-shrink-0 inline-flex rounded-lg bg-accent/15 p-1.5 sm:p-2 md:p-2.5 shadow-sm">
                            <Icon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[10px] sm:text-[11px] md:text-base font-semibold text-foreground leading-tight">
                              {feature.title}
                            </h3>
                            <p className="mt-0.5 text-[9px] sm:text-[10px] text-muted-foreground leading-snug md:hidden">{feature.shortDesc}</p>
                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed hidden md:block">{feature.description}</p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>

    {/* How It Works Section - Animated Process */}
    <section className="py-12 md:py-20 lg:py-28 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-5 md:px-6">
        <div className="max-w-3xl mx-auto mb-10 md:mb-16 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Grow recurring revenue at every stage
          </h2>
        </div>

        {/* Desktop View - Horizontal Steps with Moving Dot */}
        <div className="hidden md:block max-w-5xl mx-auto">
          <ProcessStepsDesktop steps={howItWorks} />
        </div>

        {/* Mobile View - Single Card with Orbiting Dot */}
        <div className="md:hidden">
          <ProcessStepsMobile steps={howItWorks} />
        </div>
      </div>
    </section>

    {/* Integrations Section - How Recurra Connects */}
    <section className="py-10 md:py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-5 md:px-6">
        <div className="max-w-3xl mx-auto mb-8 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Process</span>
          <h2 className="mt-3 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            How Recurra connects to your business
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
            Pre-built tools and simple integrations to get you collecting payments in minutes
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-0 md:gap-8 max-w-5xl mx-auto">
          {/* Pre-built Integrations Card */}
          <div className="w-full md:flex-1">
            <div className="bg-zinc-900 rounded-2xl p-5 sm:p-6 md:p-8 h-full">
              <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest mb-4 md:hidden">Your tools</p>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
                {/* Row 1 */}
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-green-500" />
                </div>
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <Globe className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-400" />
                </div>
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <TrendingUp className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-orange-500" />
                </div>
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <Shield className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-500" />
                </div>
                {/* Row 2 */}
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-sky-400" />
                </div>
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-500" />
                </div>
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <Bell className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-red-500" />
                </div>
                <div className="bg-zinc-800/80 rounded-xl p-3 sm:p-3 md:p-4 flex items-center justify-center aspect-square hover:bg-zinc-700/80 transition-colors">
                  <Zap className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-emerald-500" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <span className="text-xs text-zinc-400">Paystack</span>
                <span className="text-xs text-zinc-400">Analytics</span>
                <span className="text-xs text-zinc-400">Growth</span>
                <span className="text-xs text-zinc-400">Security</span>
              </div>
            </div>
            <p className="text-center text-muted-foreground font-medium mt-3 hidden md:block">Pre-built integrations</p>
          </div>

          {/* Connection Arrow - Premium styled */}
          <div className="flex-shrink-0 z-10 py-2 md:py-0">
            <ArrowRight className="hidden md:block w-8 h-8 md:w-12 md:h-12 text-muted-foreground/30" />
            <div className="md:hidden flex flex-col items-center gap-1">
              <div className="w-px h-4 bg-gradient-to-b from-zinc-700 to-accent/40" />
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                <ArrowDown className="w-4 h-4 text-accent animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
              <div className="w-px h-3 bg-gradient-to-b from-accent/40 to-zinc-700" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">connects to</span>
              <div className="w-px h-2 bg-zinc-700/50" />
            </div>
          </div>

          {/* Integration Methods Card */}
          <div className="w-full md:flex-1">
            <div className="bg-zinc-900 rounded-2xl p-4 sm:p-4 md:p-6 flex flex-col md:flex-row gap-4 overflow-hidden h-full">
              {/* Code Preview */}
              <div className="flex-1 bg-zinc-950 rounded-xl p-3 sm:p-3 md:p-4 text-xs overflow-hidden border border-zinc-800/50">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
                <pre className="text-zinc-400 text-[10px] sm:text-[10px] md:text-xs leading-relaxed overflow-hidden whitespace-pre-wrap break-all">
                  <span className="text-zinc-500">{"<!-- Include Recurra.js -->"}</span>
                  {"\n"}<span className="text-purple-400">{"<script"}</span> <span className="text-blue-300">src</span>=<span className="text-green-400">"https://js.recurra..."</span>
                  {"\n"}
                  {"\n"}<span className="text-purple-400">{"<script>"}</span>
                  {"\n"}  <span className="text-zinc-500">// Initialize Recurra</span>
                  {"\n"}  <span className="text-blue-300">var</span> recurra = <span className="text-blue-300">new</span> <span className="text-yellow-300">Recurra</span>({"{"}
                  {"\n"}    publicKey: <span className="text-green-400">'your_key'</span>
                  {"\n"}  {"}"});
                  {"\n"}<span className="text-purple-400">{"</script>"}</span>
                </pre>
              </div>

              {/* Checkout Preview */}
              <div className="flex-1 bg-white rounded-xl p-3 sm:p-3 md:p-4 text-zinc-900 border border-zinc-200/50">
                <p className="text-accent font-semibold text-xs mb-1">Checkout: Order summary</p>
                <p className="text-2xl font-bold mb-3">₦12,840 <span className="text-xs font-normal text-zinc-500">NGN</span></p>

                <div className="bg-zinc-100 rounded-full px-3 py-1.5 mb-3 inline-flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-xs font-medium">Basic Plan</span>
                  <span className="text-xs text-zinc-500">₦12,000/month</span>
                </div>

                <div className="space-y-1.5 text-xs border-t border-zinc-200 pt-3">
                  <div className="flex justify-between"><span>One-time charge</span><span>₦12,840</span></div>
                  <div className="flex justify-between"><span>Subtotal</span><span>₦12,000</span></div>
                  <div className="flex justify-between"><span>Estimated tax</span><span>₦840</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t"><span>Total due today</span><span>₦12,840</span></div>
                </div>

                <p className="text-[10px] text-zinc-400 mt-2">Powered by Recurra</p>
              </div>
            </div>
            <p className="text-center text-muted-foreground font-medium mt-3 hidden md:block">Integration methods</p>
          </div>
        </div>
      </div>
    </section>

    {/* Use Cases Section */}
    <section id="use-cases" className="py-10 md:py-16 lg:py-24 relative overflow-hidden">
      <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />

      <div className="container relative mx-auto px-4 sm:px-5 md:px-6">
        {/* Use Cases Header */}
        <div className="text-center mb-8 md:mb-16">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Who uses Recurra</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Built around how you actually collect money
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Whether you run a school, a cooperative, or a gym - if you collect recurring payments, Recurra handles the billing so you can handle the work.
          </p>
        </div>

        {/* Mobile: Compact premium cards */}
        <div className="md:hidden space-y-4 max-w-sm mx-auto">
          {[
            {
              icon: GraduationCap,
              label: "Schools",
              title: "Stop chasing school fees",
              desc: "Set up term billing once. Parents get charged automatically—you see who's paid and who hasn't, in real time.",
              features: ["Per-term billing", "Payment tracking"],
              cta: "Start collecting",
            },
            {
              icon: Landmark,
              label: "Cooperatives",
              title: "Loan repayments on autopilot",
              desc: "Members authorize their repayments once. Recurra deducts on schedule and retries if a payment fails.",
              features: ["Auto deductions", "Retry on failure"],
              cta: "Start collecting",
            },
            {
              icon: Dumbbell,
              label: "Gyms & Fitness",
              title: "Memberships that renew themselves",
              desc: "No more manual renewals. Members pay once and stay active month after month without any back-and-forth.",
              features: ["Monthly billing", "Renewal alerts"],
              cta: "Start collecting",
            },
          ].map((useCase, index) => (
            <div key={index} className="relative group">
              <div className="absolute -inset-px bg-gradient-to-r from-accent/20 to-accent/5 rounded-2xl blur-[1px]" />
              <div className="relative bg-card rounded-2xl border border-border/50 p-5 transition-all duration-300 hover:shadow-lg hover:border-accent/30">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <useCase.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-accent uppercase tracking-widest">{useCase.label}</span>
                    <h3 className="text-base font-bold text-foreground mt-0.5">{useCase.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{useCase.desc}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {useCase.features.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] text-accent bg-accent/5 px-2 py-1 rounded-full">
                          <Check className="w-3 h-3" />
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <Link to="/auth" className="mt-4 flex items-center gap-1 text-sm font-semibold text-accent hover:gap-2 transition-all">
                  {useCase.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Full detailed grids */}
        <div className="hidden md:block space-y-16 lg:space-y-28">

          {/* Schools */}
          <div className="grid md:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card p-2 shadow-lg">
                <img src={usecaseSchool} alt="School fee collection dashboard in Recurra" className="w-full h-auto rounded-lg md:max-h-[350px] md:object-cover" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-5">
                <GraduationCap className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Schools</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
                Stop chasing parents for school fees
              </h2>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Set up your term billing once. Parents authorize the charge when they register, and Recurra handles everything from there - deductions, reminders, and follow - up on failed payments. You just watch the dashboard.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: CalendarCheck, title: "Per-term or monthly billing", detail: "Flexible cycles to match your school calendar" },
                  { icon: Bell, title: "Automatic payment reminders", detail: "Sent before and after due dates" },
                  { icon: TrendingUp, title: "Real-time fee tracking", detail: "See who's paid, who's pending, instantly" },
                  { icon: RefreshCw, title: "Failed payment recovery", detail: "Retries happen automatically—no awkward calls" },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mt-0.5">
                      <feature.icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/auth">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-6 text-sm font-semibold rounded-full">
                  Get started - it's free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Cooperatives */}
          <div className="grid md:grid-cols-2 gap-10 lg:gap-20 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-5">
                <Landmark className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Cooperatives</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
                Loan repayments that don't require you to ask twice
              </h2>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Your members authorize their repayment once. After that, Recurra charges them on schedule - and when a payment fails, it retries automatically. Fewer defaulters, less awkward follow - up.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: CreditCard, title: "Scheduled loan deductions", detail: "Weekly, biweekly, or monthly—you choose" },
                  { icon: RefreshCw, title: "Smart retry on failure", detail: "Up to 3 retries before marking as defaulted" },
                  { icon: Users, title: "Member self-service portal", detail: "Members can view their repayment history" },
                  { icon: Shield, title: "Defaulter reports", detail: "Clearly flagged with payment history attached" },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mt-0.5">
                      <feature.icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/auth">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-6 text-sm font-semibold rounded-full">
                  Get started - it's free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="relative order-1 md:order-2">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card p-2 shadow-lg">
                <img src={usecaseCooperative} alt="Cooperative loan management in Recurra" className="w-full h-auto rounded-lg md:max-h-[350px] md:object-cover" />
              </div>
            </div>
          </div>

          {/* Gyms */}
          <div className="grid md:grid-cols-2 gap-10 lg:gap-20 items-center">
            {/* Visual */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 shadow-lg min-h-[320px] flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-accent" />
                  </div>
                  <span className="text-white font-semibold text-sm">FitZone Memberships</span>
                  <span className="ml-auto text-xs text-zinc-500">Live</span>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Basic — ₦8,000/mo", count: "142 active", pct: 72 },
                    { name: "Premium — ₦15,000/mo", count: "67 active", pct: 34 },
                    { name: "VIP — ₦30,000/mo", count: "18 active", pct: 9 },
                  ].map((plan, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-300">{plan.name}</span>
                        <span className="text-zinc-500">{plan.count}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${plan.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <span className="text-zinc-500 text-xs">Monthly revenue</span>
                  <span className="text-white font-bold text-lg">₦2.29M</span>
                </div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-5">
                <Dumbbell className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Gyms & Fitness</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
                Memberships that renew without a reminder
              </h2>
              <p className="text-base text-muted-foreground mb-8 leading-relaxed">
                Your members pay once and stay active. Recurra handles the monthly charge, notifies members before renewal, and flags anyone who lapses - so you can focus on the floor, not the billing.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  { icon: RefreshCw, title: "Automatic monthly renewal", detail: "No manual invoices, no WhatsApp reminders" },
                  { icon: Bell, title: "Pre-renewal member alerts", detail: "3 days before each billing date" },
                  { icon: Users, title: "Per-plan member tracking", detail: "See active, lapsed, and paused members" },
                  { icon: TrendingUp, title: "Revenue breakdown by plan", detail: "Know which plans are driving growth" },
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center mt-0.5">
                      <feature.icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/auth">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground h-12 px-6 text-sm font-semibold rounded-full">
                  Get started - it's free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>

    {/* Testimonials Section - Modern Cards */}
    <section className="py-10 md:py-16 lg:py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-5 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">From the people using it</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            What they said after the first month
          </h2>
          <p className="mt-3 md:mt-4 text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Real words from school bursars, cooperative treasurers, and gym owners who switched to automated billing.
          </p>
        </div>

        <div className="relative w-full overflow-hidden">
          {/* Gradient Masks */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-scroll gap-4 sm:gap-6 hover:[animation-play-state:paused] py-4">
            {[...testimonials, ...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
              <Card key={index} className="w-[260px] sm:w-[300px] md:w-[400px] shrink-0 group p-4 sm:p-5 md:p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:border-accent/30 bg-card/80 backdrop-blur-sm">
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
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Pricing Section - Premium Card */}
    <section id="pricing" className="py-10 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-5 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">Pricing</span>
          <h2 className="mt-3 md:mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-muted-foreground">
            Everything you need to grow your subscription business
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="relative p-6 md:p-10 overflow-hidden transition-all duration-500 hover:shadow-2xl border-accent/20">


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

    {/* Meet Our Team Section */}
    <TeamSection />

    {/* Enterprise Scale Section */}
    <section className="py-12 md:py-20 lg:py-28 bg-zinc-950 relative overflow-hidden">
      {/* World Map Background Image */}
      <div
        className="absolute inset-0 opacity-40 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: 'url(https://res.cloudinary.com/dmhy8rk7q/image/upload/v1770098069/Gemini_Generated_Image_9ic5zr9ic5zr9ic5_vwlusf.png)' }}
      />

      <div className="container relative mx-auto px-4 sm:px-5 md:px-6">
        {/* Header */}
        <div className="text-center mb-12 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Built to handle real volume
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
            Whether you have 10 subscribers or 10,000, the platform doesn't slow down or ask you to upgrade.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto mb-16 md:mb-24">
          {[
            { value: "99.9%", label: "Uptime", sub: "tracked month-over-month" },
            { value: "₦10M+", label: "Processed", sub: "and growing" },
            { value: "< 3s", label: "Avg. charge time", sub: "per subscriber" },
            { value: "3×", label: "Retry attempts", sub: "before marking failed" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-accent mb-1">{stat.value}</p>
              <p className="text-white text-sm font-semibold">{stat.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Recurra IQ Section */}
        <div className="text-center border-t border-zinc-800 pt-12 md:pt-20">
          <span className="text-accent font-semibold text-xs uppercase tracking-widest">Recurra IQ</span>
          <h3 className="mt-4 text-2xl md:text-3xl lg:text-4xl font-bold text-white">
            Your billing data, working harder
          </h3>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Recurra IQ surfaces insights you'd otherwise miss - churn signals, revenue forecasts, and at risks before they become problems.
          </p>
          <Button
            className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 py-3 font-semibold text-sm"
            onClick={() => window.open('https://iq.recurrra.com', '_blank')}
          >
            Learn more about Recurra IQ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>

    {/* Recurra IQ Coming Soon Modal */}
    {showRecurraIQDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-12 max-w-md mx-4 text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
            <Settings className="w-10 h-10 text-accent animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Coming Soon!
          </h3>
          <p className="text-muted-foreground mb-8">
            Our engineers are tirelessly working to make sure Recurra IQ is what you need.
          </p>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-8 py-3 font-semibold w-full"
            onClick={() => setShowRecurraIQDialog(false)}
          >
            We'll be done soon
          </Button>
        </div>
      </div>
    )}

    <section id="faq" className="py-10 md:py-16 lg:py-20 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />

      <div className="container relative mx-auto px-4 sm:px-5 md:px-6">
        <div className="max-w-2xl mx-auto mb-10 md:mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/10 border border-accent/20 mb-4 md:mb-6">
            <HelpCircle className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Common questions</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Things people ask before signing up
          </h2>
          <p className="mt-3 md:mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">

          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="p-4 md:p-6 lg:p-8 border-border/50 bg-card/50 backdrop-blur-sm">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  What exactly does Recurra do?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Recurra lets you create subscription plans and collect recurring payments automatically via Paystack. You share a link with your subscribers, they authorize payment once, and the charges happen on whatever schedule you set - weekly, monthly, per term, whatever works for your business. Failed payments get retried automatically. You watch it all on a live dashboard.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  What does it cost?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Free to start. No monthly fee, no per-plan charge. You only pay the standard Paystack transaction fees when a payment goes through. If a payment fails and never recovers, you pay nothing.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  What happens when a payment fails?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Recurra retries the charge automatically. Up to 3 times within the billing cycle. Most failures are due to temporary issues like insufficient funds, so the retry often succeeds without you doing anything. If all retries fail, the subscriber gets flagged in your dashboard and you can decide what to do from there.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  We collect school fees per term, not monthly. Can Recurra handle that?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Yes. You set the billing interval when you create the plan - daily, weekly, monthly, quarterly, or custom. Schools typically set up quarterly or per-term billing. Parents pay once at the start of the year and the system charges each term automatically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  How do my subscribers actually pay?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Each plan has a unique shareable link. Your subscribers open it, enter their card details, and authorize the recurring charge. It takes about 2 minutes. After that, everything is automatic. They can use debit cards, bank transfer, or USSD through Paystack.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  Are card details stored on your servers?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  No. Card data never touches our servers. Everything goes directly through Paystack's PCI-DSS compliant infrastructure. What we store is a payment token and not the card number itself. Even if someone breached our database, there's no card data to find.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-7" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  Can I pause or cancel a specific subscriber without affecting others?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Yes. Each subscriber is managed individually. You can pause, cancel, switch plans, or skip a billing cycle for one person without touching anyone else. Changes take effect from the next billing date unless you apply them immediately.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-8" className="border-border/50">
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-accent hover:no-underline py-4 md:py-6 text-sm md:text-base">
                  What if I need help getting set up?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm md:text-base pb-4">
                  Email us at Recurrra@outlook.com - Most setups take under 10 minutes, but if you get stuck we'll walk you through it.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>
      </div>
    </section>

    {/* CTA Section - Gradient Background */}
    <section className="relative py-10 sm:py-14 md:py-20 lg:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-accent/30 via-transparent to-transparent" />

      <div className="container relative mx-auto px-4 sm:px-5 md:px-6 text-center">
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground max-w-3xl mx-auto">
          Your subscribers should be paying themselves
        </h2>
        <p className="mt-4 md:mt-6 text-base md:text-base text-primary-foreground/80 max-w-xl mx-auto leading-relaxed">
          Set up a plan, share a link, and watch payments come in. Free to start - no card needed.
        </p>
        <div className="mt-6 md:mt-10 flex flex-row items-center justify-center gap-3 md:gap-4">
          <Link to="/auth">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-6 text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl">
              Get started free
              <ArrowRight className="ml-1.5 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" onClick={() => setShowContactSalesDialog(true)} className="border-white/30 text-white px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-6 text-sm sm:text-base md:text-lg font-semibold transition-all duration-300 bg-accent">
            Talk to us first
          </Button>
        </div>
      </div>
    </section>

    {/* Contact Sales Dialog */}
    <ContactSalesDialog open={showContactSalesDialog} onOpenChange={setShowContactSalesDialog} />

    {/* Enterprise Footer */}
    <footer className="bg-card border-t border-border">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-5 md:px-6 py-8 sm:py-10 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <img src={logoImage} alt="Recurra Logo" className="h-8 w-8 md:h-10 md:w-10 object-cover rounded-xl" />
              <span className="text-lg md:text-xl font-bold text-foreground">Recurra</span>
            </div>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed mb-4 md:mb-6 max-w-xs">
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
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Product</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.product.map((link, index) => <li key={index} className="">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Company</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.company.map((link, index) => <li key={index} className="">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Resources</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.resources.map((link, index) => <li key={index} className="">
                <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.name}
                </a>
              </li>)}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 md:mb-4 text-sm md:text-base">Legal</h4>
            <ul className="space-y-2 md:space-y-3">
              {footerLinks.legal.map((link, index) => <li key={index} className="">
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
            <p className="text-xs md:text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Recurra. All rights reserved.
            </p>

            {/* Powered by Paystack */}
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="">Secured & Powered by</span>
              <span className="font-semibold text-foreground">Paystack</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>;
};
export default Index;