import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-8 font-mono">Terms of Service</h1>
            
            <Card className="p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  By accessing or using Recurra's services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">2. Description of Service</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  Recurra provides a subscription management platform that allows businesses to create subscription plans, manage subscribers, and process recurring payments through Paystack.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">3. User Responsibilities</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">4. Payment Terms</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  A platform fee of ₦1,500 is charged per successful transaction. All payments are processed through Paystack's secure payment infrastructure.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">5. Limitation of Liability</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  Recurra shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">6. Contact</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  For questions about these terms, contact us at{" "}
                  <a href="mailto:Recurrra@outlook.com" className="text-accent hover:underline">
                    Recurrra@outlook.com
                  </a>
                </p>
              </section>

              <p className="text-xs text-muted-foreground font-mono pt-4 border-t border-border">
                Last updated: December 2024
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Terms;
