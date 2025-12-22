import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, ArrowUpRight, Banknote } from "lucide-react";

interface BalanceDisplayProps {
  totalCollected: number;
  availableBalance: number;
  pendingPayouts?: number;
  totalPaidOut?: number;
}

export function BalanceDisplay({ 
  totalCollected, 
  availableBalance, 
  pendingPayouts = 0,
  totalPaidOut = 0 
}: BalanceDisplayProps) {
  return (
    <Card className="glass-card border-0 shadow-[var(--shadow-medium)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4 text-accent" />
          Balance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Collected */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Collected</p>
            <p className="text-2xl font-bold text-foreground">
              ₦{totalCollected.toLocaleString()}
            </p>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              All-time revenue
            </div>
          </div>

          {/* Available Balance */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Available Balance</p>
            <p className="text-2xl font-bold text-green-600">
              ₦{availableBalance.toLocaleString()}
            </p>
            <div className="flex items-center text-xs text-muted-foreground">
              <Banknote className="h-3 w-3 mr-1" />
              Ready for payout
            </div>
          </div>

          {/* Pending Payouts */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending Payouts</p>
            <p className="text-2xl font-bold text-amber-600">
              ₦{pendingPayouts.toLocaleString()}
            </p>
            <Badge variant="secondary" className="text-xs">
              Awaiting approval
            </Badge>
          </div>

          {/* Total Paid Out */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Paid Out</p>
            <p className="text-2xl font-bold text-foreground">
              ₦{totalPaidOut.toLocaleString()}
            </p>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              All-time payouts
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
