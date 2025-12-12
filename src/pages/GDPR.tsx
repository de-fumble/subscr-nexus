import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";

const GDPR = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-8 font-mono">GDPR Compliance</h1>
            
            <Card className="p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Our Commitment to GDPR</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  Recurra is committed to protecting your personal data and complying with the General Data Protection Regulation (GDPR). This page outlines your rights and how we handle your data.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Your Rights</h2>
                <ul className="list-disc list-inside text-muted-foreground font-mono text-sm leading-relaxed space-y-2">
                  <li><strong>Right to Access:</strong> You can request a copy of your personal data</li>
                  <li><strong>Right to Rectification:</strong> You can correct inaccurate personal data</li>
                  <li><strong>Right to Erasure:</strong> You can request deletion of your personal data</li>
                  <li><strong>Right to Portability:</strong> You can receive your data in a structured format</li>
                  <li><strong>Right to Object:</strong> You can object to processing of your personal data</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Data Processing</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We process personal data only for legitimate business purposes, such as providing our subscription management services, processing payments, and communicating with you about your account.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Data Retention</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We retain your personal data only for as long as necessary to provide our services and comply with legal obligations. You may request deletion of your account and associated data at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Contact Our Data Protection Team</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  For any GDPR-related requests or questions, please contact us at{" "}
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

export default GDPR;
