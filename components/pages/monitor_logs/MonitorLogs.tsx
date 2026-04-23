"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Search,
  X,
  Activity,
  Code2,
  Calendar,
  Clock,
  User as UserIcon,
  Globe,
  ChevronRight,
  Monitor,
  AlertCircle,
  Hash,
  Copy,
  Check,
} from "lucide-react";
import { get } from "@/lib/api";
import Title from "@/components/custom/custom-title";
import {
  CustomTable,
  type ColumnDef,
  type SortState,
} from "@/components/custom/custom-table";
import { ViewDialog } from "@/components/custom/view-dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/utils/functions";
import { cn } from "@/lib/utils";
import {
  type AdminLog,
  type AdminLogsResponseData,
  type ApiResponse,
} from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;
const AUTO_REFRESH_INTERVAL = 10000; // 10s

const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusCodeColor = (code: number) => {
  if (code >= 200 && code < 300) return "text-emerald-400";
  if (code >= 300 && code < 400) return "text-cyan-400";
  if (code >= 400 && code < 500) return "text-amber-400";
  return "text-red-400";
};

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  POST: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  PUT: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/30",
  PATCH: "bg-purple-500/10 text-purple-400 border-purple-500/30",
};

const Field: React.FC<{
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: string;
}> = ({ label, value, mono, copyable }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!copyable) return;
    navigator.clipboard.writeText(copyable);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="group flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-sm text-slate-200",
            mono && "font-mono tracking-tight",
          )}
        >
          {value || <span className="text-slate-600">—</span>}
        </span>
        {copyable && value && (
          <button
            onClick={handleCopy}
            className="opacity-0 transition group-hover:opacity-100 hover:text-emerald-400"
            aria-label="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const MonitorLogs: React.FC = () => {
  // Data state
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");

  // Refs
  const hasLoadedRef = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ── Fetch logs ──────────────────────────────────────────────────────────
  const fetchLogs = useCallback(
    async (
      targetPage = 1,
      append = false,
      silent = false,
    ) => {
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
        if (search.trim()) params.search = search.trim();
        if (method && method !== "ALL") params.method = method;
        if (status && status !== "ALL") params.status = status;

        const res: ApiResponse<AdminLogsResponseData> = await get(
          "/api/v1/admin/logs",
          params as any,
        );
        await new Promise((r) => setTimeout(r, 1500)); // artificial delay for better loading state visibility

        if (res.responseStatus?.status) {
          const newLogs = res.responseData?.logs ?? [];
          setLogs((prev) => (append ? [...prev, ...newLogs] : newLogs));
          setTotal(res.responseData?.total ?? 0);
          setHasMore(res.responseData?.has_more ?? false);
          setPage(targetPage);
          hasLoadedRef.current = true;
        } else {
          toast.error(res.responseStatus?.message || "Failed to fetch logs");
        }
      } catch {
        toast.error("Failed to fetch logs");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, method, status],
  );

  // Initial load + filter changes
  useEffect(() => {
    fetchLogs(1, false);
  }, [fetchLogs]);

  // Auto refresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Only refresh first page silently if no search/filter active
      if (!search && !method && !status) {
        fetchLogs(1, false, true);
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchLogs, search, method, status]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchLogs(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchLogs]);

  // Search with debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      // fetchLogs will trigger via useEffect dependency
    }, 400);
  };

  // Clear filters
  const clearFilters = () => {
    setSearch("");
    setMethod("");
    setStatus("");
  };

  const hasActiveFilters = search || method || status;

  // ── Columns ─────────────────────────────────────────────────────────────
  const columns: ColumnDef<AdminLog>[] = [
    {
      id: "id",
      header: "ID",
      accessorKey: "id",
      width: 100,
      render: (val: string) => (
        <span className="font-mono text-[11px] text-slate-500">
          {val.slice(-8)}
        </span>
      ),
    },
    {
      id: "method",
      header: "Method",
      accessorKey: "method",
      width: 90,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl border px-2 py-0.5 text-[10px] font-bold",
            methodColors[val] || "bg-slate-800 text-slate-400 border-slate-700",
          )}
        >
          {val}
        </span>
      ),
    },
    {
      id: "url",
      header: "URL",
      accessorKey: "url",
      width: 320,
      render: (val: string) => (
        <span className="max-w-[300px] truncate font-mono text-[11px] text-slate-300">
          {val}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: 80,
      render: (val: number) => (
        <span className={cn("font-mono font-bold", statusCodeColor(val))}>
          {val}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Time",
      accessorKey: "duration",
      width: 100,
      render: (val: number) => (
        <div className="flex items-center gap-1.5 text-slate-400">
          <Clock className="h-3 w-3" />
          <span>{val}ms</span>
        </div>
      ),
    },
    {
      id: "user",
      header: "User",
      accessorKey: "user",
      width: 220,
      render: (val: AdminLog["user"]) =>
        val ? (
          <div className="flex flex-col">
            <span className="font-medium text-slate-200">{val.name || "—"}</span>
            <span className="text-[11px] text-slate-500">{val.email}</span>
          </div>
        ) : (
          <span className="text-slate-600">Non-Authorized</span>
        ),
    },
    {
      id: "timestamp",
      header: "Timestamp",
      accessorKey: "timestamp",
      width: 170,
      render: (val: string) => (
        <span className="text-slate-400">{formatDate(val)}</span>
      ),
    },
    {
      id: "actions",
      header: "Details",
      width: 100,
      resizable: false,
      sticky: "right",
      render: (_: any, row: AdminLog) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-emerald-500/50 hover:text-white"
        >
          <Code2 className="h-3.5 w-3.5" />
          View
        </button>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col gap-5">
      <Title title="Monitor Logs" subTitle="Live platform activity stream" />

      {/* Filters bar */}
      <Card className="border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search URL, user name, email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border-slate-700 bg-slate-900 pl-10 text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50"
            />
          </div>

          {/* Method */}
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger className="w-[140px] border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem
                value="ALL"
                className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
              >
                All Methods
              </SelectItem>
              {METHODS.map((m) => (
                <SelectItem
                  key={m}
                  value={m}
                  className="text-slate-300 focus:bg-emerald-500/10 focus:text-emerald-400"
                >
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px] border-slate-700 bg-slate-900 text-slate-300">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              <SelectItem value="ALL" className="text-slate-300">All Status</SelectItem>
              <SelectItem value="200" className="text-slate-300">200 OK</SelectItem>
              <SelectItem value="201" className="text-slate-300">201 Created</SelectItem>
              <SelectItem value="400" className="text-slate-300">400 Bad Request</SelectItem>
              <SelectItem value="401" className="text-slate-300">401 Unauth</SelectItem>
              <SelectItem value="403" className="text-slate-300">403 Forbidden</SelectItem>
              <SelectItem value="404" className="text-slate-300">404 Not Found</SelectItem>
              <SelectItem value="500" className="text-slate-300">500 Error</SelectItem>
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
            onClick={() => fetchLogs(1, false)}
            disabled={loading || refreshing}
            className="border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-white"
          >
            <RefreshCw
              className={cn(
                "mr-1.5 h-3.5 w-3.5",
                (loading || refreshing) && "animate-spin",
              )}
            />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-slate-400">
          Showing <span className="font-medium text-white">{logs.length}</span> of{" "}
          <span className="font-medium text-white">{total}</span> logs
          {hasMore && " · scroll for more"}
        </p>
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1">
        <CustomTable<AdminLog>
          columns={columns}
          data={logs}
          loading={loading}
          loadingMore={loadingMore}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => setSelectedLog(row)}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          emptyMessage="No activity logs found"
          maxHeight="100%"
        />
      </div>

      {/* Detail Dialog */}
      <ViewDialog
        open={!!selectedLog}
        onOpenChange={(v) => !v && setSelectedLog(null)}
        title="Request Details"
        icon={<Activity className="h-4 w-4" />}
        size="lg"
      >
        {selectedLog && (
          <div className="flex flex-col gap-6">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-4">
              <Field
                label="Method"
                value={
                  <span
                    className={cn(
                      "rounded-xl border px-2 py-0.5 text-[10px] font-bold",
                      methodColors[selectedLog.method],
                    )}
                  >
                    {selectedLog.method}
                  </span>
                }
              />
              <Field
                label="Status"
                value={
                  <span
                    className={cn(
                      "font-mono font-bold",
                      statusCodeColor(selectedLog.status),
                    )}
                  >
                    {selectedLog.status}
                  </span>
                }
              />
              <Field
                label="Duration"
                value={`${selectedLog.duration}ms`}
                mono
              />
              <Field
                label="Timestamp"
                value={formatDate(selectedLog.timestamp)}
              />
            </div>

            {/* URL */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Request URL
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <Globe className="h-4 w-4 text-slate-500 shrink-0" />
                <code className="break-all text-[12px] text-cyan-400">
                  {selectedLog.url}
                </code>
              </div>
            </div>

            {/* User */}
            {selectedLog.user && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  Triggered By
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {selectedLog.user.name || "Unnamed User"}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {selectedLog.user.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8 text-slate-500 hover:text-emerald-400"
                    onClick={() => window.open(`/users/${selectedLog.user?.id}`, "_blank")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Payloads */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Request Payload
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog.request_payload, null, 2));
                      toast.success("Copied");
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <pre className="font-mono text-[11px] leading-relaxed text-slate-300">
                    {selectedLog.request_payload
                      ? JSON.stringify(selectedLog.request_payload, null, 2)
                      : "No payload"}
                  </pre>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    Response Payload
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog.response_payload, null, 2));
                      toast.success("Copied");
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <pre className="font-mono text-[11px] leading-relaxed text-slate-300">
                    {selectedLog.response_payload
                      ? JSON.stringify(selectedLog.response_payload, null, 2)
                      : "No response body"}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </ViewDialog>
    </div>
  );
};

export default MonitorLogs;
