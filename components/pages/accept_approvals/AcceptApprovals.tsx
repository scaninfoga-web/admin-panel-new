"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Search,
  X,
  Check,
  Ban,
  Mail,
  Phone,
  Calendar,
  Wallet as WalletIcon,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { get, post } from "@/lib/api";
import Title from "@/components/custom/custom-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  CustomTable,
  type ColumnDef,
  type SortState,
} from "@/components/custom/custom-table";
import { ViewDialog } from "@/components/custom/view-dialog";
import { formatDate, formatINR } from "@/utils/functions";
import { cn } from "@/lib/utils";
import {
  UserTier,
  UserManageType,
  VerificationStatus,
  type UserListItem,
  type UsersListResponseData,
  type ApiResponse,
} from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;
const AUTO_REFRESH_INTERVAL = 10000;

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

const Skeleton: React.FC = () => (
  <div className="flex h-full flex-col gap-5">
    <div className="space-y-2">
      <div className="h-6 w-32 animate-pulse rounded-xl bg-slate-800/60" />
      <div className="h-3.5 w-56 animate-pulse rounded-xl bg-slate-800/40" />
    </div>
    <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
      <div className="h-9 w-full animate-pulse rounded-xl bg-slate-800/60" />
    </Card>
    <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="divide-y divide-slate-800">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-slate-800/20" />
        ))}
      </div>
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AcceptApprovals: React.FC = () => {
  const router = useRouter();

  // Data state
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const hasLoadedRef = useRef(false);

  // Rejection Dialog state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectUser, setRejectUser] = useState<UserListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Approval state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({
    column: "createdAt",
    order: "desc",
  });

  // Debounce search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch users ─────────────────────────────────────────────────────────
  const fetchUsers = useCallback(
    async (cursor?: string | null, append = false, silent = false) => {
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
          verification_status: "PENDING,REJECTED",
        };
        if (cursor) params.cursor = cursor;
        if (search.trim()) params.search = search.trim();
        if (sort.column) {
          params.sort_by = sort.column;
          params.sort_order = sort.order || "desc";
        }

        const res: ApiResponse<UsersListResponseData> = await get(
          "/api/v1/admin/users/all",
          params as any,
        );

        const newUsers = res.responseData?.users ?? [];
        setUsers((prev) => (append ? [...prev, ...newUsers] : newUsers));
        setNextCursor(res.responseData?.next_cursor ?? null);
        setHasNext(res.responseData?.has_next ?? false);
        hasLoadedRef.current = true;
      } catch {
        toast.error("Failed to fetch pending users");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, sort],
  );

  useEffect(() => {
    fetchUsers(null, false);
  }, [fetchUsers]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchUsers(null, false, true);
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchUsers]);

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasNext && nextCursor) {
      fetchUsers(nextCursor, true);
    }
  }, [loadingMore, hasNext, nextCursor, fetchUsers]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleApprove = async (user: UserListItem) => {
    setApprovingId(user.id);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.SET_VERIFICATION,
        user_id: user.id,
        verification_status: VerificationStatus.APPROVED,
      });
      toast.success(`${user.name || user.email} approved successfully`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      toast.error("Failed to approve user");
    } finally {
      setApprovingId(null);
    }
  };

  const openRejectDialog = (user: UserListItem) => {
    setRejectUser(user);
    setRejectReason("");
    setRejectOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectUser) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setRejecting(true);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.SET_VERIFICATION,
        user_id: rejectUser.id,
        verification_status: VerificationStatus.REJECTED,
        verification_rejection_reason: reason,
      });
      toast.success(`${rejectUser.name || rejectUser.email} rejected`);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === rejectUser.id
            ? { ...u, verification_status: VerificationStatus.REJECTED }
            : u,
        ),
      );
      setRejectOpen(false);
    } catch {
      toast.error("Failed to reject user");
    } finally {
      setRejecting(false);
    }
  };

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<UserListItem>[] = [
    {
      id: "name",
      header: "User Details",
      accessorKey: "name",
      width: 250,
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col gap-1 py-1">
          <p className="font-semibold text-slate-100">{val || "Unnamed User"}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Mail className="h-3 w-3" />
            <span>{row.email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-500/80">
            <Phone className="h-3 w-3" />
            <span>{row.mobile_number || "No mobile"}</span>
          </div>
        </div>
      ),
    },
    {
      id: "tier",
      header: "Tier",
      accessorKey: "tier",
      width: 140,
      sortable: true,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
            tierColors[val] || "bg-slate-800 text-slate-400",
          )}
        >
          {val.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "balance",
      header: "Wallet Info",
      width: 160,
      render: (_: any, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <WalletIcon className="h-3.5 w-3.5" />
            <span>{formatINR(row.balance ?? 0)}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {row.wallet_type || "No Wallet"}
          </span>
        </div>
      ),
    },
    {
      id: "verification_status",
      header: "Verification",
      accessorKey: "verification_status",
      width: 120,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
            verificationColors[val] || "bg-slate-800 text-slate-400",
          )}
        >
          {val}
        </span>
      ),
    },
    {
      id: "createdAt",
      header: "Requested On",
      accessorKey: "created_at",
      width: 180,
      sortable: true,
      render: (val: string) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-sm">{formatDate(val)}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Verification Actions",
      width: 240,
      resizable: false,
      sticky: "right",
      render: (_: any, row: UserListItem) => {
        const isApproving = approvingId === row.id;
        const isPending = row.verification_status === VerificationStatus.PENDING;
        
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleApprove(row);
              }}
              disabled={isApproving}
              className="h-8 border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/20"
            >
              {isApproving ? (
                <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              Approve
            </Button>
            {isPending && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openRejectDialog(row);
                }}
                className="h-8 border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-400 hover:border-red-500/60 hover:bg-red-500/20"
              >
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Reject
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading && users.length === 0) return <Skeleton />;

  return (
    <div className="flex h-full flex-col gap-5">
      <Title
        title="Accept Approvals"
        subTitle="Review and manage pending user verification requests"
      />

      {/* Filter Bar */}
      <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search by name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-slate-700 bg-slate-900 pl-10 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => fetchUsers(null, false)}
            disabled={refreshing}
            className="border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-white"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </Card>

      {/* Table Section */}
      <div className="min-h-0 flex-1">
        <CustomTable<UserListItem>
          columns={columns}
          data={users}
          loading={loading}
          loadingMore={loadingMore}
          keyExtractor={(row) => row.id}
          sort={sort}
          onSortChange={setSort}
          onRowClick={(row) => window.open(`/users/${row.id}`, "_blank")}
          hasMore={hasNext}
          onLoadMore={handleLoadMore}
          emptyMessage="No pending verifications found"
          maxHeight="100%"
        />
      </div>

      {/* Rejection Dialog */}
      <ViewDialog
        open={rejectOpen}
        onOpenChange={(v) => !rejecting && setRejectOpen(v)}
        title="Reject Verification"
        icon={<UserX className="h-5 w-5" />}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {rejectUser ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-lg font-bold text-red-400">
                  {rejectUser.name?.[0] || rejectUser.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {rejectUser.name || "Unnamed User"}
                  </p>
                  <p className="text-xs text-slate-400">{rejectUser.email}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Reason for Rejection
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Invalid document, information mismatch, etc."
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />
            <p className="text-[10px] text-slate-500 italic">
              * This reason will be visible to the user and the admin team.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
              className="text-slate-400 hover:bg-slate-800/50 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectSubmit}
              disabled={rejecting || !rejectReason.trim() || !rejectUser}
              className="bg-red-500 font-semibold text-white hover:bg-red-600"
            >
              {rejecting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Confirm Rejection
            </Button>
          </div>
        </div>
      </ViewDialog>
    </div>
  );
};

export default AcceptApprovals;
