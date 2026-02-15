/**
 * TeacherPayoutHistory - Bottom section for Teacher Profile
 * Displays: List of teacher payouts (payments actually made)
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, CheckCircle, Banknote } from "lucide-react";

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};
const API_BASE_URL = getApiBaseUrl();

interface PayoutRecord {
  _id: string;
  amount: number;
  createdAt: string;
  description: string;
  voucherId?: string;
}

interface TeacherPayoutHistoryProps {
  teacherId: string;
}

export function TeacherPayoutHistory({ teacherId }: TeacherPayoutHistoryProps) {
  // Fetch payouts for this teacher
  const { data: payoutData, isLoading } = useQuery({
    queryKey: ["teacher-payouts", teacherId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/teachers/${teacherId}/wallet`, {
        credentials: "include",
      });
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: !!teacherId,
  });

  const payouts: PayoutRecord[] = payoutData?.data || [];
  const totalPaid = payouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-primary" />
            Payout History
          </span>
          <div className="flex items-center gap-4 text-sm font-normal">
            <span className="text-green-600">
              ✓ Paid: Rs. {totalPaid.toLocaleString()}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Banknote className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No payouts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-400/80 hover:bg-yellow-400">
                  <TableHead className="font-bold text-gray-900">
                    S.No
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Payment Date
                  </TableHead>
                  <TableHead className="font-bold text-gray-900 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-gray-900">
                    Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout, index) => (
                  <TableRow
                    key={payout._id}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      {new Date(payout.createdAt).toLocaleDateString(
                        "en-PK",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-700">
                      Rs. {payout.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Paid
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {payout.description || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
