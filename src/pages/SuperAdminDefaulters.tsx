import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperadmin } from "@/hooks/useSuperadmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Search, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SuperAdminDefaulters() {
  const navigate = useNavigate();
  const { isSuperadmin, loading: authLoading, invokeSuperadmin } = useSuperadmin();
  const [defaulters, setDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isSuperadmin) {
      navigate("/dashboard");
      toast.error("Access denied. Superadmin privileges required.");
    }
  }, [authLoading, isSuperadmin, navigate]);

  useEffect(() => {
    if (isSuperadmin) {
      fetchDefaulters();
    }
  }, [isSuperadmin]);

  const fetchDefaulters = async () => {
    try {
      const data = await invokeSuperadmin('get_defaulted_subscribers');
      setDefaulters(data.defaulted_subscribers);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch defaulters');
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'attention':
        return 'Payment Failed';
      case 'paused':
        return 'Paused';
      case 'non-renewing':
        return 'Non-Renewing';
      default:
        return status;
    }
  };

  const filteredDefaulters = defaulters.filter(d =>
    d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subscription_plans?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.subscription_plans?.organizations?.org_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperadmin) {
    return null;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Defaulted Subscribers</h1>
          <p className="text-muted-foreground">Track and manage subscribers with payment issues</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Defaulters</CardTitle>
              <CardDescription>
                Subscribers with payment failures, paused, or non-renewing status across all organizations
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search defaulters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Retry Count</TableHead>
                  <TableHead>Last Attempt</TableHead>
                  <TableHead>Failed At</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDefaulters.map((defaulter) => (
                  <TableRow key={defaulter.id}>
                    <TableCell className="font-medium">
                      {defaulter.subscription_plans?.organizations?.org_name || '-'}
                    </TableCell>
                    <TableCell>{defaulter.customer_name || '-'}</TableCell>
                    <TableCell>{defaulter.email}</TableCell>
                    <TableCell>{defaulter.subscription_plans?.name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        defaulter.status === 'attention' ? 'destructive' :
                        defaulter.status === 'paused' ? 'secondary' :
                        'outline'
                      }>
                        {getStatusLabel(defaulter.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ₦{defaulter.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {defaulter.retry_count || 0} / 3
                    </TableCell>
                    <TableCell>
                      {defaulter.last_retry_at 
                        ? new Date(defaulter.last_retry_at).toLocaleDateString() 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {defaulter.payment_failed_at 
                        ? new Date(defaulter.payment_failed_at).toLocaleDateString() 
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkResolved(defaulter.id)}
                        disabled={actionLoading === defaulter.id}
                      >
                        {actionLoading === defaulter.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDefaulters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
