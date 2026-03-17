import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/PremiumLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  org_name: string;
  email: string;
  created_at: string;
  is_suspended: boolean;
  paystack_connected: boolean;
  total_plans: number;
  active_plans: number;
  active_subscribers: number;
  total_subscribers: number;
  total_revenue: number;
  transaction_count: number;
  mrr: number;
  arr: number;
  defaulted_subscribers: number;
}

export default function SuperAdminOrganizations() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  useEffect(() => {
    if (isSuperadmin) {
      fetchOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin]);

  const fetchOrganizations = async () => {
    try {
      const data = await invokeSuperadmin('get_all_organizations');
      setOrganizations(data.organizations);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      toast.error(error.message || 'Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading organizations directory..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage all platform tenants</p>
      </div>

      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Organization Directory</CardTitle>
              <CardDescription>Comprehensive overview of all platform tenants</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[250px] pl-6">Identifier</TableHead>
                  <TableHead>Status / Integration</TableHead>
                  <TableHead className="text-right">Adoption</TableHead>
                  <TableHead className="text-right">Performance</TableHead>
                  <TableHead className="text-right pr-6">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.map((org) => (
                  <TableRow key={org.id} className="group hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/superadmin/organization/${org.id}`)}>
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.org_name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{org.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        {org.is_suspended ? (
                          <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20">Suspended</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20">Active Tenant</Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center">
                           <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", org.paystack_connected ? "bg-emerald-500" : "bg-muted-foreground/50")} />
                           {org.paystack_connected ? "Paystack Active" : "No Gateway"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex items-baseline gap-1">
                          <span className="font-medium">{org.active_subscribers}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Subs</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-medium">{org.active_plans}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Plans</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex flex-col gap-1 items-end">
                        <span className="font-semibold tracking-tight">₦{(org.total_revenue || 0).toLocaleString()}</span>
                        <div className="flex items-center gap-2 text-xs">
                          {org.mrr > 0 && <span className="text-emerald-500 font-medium">₦{(org.mrr || 0).toLocaleString()} <span className="text-emerald-500/70 text-[10px]">MRR</span></span>}
                          {org.defaulted_subscribers > 0 && <span className="text-rose-500 font-medium">{org.defaulted_subscribers} <span className="text-rose-500/70 text-[10px]">DF</span></span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 text-muted-foreground text-sm">
                      {new Date(org.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrganizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Search className="h-8 w-8 mb-2 opacity-20" />
                        <p>{searchQuery ? 'No organizations match your query.' : 'No organizations found on the platform.'}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
