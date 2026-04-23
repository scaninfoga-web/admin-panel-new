"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Search, X, Check, Loader2 } from "lucide-react";
import { get, post } from "@/lib/api";
import Title from "@/components/custom/custom-title";
import {
  CustomTable,
  type ColumnDef,
  type SortState,
} from "@/components/custom/custom-table";
import type { ApiResponse } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApiUsage {
  total_200: number;
  total_400: number;
  total_500: number;
  total_updates_this_month?: number;
  total_updates_lifetime?: number;
}

interface ApiItem {
  id: string;
  api_name: string;
  endpoint: string;
  method: string;
  description: string;
  api_vendor: string;
  api_vendor_url: string;
  source_price: number;
  user_price: number;
  cooperative_price: number;
  commercial_price: number;
  usage_lifetime: ApiUsage;
  usage_this_month: ApiUsage;
  created_at: string;
  updated_at: string;
}

interface ApiListResponseData {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  apis: ApiItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VENDORS = ["Scaninfoga", "Befisc", "LeakOsint"];
const vendorColors: Record<string, string> = {
  Scaninfoga: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Befisc: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  LeakOsint: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};
const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const PAGE_SIZE = 50;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ApiPricingSkeleton: React.FC = () => (
  <div className="flex h-full flex-col gap-5">
    <div className="space-y-2">
      <div className="h-6 w-32 animate-pulse rounded-xl bg-slate-800/60" />
      <div className="h-3.5 w-56 animate-pulse rounded-xl bg-slate-800/40" />
    </div>

    <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 min-w-[240px] flex-1 animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-9 w-[180px] animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-9 w-[96px] animate-pulse rounded-xl bg-slate-800/40" />
      </div>
    </Card>

    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="divide-y divide-slate-800">
        {Array.from({ length: 8 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-4 px-4 py-4">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 animate-pulse rounded-xl bg-slate-800/60" />
              <div className="h-2.5 w-1/2 animate-pulse rounded-xl bg-slate-800/40" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-800/60" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApiPricing() {
  // Data state
  const [apis, setApis] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const hasLoadedRef = useRef(false);

  // Editable state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ApiItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [vendor, setVendor] = useState("");

  // Sort
  const [sort, setSort] = useState<SortState>({
    column: "api_name",
    order: "asc",
  });

  // Debounce search timer
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch APIs ─────────────────────────────────────────────────────────
  const fetchApis = useCallback(
    async (targetPage = 1, append = false, silent = false) => {
      if (append) {
        setLoadingMore(true);
      } else if (!hasLoadedRef.current) {
        setLoading(true);
      } else if (!silent) {
        setRefreshing(true);
      }

      try {
        const params: Record<string, string> = {
          limit: String(PAGE_SIZE),
          page: String(targetPage),
        };
        if (search.trim()) params.q = search.trim();
        if (vendor && vendor !== "ALL") params.api_vendor = vendor;
        if (sort.column) {
          params.sort_by = sort.column;
          params.order = sort.order || "asc";
        }

        const res: ApiResponse<ApiListResponseData> = await get(
          "/api/v1/admin/apis/list-api-prices",
          params as any
        );

        const newApis = res.responseData?.apis ?? [];
        setApis((prev) => (append ? [...prev, ...newApis] : newApis));
        setTotal(res.responseData?.total ?? 0);
        setPage(res.responseData?.page ?? 1);
        setTotalPages(res.responseData?.total_pages ?? 1);
        hasLoadedRef.current = true;
      } catch {
        toast.error("Failed to fetch API prices");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, vendor, sort]
  );

  useEffect(() => {
    fetchApis(1, false);
  }, [fetchApis]);

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && page < totalPages) {
      fetchApis(page + 1, true);
    }
  }, [loadingMore, page, totalPages, fetchApis]);

  // ── Search with debounce ────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      // Triggered via dependency on `search` in fetchApis
    }, 400);
  };

  // ── Edit Handlers ───────────────────────────────────────────────────────
  const startEditing = (row: ApiItem) => {
    setEditingId(row.id);
    setEditValues({ ...row });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleInputChange = (field: keyof ApiItem, value: any) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const saveChanges = async (row: ApiItem) => {
    setSavingId(row.id);
    try {
      const payload = {
        api_name: editValues.api_name,
        user_price: Number(editValues.user_price),
        cooperative_price: Number(editValues.cooperative_price),
        commercial_price: Number(editValues.commercial_price),
        endpoint: row.endpoint,
        method: editValues.method,
        api_vendor: editValues.api_vendor,
        source_price: Number(editValues.source_price),
        api_vendor_url: editValues.api_vendor_url,
        description: editValues.description,
      };

      await post("/api/v1/admin/apis/set-api-price", payload);
      
      setApis((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, ...editValues } as ApiItem : item))
      );
      setEditingId(null);
      toast.success("API price updated successfully");
    } catch {
      toast.error("Failed to update API price");
    } finally {
      setSavingId(null);
    }
  };

  // ── Clear all filters ───────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch("");
    setVendor("");
  };

  const hasActiveFilters = search || vendor;

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<ApiItem>[] = [
    {
      id: "api_name",
      header: "API Name",
      width: 250,
      sortable: true,
      render: (val, row) => (
        <div className="space-y-1">
          {editingId === row.id ? (
            <Input
              value={editValues.api_name}
              onChange={(e) => handleInputChange("api_name", e.target.value)}
              className="h-8 border-slate-700 bg-slate-900 text-xs"
            />
          ) : (
            <p className="font-medium text-slate-200">{row.api_name}</p>
          )}
          <p className="font-mono text-[10px] text-slate-500">{row.endpoint}</p>
          {editingId === row.id ? (
            <Input
              value={editValues.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Description"
              className="h-8 border-slate-700 bg-slate-900 text-xs"
            />
          ) : (
            <p className="line-clamp-1 text-[11px] text-slate-400">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      id: "api_vendor",
      header: "Vendor",
      width: 150,
      render: (val, row) => (
        <div className="space-y-1">
          {editingId === row.id ? (
            <Select
              value={editValues.api_vendor}
              onValueChange={(v) => handleInputChange("api_vendor", v)}
            >
              <SelectTrigger className="h-8 border-slate-700 bg-slate-900 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900">
                {VENDORS.map((v) => (
                  <SelectItem key={v} value={v} className="text-xs text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className={`rounded-xl border px-2 py-0.5 text-[11px] font-medium ${vendorColors[row.api_vendor] || "bg-slate-800 text-slate-300 border-slate-700"}`}>
              {row.api_vendor}
            </span>
          )}
          {editingId === row.id ? (
            <Input
              value={editValues.api_vendor_url}
              onChange={(e) => handleInputChange("api_vendor_url", e.target.value)}
              placeholder="Vendor URL"
              className="h-8 border-slate-700 bg-slate-900 text-xs"
            />
          ) : (
            <p className="line-clamp-1 text-[10px] text-slate-500">{row.api_vendor_url}</p>
          )}
        </div>
      ),
    },
    {
      id: "method",
      header: "Method",
      width: 100,
      render: (val, row) => (
        editingId === row.id ? (
          <Select
            value={editValues.method}
            onValueChange={(v) => handleInputChange("method", v)}
          >
            <SelectTrigger className="h-8 border-slate-700 bg-slate-900 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              {METHODS.map((m) => (
                <SelectItem key={m} value={m} className="text-xs text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className={`text-[11px] font-bold ${row.method === "POST" ? "text-emerald-400" : "text-cyan-400"}`}>
            {row.method}
          </span>
        )
      ),
    },
    {
      id: "source_price",
      header: "Source",
      width: 100,
      sortable: true,
      render: (val, row) => (
        editingId === row.id ? (
          <Input
            type="number"
            value={editValues.source_price}
            onChange={(e) => handleInputChange("source_price", e.target.value)}
            className="h-8 border-slate-700 bg-slate-900 text-xs"
          />
        ) : (
          <span className="font-mono text-sm text-slate-400">₹{row.source_price}</span>
        )
      ),
    },
    {
      id: "user_price",
      header: "User",
      width: 100,
      sortable: true,
      render: (val, row) => (
        editingId === row.id ? (
          <Input
            type="number"
            value={editValues.user_price}
            onChange={(e) => handleInputChange("user_price", e.target.value)}
            className="h-8 border-slate-700 bg-slate-900 text-xs"
          />
        ) : (
          <span className="font-mono text-sm text-emerald-400">₹{row.user_price}</span>
        )
      ),
    },
    {
      id: "cooperative_price",
      header: "Cooperative",
      width: 100,
      sortable: true,
      render: (val, row) => (
        editingId === row.id ? (
          <Input
            type="number"
            value={editValues.cooperative_price}
            onChange={(e) => handleInputChange("cooperative_price", e.target.value)}
            className="h-8 border-slate-700 bg-slate-900 text-xs"
          />
        ) : (
          <span className="font-mono text-sm text-cyan-400">₹{row.cooperative_price}</span>
        )
      ),
    },
    {
      id: "commercial_price",
      header: "Commercial",
      width: 100,
      sortable: true,
      render: (val, row) => (
        editingId === row.id ? (
          <Input
            type="number"
            value={editValues.commercial_price}
            onChange={(e) => handleInputChange("commercial_price", e.target.value)}
            className="h-8 border-slate-700 bg-slate-900 text-xs"
          />
        ) : (
          <span className="font-mono text-sm text-amber-400">₹{row.commercial_price}</span>
        )
      ),
    },
    {
      id: "usage",
      header: "Usage Statistics",
      width: 200,
      render: (val, row) => {
        const UsageInfo = ({ title, data }: { title: string; data: any }) => (
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-tight text-slate-500">{title}</p>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] leading-none text-slate-400">200</span>
                <span className="text-[11px] font-bold text-emerald-400">{data.total_200.toLocaleString()}</span>
              </div>
              <div className="flex flex-col border-l border-slate-800 pl-3">
                <span className="text-[10px] leading-none text-slate-400">400</span>
                <span className="text-[11px] font-bold text-amber-500">{data.total_400.toLocaleString()}</span>
              </div>
              <div className="flex flex-col border-l border-slate-800 pl-3">
                <span className="text-[10px] leading-none text-slate-400">500</span>
                <span className="text-[11px] font-bold text-red-500">{data.total_500.toLocaleString()}</span>
              </div>
            </div>
          </div>
        );

        return (
          <div className="flex flex-col gap-2.5 py-1.5">
            <UsageInfo title="This Month" data={row.usage_this_month} />
            <div className="h-[1px] w-full border-t border-slate-800/50" />
            <UsageInfo title="Lifetime" data={row.usage_lifetime} />
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      width: 120,
      sticky: "right",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {editingId === row.id ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => saveChanges(row)}
                disabled={savingId === row.id}
              >
                {savingId === row.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                onClick={cancelEditing}
                disabled={savingId === row.id}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-slate-700 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-white"
              onClick={() => startEditing(row)}
            >
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading && apis.length === 0) {
    return <ApiPricingSkeleton />;
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <Title title="API Pricing" subTitle="Manage API costs and tiers" />

      {/* Filters bar */}
      <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search API name, endpoint..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border-slate-700 bg-slate-900 pl-10 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          </div>

          <Select value={vendor} onValueChange={setVendor}>
            <SelectTrigger className="w-[180px] border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem value="ALL" className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400">All Vendors</SelectItem>
              {VENDORS.map((v) => (
                <SelectItem key={v} value={v} className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400">
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-400 hover:text-white"
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchApis(1)}
            disabled={loading || refreshing}
            className="border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-white"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${loading || refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-400">
          Showing <span className="font-medium text-white">{apis.length}</span> of{" "}
          <span className="font-medium text-white">{total}</span> APIs
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <CustomTable<ApiItem>
          columns={columns}
          data={apis}
          loading={loading}
          loadingMore={loadingMore}
          keyExtractor={(row) => row.id}
          sort={sort}
          onSortChange={setSort}
          hasMore={page < totalPages}
          onLoadMore={handleLoadMore}
          emptyMessage="No APIs found"
          maxHeight="100%"
        />
      </div>
    </div>
  );
}
