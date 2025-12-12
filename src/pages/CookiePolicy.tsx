import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-foreground mb-8 font-mono">Cookie Policy</h1>
            
            <Card className="p-8 space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">What Are Cookies</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and login sessions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">How We Use Cookies</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  We use cookies to keep you signed in, remember your preferences, understand how you use our service, and improve your experience. Essential cookies are necessary for the service to function properly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Types of Cookies We Use</h2>
                <ul className="list-disc list-inside text-muted-foreground font-mono text-sm leading-relaxed space-y-2">
                  <li><strong>Essential cookies:</strong> Required for basic site functionality</li>
                  <li><strong>Authentication cookies:</strong> Keep you logged in</li>
                  <li><strong>Preference cookies:</strong> Remember your settings</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Managing Cookies</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  You can control and delete cookies through your browser settings. However, disabling certain cookies may affect the functionality of our service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3 font-mono">Contact</h2>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  Questions about our cookie policy? Contact us at{" "}
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

export default CookiePolicy;
