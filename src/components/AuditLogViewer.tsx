import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, Filter, FileText } from "lucide-react";

interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: unknown;
  module: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AuditLogViewerProps {
  orgId?: string; // If provided, filters to specific org. If not, shows all (superadmin)
  isSuperadmin?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/20 text-green-700 dark:text-green-400",
  update: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/20 text-red-700 dark:text-red-400",
  suspend: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  restore: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  approve: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  reject: "bg-rose-500/20 text-rose-700 dark:text-rose-400",
  login: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
};

const MODULE_OPTIONS = [
  { value: "all", label: "All Modules" },
  { value: "subscribers", label: "Subscribers" },
  { value: "plans", label: "Plans" },
  { value: "staff", label: "Staff" },
  { value: "payments", label: "Payments" },
  { value: "settings", label: "Settings" },
  { value: "payout", label: "Payouts" },
  { value: "organization", label: "Organization" },
];

export function AuditLogViewer({ orgId, isSuperadmin = false }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    module: "all",
    action: "all",
    dateFrom: "",
    dateTo: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [orgId]);

  const fetchLogs = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (orgId) {
        query = query.eq('entity_id', orgId).eq('entity_type', 'organization');
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
      if (showRefresh) toast.success('Logs refreshed');
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getActionBadgeClass = (action: string) => {
    for (const [key, value] of Object.entries(ACTION_COLORS)) {
      if (action.toLowerCase().includes(key)) return value;
    }
    return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
  };

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !log.action.toLowerCase().includes(searchLower) &&
        !log.entity_type.toLowerCase().includes(searchLower) &&
        !JSON.stringify(log.details).toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    if (filters.module !== "all" && log.module !== filters.module) {
      return false;
    }
    if (filters.action !== "all" && !log.action.toLowerCase().includes(filters.action)) {
      return false;
    }
    if (filters.dateFrom && new Date(log.created_at) < new Date(filters.dateFrom)) {
      return false;
    }
    if (filters.dateTo && new Date(log.created_at) > new Date(filters.dateTo + 'T23:59:59')) {
      return false;
    }
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Immutable record of all actions {isSuperadmin ? "across the platform" : "in your organization"}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
          <Select
            value={filters.module}
            onValueChange={(value) => setFilters({ ...filters, module: value })}
          >
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODULE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="w-40"
            placeholder="From date"
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="w-40"
            placeholder="To date"
          />
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {filters.search || filters.module !== "all" || filters.dateFrom || filters.dateTo
              ? "No logs match your filters"
              : "No audit logs found"}
          </div>
        ) : (
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Details</TableHead>
                  {isSuperadmin && <TableHead>Actor</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionBadgeClass(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.entity_type.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      {log.module && (
                        <Badge variant="outline" className="capitalize">
                          {log.module}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </TableCell>
                    {isSuperadmin && (
                      <TableCell className="font-mono text-xs">
                        {log.actor_id.slice(0, 8)}...
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center pt-2">
          Showing {filteredLogs.length} of {logs.length} logs • Logs are immutable and cannot be modified
        </div>
      </CardContent>
    </Card>
  );
}
