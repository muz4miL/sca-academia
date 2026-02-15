import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  HandCoins,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";

// API Base URL - Auto-detect Codespaces
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};
const API_BASE_URL = getApiBaseUrl();

// Simplified Finance View for Sciences Coaching Academy
const OwnerView = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Finance Overview
          </CardTitle>
          <CardDescription>
            Simple revenue and expense tracking for Sciences Coaching Academy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Finance tracking simplified: Student Fees - (Teacher Salaries + Expenses) = Net Balance
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Use the sidebar to manage expenses and payroll
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Finance Component
const Finance = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Finance Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Track revenue, expenses, and academy finances
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-4 py-2">
            Finance Overview
          </Badge>
        </div>

        <OwnerView />
      </div>
    </DashboardLayout>
  );
};

export default Finance;
