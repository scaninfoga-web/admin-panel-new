"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Bell, RefreshCw, Search, X } from "lucide-react";
import { get } from "@/lib/api";
import Title from "@/components/custom/custom-title";
import {
  CustomTable,
  type ColumnDef,
  type SortState,
} from "@/components/custom/custom-table";
import { formatDate } from "@/utils/functions";
import {
  UserTier,
  VerificationStatus,
  type UserListItem,
  type UsersListResponseData,
  type ApiResponse,
} from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS = Object.values(UserTier);
const VERIFICATION_STATUSES = Object.values(VerificationStatus);
const PAGE_SIZE = 30;
const AUTO_REFRESH_INTERVAL = 5000;

// ─── Badge helpers ────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  NORMAL: "bg-slate-500/10 text-slate-400",
  COOPERATIVE: "bg-cyan-500/10 text-cyan-400",
  COOPERATIVE_MEMBER: "bg-purple-500/10 text-purple-400",
  COMMERCIAL: "bg-amber-500/10 text-amber-400",
  ADMIN: "bg-red-500/10 text-red-400",
};

const verificationColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-400",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const UsersSkeleton: React.FC = () => (
  <div className="flex h-full flex-col gap-5">
    <div className="space-y-2">
      <div className="h-6 w-32 animate-pulse rounded-xl bg-slate-800/60" />
      <div className="h-3.5 w-56 animate-pulse rounded-xl bg-slate-800/40" />
    </div>

    <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 min-w-[240px] flex-1 animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-9 w-[160px] animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-9 w-[160px] animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-9 w-[130px] animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-9 w-[96px] animate-pulse rounded-xl bg-slate-800/40" />
      </div>
    </Card>

    <div className="flex items-center justify-between px-1">
      <div className="h-4 w-40 animate-pulse rounded-xl bg-slate-800/40" />
    </div>

    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/70 px-4 py-3">
        {[200, 90, 90, 100, 120, 90, 170, 220].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-xl bg-slate-800/60"
            style={{ width: `${w * 0.5}px` }}
          />
        ))}
      </div>
      <div className="divide-y divide-slate-800">
        {Array.from({ length: 10 }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center gap-4 px-4 py-4"
            style={{ opacity: 1 - rowIdx * 0.06 }}
          >
            <div className="flex-1 space-y-2" style={{ maxWidth: 200 }}>
              <div className="h-3 w-3/4 animate-pulse rounded-xl bg-slate-800/60" />
              <div className="h-2.5 w-1/2 animate-pulse rounded-xl bg-slate-800/40" />
              <div className="h-2.5 w-2/3 animate-pulse rounded-xl bg-slate-800/40" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-3 w-20 animate-pulse rounded-xl bg-slate-800/40" />
            <div className="h-6 w-20 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-6 w-24 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-6 w-16 animate-pulse rounded-xl bg-slate-800/60" />
            <div className="h-3 w-32 animate-pulse rounded-xl bg-slate-800/40" />
            <div className="ml-auto flex items-center gap-2">
              <div className="h-7 w-14 animate-pulse rounded-xl bg-slate-800/60" />
              <div className="h-7 w-20 animate-pulse rounded-xl bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Users: React.FC = () => {
  const router = useRouter();

  // Data state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const hasLoadedRef = useRef(false);

  // Filters
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [isActive, setIsActive] = useState("");

  // Sort
  const [sort, setSort] = useState<SortState>({
    column: "createdAt",
    order: "desc",
  });

  const [pendingCount, setPendingCount] = useState(0);
  const [hasMorePending, setHasMorePending] = useState(false);

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch users ─────────────────────────────────────────────────────────
  const fetchUsers = useCallback(
    async (cursor?: string | null, append = false, silent = false) => {
      if (append) {
        setLoadingMore(true);
        await new Promise((res) => setTimeout(res, 100));
      } else if (!hasLoadedRef.current) {
        setLoading(true);
      } else if (!silent) {
        setRefreshing(true);
      }

      try {
        const params: Record<string, string> = {
          limit: String(PAGE_SIZE),
        };
        if (cursor) params.cursor = cursor;
        if (search.trim()) params.search = search.trim();
        if (tier) params.tier = tier;
        if (verificationStatus) params.verification_status = verificationStatus;
        if (isActive) params.is_active = isActive;
        if (sort.column) {
          params.sort_by = sort.column;
          params.sort_order = sort.order || "desc";
        }

        const res: ApiResponse<UsersListResponseData> = await get(
          "/api/v1/admin/users/all",
          params as any,
        );

        const pendingRes: ApiResponse<UsersListResponseData> = await get(
          "/api/v1/admin/users/all?verification_status=PENDING",
        );

        const newUsers = res.responseData?.users ?? [];
        setUsers((prev) => (append ? [...prev, ...newUsers] : newUsers));
        setNextCursor(res.responseData?.next_cursor ?? null);
        setHasNext(res.responseData?.has_next ?? false);
        hasLoadedRef.current = true;

        if (pendingRes?.responseData) {
          setPendingCount(pendingRes.responseData.users?.length || 0);
          setHasMorePending(pendingRes.responseData.has_next || false);
        }
      } catch {
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, tier, verificationStatus, isActive, sort],
  );

  // Initial load + filter/sort changes (silent swap after first mount)
  useEffect(() => {
    fetchUsers(null, false);
  }, [fetchUsers]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchUsers(null, false, true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchUsers]);

  // Infinite scroll — load next page
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNext && nextCursor) {
      fetchUsers(nextCursor, true);
    }
  }, [loadingMore, hasNext, nextCursor, fetchUsers]);

  // ── Search with debounce ────────────────────────────────────────────────
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      // fetchUsers triggers via useEffect dependency on `search`
    }, 400);
  };

  useEffect(() => {
    return () => {
      clearTimeout(searchTimer.current);
    };
  }, []);

  // ── Clear all filters ───────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch("");
    setTier("");
    setVerificationStatus("");
    setIsActive("");
  };

  const hasActiveFilters = search || tier || verificationStatus || isActive;

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<UserListItem>[] = [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      width: 200,
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-medium text-slate-200">{val || "—"}</p>
          <p className="font-medium text-amber-500">{row.mobile_number}</p>
          <p className="font-medium text-blue-500">{row.email}</p>
        </div>
      ),
    },
    {
      id: "tier",
      header: "Tier",
      accessorKey: "tier",
      width: 90,
      sortable: true,
      render: (val: string) => (
        <span
          className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase ${tierColors[val] || "bg-slate-800 text-slate-400"}`}
        >
          {val?.replace(/_/g, " ")}
        </span>
      ),
    },

    {
      id: "balance",
      header: "Balance",
      accessorKey: "balance",
      width: 90,
      render: (val: number | null) => (
        <span className="font-medium text-white">
          {val !== null ? `₹${val.toLocaleString("en-IN")}` : "—"}
        </span>
      ),
    },
    {
      id: "wallet_type",
      header: "Wallet",
      accessorKey: "wallet_type",
      width: 100,
      render: (val: string | null) =>
        val ? (
          <span className="rounded-xl bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            {val}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "verification_status",
      header: "Verification",
      width: 120,
      accessorKey: "verification_status",
      render: (val: string) => (
        <span
          className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase ${verificationColors[val] || "bg-slate-800 text-slate-400"}`}
        >
          {val}
        </span>
      ),
    },
    {
      id: "is_active",
      header: "Status",
      accessorKey: "is_active",
      width: 90,
      render: (val: boolean) => (
        <span
          className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold ${val ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
        >
          {val ? "Active" : "Inactive"}
        </span>
      ),
    },

    {
      id: "createdAt",
      header: "Joined",
      accessorKey: "created_at",
      width: 170,
      sortable: true,
      render: (val: string) => (
        <span className="text-slate-400">{formatDate(val)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      width: 220,
      resizable: false,
      sticky: "right",
      render: (_: any, row: UserListItem) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-slate-700 text-xs text-slate-300 hover:border-emerald-500/50 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/users/${row.id}`, "_blank");
            }}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading && users.length === 0) {
    return <UsersSkeleton />;
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <Title title="Users" subTitle="Manage all platform users" />

      {/* Filters bar */}
      <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search name, email, mobile..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border-slate-700 bg-slate-900 pl-10 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          </div>

          {/* Tier */}
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="w-[160px] border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem
                value="ALL"
                className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
              >
                All Tiers
              </SelectItem>
              {TIERS.map((t) => (
                <SelectItem
                  key={t}
                  value={t}
                  className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
                >
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Verification */}
          <Select
            value={verificationStatus}
            onValueChange={setVerificationStatus}
          >
            <SelectTrigger className="w-[160px] border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="Verification" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem
                value="ALL"
                className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
              >
                All Statuses
              </SelectItem>
              {VERIFICATION_STATUSES.map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active status */}
          <Select value={isActive} onValueChange={setIsActive}>
            <SelectTrigger className="w-[130px] border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="Active" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem
                value="ALL"
                className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
              >
                All
              </SelectItem>
              <SelectItem
                value="true"
                className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
              >
                Active
              </SelectItem>
              <SelectItem
                value="false"
                className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
              >
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Clear + Refresh */}
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
            onClick={() => fetchUsers(null, false)}
            disabled={loading || refreshing}
            className="border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-white"
          >
            <RefreshCw
              className={`mr-1.5 h-3.5 w-3.5 ${loading || refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/accept_approvals")}
            className="relative h-9 w-9 border-slate-700 bg-slate-900 p-0 text-slate-400 hover:border-emerald-500/50 hover:text-white"
          >
            <Bell className="h-3.5 w-3.5" />
            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#060b17]">
                {pendingCount}
                {hasMorePending && "+"}
              </span>
            )}
          </Button>
        </div>
      </Card>

      {/* Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-400">
          <span className="font-medium text-white">{users.length}</span> users
          loaded
          {hasNext && " · scroll for more"}
        </p>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1">
        <CustomTable<UserListItem>
          columns={columns}
          data={users}
          loading={loading}
          loadingMore={loadingMore}
          keyExtractor={(row) => row.id}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(row) => router.push(`/users/${row.id}`)}
          hasMore={hasNext}
          onLoadMore={handleLoadMore}
          emptyMessage="No users found"
          maxHeight="100%"
        />
      </div>
    </div>
  );
};

export default Users;
