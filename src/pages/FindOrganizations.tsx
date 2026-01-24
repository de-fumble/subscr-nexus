import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Building2, 
  CreditCard, 
  Loader2,
  ArrowLeft,
  X
} from "lucide-react";

interface Organization {
  id: string;
  org_name: string;
  logo_url: string | null;
  email: string;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  currency: string;
}

const FindOrganizations = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [searchingOrgs, setSearchingOrgs] = useState(false);
  const navigate = useNavigate();

  // Search as user types
  useEffect(() => {
    const searchOrganizations = async () => {
      if (!searchQuery.trim()) {
        setOrganizations([]);
        return;
      }

      setSearchingOrgs(true);
      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("id, org_name, logo_url, email")
          .ilike("org_name", `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setOrganizations(data || []);
      } catch (error) {
        console.error("Error searching organizations:", error);
      } finally {
        setSearchingOrgs(false);
      }
    };

    const debounce = setTimeout(searchOrganizations, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchOrgPlans = async (org: Organization) => {
    setSelectedOrg(org);
    setOrganizations([]);
    setSearchQuery("");
    setLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, interval, currency")
        .eq("org_id", org.id)
        .eq("is_active", true);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      daily: "/ day",
      weekly: "/ week",
      monthly: "/ month",
      quarterly: "/ quarter",
      biannually: "/ 6 months",
      annually: "/ year",
    };
    return labels[interval] || `/ ${interval}`;
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/user-dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Find Organizations</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
          {searchingOrgs && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results */}
        {organizations.length > 0 && !selectedOrg && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {organizations.length} organization{organizations.length !== 1 ? 's' : ''} found
            </p>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => fetchOrgPlans(org)}
                className="w-full p-4 rounded-2xl border border-border hover:border-accent/50 hover:bg-muted/50 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  {org.logo_url ? (
                    <img src={org.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{org.org_name}</p>
                    <p className="text-sm text-muted-foreground truncate">{org.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Organization & Plans */}
        {selectedOrg && (
          <div className="space-y-4">
            <Card className="p-4 rounded-2xl bg-accent/10">
              <div className="flex items-center gap-3">
                {selectedOrg.logo_url ? (
                  <img src={selectedOrg.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-accent" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedOrg.org_name}</p>
                  <p className="text-xs text-muted-foreground">Available Plans</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setSelectedOrg(null);
                    setPlans([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {loadingPlans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : plans.length > 0 ? (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <Card key={plan.id} className="p-4 rounded-2xl glass-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4 className="font-medium truncate">{plan.name}</h4>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">{plan.interval}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-bold">
                        {plan.currency} {plan.price.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground">{getIntervalLabel(plan.interval)}</span>
                      </p>
                      <Link to={`/subscribe/${plan.id}`}>
                        <Button size="sm" className="gap-1.5">
                          <CreditCard className="h-3.5 w-3.5" />
                          Subscribe
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 rounded-2xl glass-card text-center">
                <p className="text-muted-foreground text-sm">No active plans available for this organization</p>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && !selectedOrg && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Start typing to search for organizations</p>
          </div>
        )}

        {/* No Results */}
        {searchQuery && organizations.length === 0 && !searchingOrgs && !selectedOrg && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No organizations found matching "{searchQuery}"</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FindOrganizations;
