import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

const Status = () => {
  const services = [
    { name: "API", status: "operational" },
    { name: "Dashboard", status: "operational" },
    { name: "Payment Processing", status: "operational" },
    { name: "Webhooks", status: "operational" },
    { name: "Authentication", status: "operational" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-500 font-mono">All Systems Operational</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-mono">
              System Status
            </h1>
            <p className="mt-4 text-lg text-muted-foreground font-mono">
              Current status of Recurra services
            </p>
          </div>

          {/* Services Status */}
          <div className="max-w-2xl mx-auto">
            <Card className="divide-y divide-border">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4">
                  <span className="font-medium text-foreground font-mono">{service.name}</span>
                  <div className="flex items-center gap-2">
                    {service.status === "operational" ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm text-green-500 font-mono">Operational</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <span className="text-sm text-yellow-500 font-mono">Degraded</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </Card>

            <p className="text-center text-sm text-muted-foreground mt-8 font-mono">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Status;
