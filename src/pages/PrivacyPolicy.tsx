import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-8 font-mono">Privacy Policy</h1>
            
            <Card className="p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">1. Information We Collect</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We collect information you provide directly to us, such as when you create an account, set up subscription plans, or contact us for support. This includes your name, email address, organization details, and payment information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">2. How We Use Your Information</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We use the information we collect to provide, maintain, and improve our services, process transactions, send you technical notices and support messages, and respond to your comments and questions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">3. Information Sharing</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We do not share your personal information with third parties except as described in this policy. We may share information with service providers who perform services on our behalf, such as payment processing through Paystack.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">4. Data Security</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">5. Contact Us</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at{" "}
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

export default PrivacyPolicy;
