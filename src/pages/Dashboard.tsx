import { Card } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react";

const Dashboard = () => {
  const metrics = [
    {
      title: "Monthly Recurring Revenue",
      value: "₦2,450,000",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
    },
    {
      title: "Active Subscribers",
      value: "1,234",
      change: "+8.2%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Total Revenue",
      value: "₦8,750,000",
      change: "+15.3%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      title: "Churn Rate",
      value: "2.4%",
      change: "-0.8%",
      trend: "down",
      icon: TrendingDown,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back! Here's an overview of your subscription business.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card
                key={index}
                className="p-6 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      metric.trend === "up"
                        ? "text-accent"
                        : "text-destructive"
                    }`}
                  >
                    {metric.change}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </h3>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {metric.value}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">
              Recent Activity
            </h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="font-medium text-foreground">
                    New subscriber joined
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Premium Plan - ₦5,000/month
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">2h ago</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <p className="font-medium text-foreground">
                    Payment received
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Basic Plan - ₦2,500/month
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">5h ago</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    New plan created
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enterprise Plan - ₦15,000/month
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">1d ago</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">
              Top Performing Plans
            </h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">Premium Plan</p>
                    <span className="text-sm text-muted-foreground">
                      456 subscribers
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: "75%" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">Basic Plan</p>
                    <span className="text-sm text-muted-foreground">
                      623 subscribers
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: "90%" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">
                      Enterprise Plan
                    </p>
                    <span className="text-sm text-muted-foreground">
                      155 subscribers
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{ width: "45%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
