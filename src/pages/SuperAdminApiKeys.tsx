import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Key, Webhook, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PremiumLoader, PremiumSpinner } from "@/components/PremiumLoader";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  paystack_connected: boolean;
  recurra_handling_request?: boolean;
  paystack_public_key?: string | null;
  paystack_secret_key?: string | null;
}

export default function SuperAdminApiKeys() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog State
  const [apiKeysDialogOpen, setApiKeysDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleEditKeys = (org: Organization) => {
    setSelectedOrg(org);
    setPublicKey(org.paystack_public_key || "");
    setSecretKey(org.paystack_secret_key || "");
    setApiKeysDialogOpen(true);
  };

  const handleUpdateKeys = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      if (!publicKey || !secretKey) {
        throw new Error("Both keys are required.");
      }
      await invokeSuperadmin('update_api_keys', { org_id: selectedOrg.id, public_key: publicKey, secret_key: secretKey });
      toast.success('API keys updated successfully');
      setApiKeysDialogOpen(false);
      fetchOrganizations();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update API keys');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Bring requested ones to the top
  const sortedOrganizations = [...filteredOrganizations].sort((a, b) => {
    if (a.recurra_handling_request && !b.recurra_handling_request) return -1;
    if (!a.recurra_handling_request && b.recurra_handling_request) return 1;
    return 0;
  });

  if (authLoading || loading) {
    return <PremiumLoader fullScreen message="Loading API directory..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Key Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage Paystack API integrations for platform tenants</p>
      </div>

      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Gateway Integrations</CardTitle>
              <CardDescription>Configure external payment provider keys per tenant</CardDescription>
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
                  <TableHead>Recurra Handling</TableHead>
                  <TableHead>Gateway Status</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedOrganizations.map((org) => (
                  <TableRow key={org.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer" onClick={() => navigate(`/superadmin/organization/${org.id}`)}>{org.org_name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{org.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       {org.recurra_handling_request ? (
                          <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none">Requested Recurra</Badge>
                       ) : (
                          <Badge variant="outline" className="text-muted-foreground">Manual Config</Badge>
                       )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-xs text-muted-foreground flex items-center">
                           <div className={cn("w-1.5 h-1.5 rounded-full mr-1.5", org.paystack_connected ? "bg-emerald-500" : "bg-rose-500")} />
                           {org.paystack_connected ? "Keys Provided" : "Missing Keys"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                       <Button 
                          variant={org.recurra_handling_request && !org.paystack_connected ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleEditKeys(org)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Manage Keys
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedOrganizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Key className="h-8 w-8 mb-2 opacity-20" />
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

      <Dialog open={apiKeysDialogOpen} onOpenChange={setApiKeysDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Gateway Keys for {selectedOrg?.org_name}</DialogTitle>
            <DialogDescription>
              Provide the corresponding Paystack gateway API keys. These keys will route all transactions for this tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publicKey">Public Key</Label>
              <Input 
                id="publicKey" 
                placeholder="pk_..." 
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secretKey">Secret Key</Label>
              <Input 
                id="secretKey" 
                type="password"
                placeholder="sk_..." 
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeysDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateKeys} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Save API Keys
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
