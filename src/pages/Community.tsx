import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, Star, ArrowRight } from "lucide-react";

const Community = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Community</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground font-mono">
              Join the Recurra Community
            </h1>
            <p className="mt-6 text-lg text-muted-foreground font-mono">
              Connect with other businesses, share insights, and learn from fellow subscription managers.
            </p>
          </div>

          {/* Community Features */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 text-center">
              <div className="inline-flex rounded-xl bg-accent/10 p-4 mb-4">
                <Users className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground font-mono">Network</h3>
              <p className="text-muted-foreground mt-2 font-mono text-sm">
                Connect with business owners and finance professionals using Recurra.
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="inline-flex rounded-xl bg-accent/10 p-4 mb-4">
                <MessageSquare className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground font-mono">Discuss</h3>
              <p className="text-muted-foreground mt-2 font-mono text-sm">
                Share tips, ask questions, and get advice from the community.
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="inline-flex rounded-xl bg-accent/10 p-4 mb-4">
                <Star className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold text-foreground font-mono">Learn</h3>
              <p className="text-muted-foreground mt-2 font-mono text-sm">
                Access exclusive resources, webinars, and best practices.
              </p>
            </Card>
          </div>

          {/* CTA */}
          <Card className="p-8 mt-16 text-center max-w-2xl mx-auto bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
            <h2 className="text-2xl font-bold text-foreground font-mono">Coming Soon</h2>
            <p className="text-muted-foreground font-mono mt-2 mb-6">
              Our community platform is under development. Sign up to be notified when it launches!
            </p>
            <Button className="bg-accent hover:bg-accent/90 font-mono">
              Get Notified
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Community;
