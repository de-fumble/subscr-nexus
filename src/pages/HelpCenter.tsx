import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Book, CreditCard, Users, Settings, HelpCircle, Mail } from "lucide-react";

const HelpCenter = () => {
  const categories = [
    {
      icon: Book,
      title: "Getting Started",
      description: "Learn the basics of setting up your Recurra account.",
      articles: 5,
    },
    {
      icon: CreditCard,
      title: "Billing & Payments",
      description: "Understand how payments and billing work.",
      articles: 8,
    },
    {
      icon: Users,
      title: "Subscriber Management",
      description: "Managing your subscribers and their subscriptions.",
      articles: 6,
    },
    {
      icon: Settings,
      title: "Account Settings",
      description: "Configure your account and organization settings.",
      articles: 4,
    },
  ];

  const faqs = [
    {
      question: "How do I create a subscription plan?",
      answer: "Navigate to your dashboard, click on 'Plans', then 'Create Plan'. Fill in the plan details and save.",
    },
    {
      question: "How do subscribers pay?",
      answer: "Subscribers receive a shareable link to your plan. They complete payment through Paystack's secure checkout.",
    },
    {
      question: "Can I offer multiple billing intervals?",
      answer: "Yes! Recurra supports daily, weekly, monthly, quarterly, biannual, and annual billing intervals.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Help Center</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground font-mono">
              How Can We Help?
            </h1>
            <div className="relative mt-8 max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                className="pl-12 py-6 text-lg font-mono"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card key={index} className="p-6 hover:border-accent/30 transition-colors cursor-pointer">
                  <div className="inline-flex rounded-xl bg-accent/10 p-3 mb-4">
                    <Icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground font-mono">{category.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-mono">{category.description}</p>
                  <p className="text-xs text-accent mt-3 font-mono">{category.articles} articles</p>
                </Card>
              );
            })}
          </div>

          {/* FAQs */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2 font-mono">
              <HelpCircle className="h-6 w-6 text-accent" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-6">
                  <h3 className="font-semibold text-foreground font-mono">{faq.question}</h3>
                  <p className="text-muted-foreground mt-2 font-mono text-sm">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <Card className="p-8 mt-16 text-center max-w-2xl mx-auto">
            <Mail className="h-8 w-8 text-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground font-mono">Still Need Help?</h2>
            <p className="text-muted-foreground font-mono mt-2 mb-4">
              Our support team is here to assist you.
            </p>
            <a href="mailto:Recurrra@outlook.com" className="text-accent hover:underline font-mono">
              Recurrra@outlook.com
            </a>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HelpCenter;
