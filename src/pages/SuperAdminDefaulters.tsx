import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Search, CheckCircle, RefreshCw } from "lucide-react";
import { PremiumLoader, PremiumSpinner } from "@/components/PremiumLoader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Defaulter {
  id: string;
  organization: string;
  org_id: string;
  email: string;
  customer_name: string;
  plan: string;
  amount: number;
  status: string;
  failure_reason: string;
  retry_count?: number;
  last_retry_at?: string;
  payment_failed_at?: string;
  next_payment_date?: string;
}

export default function SuperAdminDefaulters() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [defaulters, setDefaulters] = useState<Defaulter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  const fetchDefaulters = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const data = await invokeSuperadmin('get_defaulted_subscribers');
      setDefaulters(data.defaulted_subscribers || []);
      if (showRefresh) toast.success('Data refreshed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch defaulters');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invokeSuperadmin]);

  useEffect(() => {
    if (isSuperadmin) {
      fetchDefaulters();
    }
  }, [isSuperadmin, fetchDefaulters]);

  const handleMarkResolved = async (subscriberId: string) => {
    setActionLoading(subscriberId);
    try {
      await invokeSuperadmin('mark_payment_resolved', { subscriber_id: subscriberId });
      toast.success('Payment marked as resolved');
      fetchDefaulters();
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark payment resolved');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, reason: string) => {
    switch (status) {
      case 'attention':
        return <Badge variant="destructive">Payment Failed</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'non-renewing':
        return <Badge variant="outline">Non-Renewing</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{reason || status}</Badge>;
    }
  };

  const filteredDefaulters = defaulters.filter(d =>
    d.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.plan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return <PremiumLoader fullScreen message="Authenticating..." />;
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Defaulted Subscribers</h1>
            <p className="text-muted-foreground mt-1">Track and manage subscribers with payment issues across organizations</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchDefaulters(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Defaulters ({defaulters.length})</CardTitle>
              <CardDescription>
                Subscribers with payment failures, paused, or non-renewing status
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search defaulters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <PremiumLoader size="lg" message="Loading defaulters..." fullScreen={false} />
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Organization</TableHead>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Retries</TableHead>
                  <TableHead>Next Retry</TableHead>
                  <TableHead className="pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDefaulters.map((defaulter, index) => (
                  <TableRow key={defaulter.id || index} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium pl-6">
                      {defaulter.organization || '-'}
                    </TableCell>
                    <TableCell>{defaulter.customer_name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{defaulter.email}</TableCell>
                    <TableCell>{defaulter.plan}</TableCell>
                    <TableCell>
                      {getStatusBadge(defaulter.status, defaulter.failure_reason)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {defaulter.failure_reason || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₦{(defaulter.amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {defaulter.retry_count !== undefined ? `${defaulter.retry_count} / 3` : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {defaulter.next_payment_date 
                        ? new Date(defaulter.next_payment_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
                        : defaulter.last_retry_at
                          ? new Date(defaulter.last_retry_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : '-'}
                    </TableCell>
                    <TableCell className="pr-6">
                      {defaulter.id && !defaulter.id.startsWith('SUB_') && (
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                            onClick={() => handleMarkResolved(defaulter.id)}
                            disabled={actionLoading === defaulter.id}
                          >
                            {actionLoading === defaulter.id ? (
                              <PremiumSpinner />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                Resolve
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDefaulters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      {searchQuery ? 'No matching defaulters found' : 'No defaulted subscribers'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
