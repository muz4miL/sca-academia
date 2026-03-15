/**
 * Inventory Management — Academy ERP
 *
 * Track academy items: stationery, furniture, electronics, supplies, etc.
 * Each item stores name, category, quantity, unit price, supplier, and notes.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Box,
  PackageOpen,
  ShoppingCart,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const CATEGORIES = [
  "Stationery",
  "Furniture",
  "Electronics",
  "Cleaning Supplies",
  "Books & Materials",
  "Sports Equipment",
  "Kitchen Supplies",
  "Other",
];

const CONDITIONS = ["New", "Good", "Fair", "Poor"];

const CATEGORY_COLORS: Record<string, string> = {
  Stationery: "bg-blue-100 text-blue-800",
  Furniture: "bg-amber-100 text-amber-800",
  Electronics: "bg-purple-100 text-purple-800",
  "Cleaning Supplies": "bg-green-100 text-green-800",
  "Books & Materials": "bg-orange-100 text-orange-800",
  "Sports Equipment": "bg-red-100 text-red-800",
  "Kitchen Supplies": "bg-teal-100 text-teal-800",
  Other: "bg-gray-100 text-gray-800",
};

const CONDITION_COLORS: Record<string, string> = {
  New: "bg-emerald-100 text-emerald-800",
  Good: "bg-blue-100 text-blue-800",
  Fair: "bg-yellow-100 text-yellow-800",
  Poor: "bg-red-100 text-red-800",
};

interface InventoryItem {
  _id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier?: string;
  purchaseDate?: string;
  condition: string;
  description?: string;
  createdAt: string;
}

interface ItemForm {
  itemName: string;
  category: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  supplier: string;
  purchaseDate: string;
  condition: string;
  description: string;
}

const emptyForm: ItemForm = {
  itemName: "",
  category: "Other",
  quantity: "1",
  unit: "Piece",
  unitPrice: "",
  supplier: "",
  purchaseDate: "",
  condition: "New",
  description: "",
};

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

  // Fetch inventory
  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data as InventoryItem[];
    },
  });

  const items = data || [];

  // Filtered items
  const filtered = items.filter((item) => {
    const matchSearch =
      !search ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      (item.supplier || "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchCategory;
  });

  // Stats
  const totalItems = items.length;
  const totalValue = items.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0),
    0
  );
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const categories = [...new Set(items.map((i) => i.category))].length;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ItemForm>) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item added to inventory!");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ItemForm> }) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item updated!");
      setDialogOpen(false);
      setEditingItem(null);
      setForm(emptyForm);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Item removed from inventory.");
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      itemName: item.itemName,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      supplier: item.supplier || "",
      purchaseDate: item.purchaseDate
        ? new Date(item.purchaseDate).toISOString().split("T")[0]
        : "",
      condition: item.condition,
      description: item.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.itemName.trim()) {
      toast.error("Item name is required.");
      return;
    }
    if (!form.unitPrice || isNaN(Number(form.unitPrice))) {
      toast.error("Valid unit price is required.");
      return;
    }
    const payload = {
      itemName: form.itemName.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 1,
      unit: form.unit || "Piece",
      unitPrice: Number(form.unitPrice),
      supplier: form.supplier || "",
      purchaseDate: form.purchaseDate || undefined,
      condition: form.condition,
      description: form.description || "",
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Inventory
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage academy supplies, equipment, and assets
            </p>
          </div>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Box className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                  <p className="text-xl font-bold">{totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <PackageOpen className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Quantity</p>
                  <p className="text-xl font-bold">{totalQty.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <ShoppingCart className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-xl font-bold">
                    PKR {totalValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Layers className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="text-xl font-bold">{categories}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item name or supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Inventory Items{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({filtered.length} items)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="font-medium">No inventory items found</p>
                <p className="text-sm mt-1">Add items to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium">
                        {item.itemName}
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            CATEGORY_COLORS[item.category] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        PKR {(item.unitPrice || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-700">
                        PKR{" "}
                        {(
                          (item.quantity || 0) * (item.unitPrice || 0)
                        ).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {item.supplier || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            CONDITION_COLORS[item.condition] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {item.condition}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Inventory Item" : "Add New Item"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* Item Name — full width */}
            <div className="col-span-2 space-y-1.5">
              <Label>
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Whiteboard Marker"
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) => setForm({ ...form, condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label>
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input
                placeholder="Piece, Box, Ream…"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-1.5">
              <Label>
                Unit Price (PKR) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              />
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <Label>Purchase Date (optional)</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) =>
                  setForm({ ...form, purchaseDate: e.target.value })
                }
              />
            </div>

            {/* Supplier — full width */}
            <div className="col-span-2 space-y-1.5">
              <Label>Supplier / Vendor (optional)</Label>
              <Input
                placeholder="e.g. Khan Stationery Store"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              />
            </div>

            {/* Description — full width */}
            <div className="col-span-2 space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes about this item…"
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            {/* Total Preview */}
            {form.quantity && form.unitPrice && (
              <div className="col-span-2 rounded-lg bg-muted px-4 py-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-semibold text-green-700">
                  PKR{" "}
                  {(
                    (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0)
                  ).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{deleteTarget?.itemName}</strong> from inventory? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget._id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
