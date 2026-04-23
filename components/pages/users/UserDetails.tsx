"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Shield,
  Wallet as WalletIcon,
  Key,
  Activity,
  Copy,
  Check,
  Building2,
  MapPin,
  IdCard,
  Users as UsersIcon,
  CreditCard,
  Globe,
  Cpu,
  Monitor,
  Battery,
  Languages,
  Smartphone,
  Network,
  CircleDollarSign,
  TrendingUp,
  FileText,
  AlertCircle,
  Code2,
  Plus,
  Power,
  X,
  Eye,
  EyeOff,
  History,
  Save,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { get, post } from "@/lib/api";
import { Loader } from "@/components/custom/custom-loader";
import CustomTabs from "@/components/custom/custom-tab";
import { CustomTable, type ColumnDef } from "@/components/custom/custom-table";
import { ViewDialog } from "@/components/custom/view-dialog";
import { formatDate, formatINR } from "@/utils/functions";
import { cn } from "@/lib/utils";
import {
  UserTier,
  UserManageType,
  WalletType,
  ApiKeyStatus,
  type ActivityHeaders,
  type ActivityLog,
  type ApiKey,
  type ApiPricing,
  type ApiResponse,
  type SubUser,
  type Transaction,
  type UserDetail,
  VerificationStatus,
} from "@/lib/types";

// ─── Badge helpers ────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  NORMAL: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  COOPERATIVE: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  COOPERATIVE_MEMBER: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  COMMERCIAL: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  ADMIN: "bg-red-500/10 text-red-400 border-red-500/30",
};

const verificationColors: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-400",
};

const txnStatusColors: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-400",
  PENDING: "bg-amber-500/10 text-amber-400",
  FAILED: "bg-red-500/10 text-red-400",
};

const txnTypeColors: Record<string, string> = {
  CREDIT: "bg-emerald-500/10 text-emerald-400",
  DEBIT: "bg-red-500/10 text-red-400",
  REFUND: "bg-cyan-500/10 text-cyan-400",
};

// ─── Small helpers ────────────────────────────────────────────────────────────


const getInitials = (name: string | null, email: string) => {
  const src = name?.trim() || email;
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
};

const statusCodeColor = (code: number) => {
  if (code >= 200 && code < 300) return "text-emerald-400";
  if (code >= 300 && code < 400) return "text-cyan-400";
  if (code >= 400 && code < 500) return "text-amber-400";
  return "text-red-400";
};

// ─── Reusable bits ────────────────────────────────────────────────────────────

const SectionCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}> = ({ title, icon, children, className, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={cn(
      "rounded-xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl",
      className,
    )}
  >
    <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </motion.div>
);

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

const ApiKeyCell: React.FC<{ value: string }> = ({ value }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const masked =
    value.length <= 6
      ? "•".repeat(value.length)
      : `${value.slice(0, 4)}${"•".repeat(Math.max(value.length - 8, 4))}${value.slice(-4)}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Key copied");
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[140px] truncate font-mono text-[11px] text-slate-300">
        {revealed ? value : masked}
      </span>
      <button
        onClick={() => setRevealed((r) => !r)}
        className="text-slate-500 hover:text-emerald-400"
        aria-label={revealed ? "Hide" : "Reveal"}
      >
        {revealed ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        onClick={handleCopy}
        className="text-slate-500 hover:text-emerald-400"
        aria-label="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  accent: string;
}> = ({ label, value, icon, accent }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3 }}
    transition={{ duration: 0.3 }}
    className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30"
  >
    <div
      className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
        accent,
      )}
    />
    <div className="relative flex items-start justify-between">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/60 text-slate-300">
        {icon}
      </div>
    </div>
  </motion.div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const UserDetails: React.FC<{ userId: string }> = ({ userId }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<ApiPricing | null>(
    null,
  );

  // Credit balance dialog
  const [creditOpen, setCreditOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [crediting, setCrediting] = useState(false);

  // Block dialog
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [togglingActive, setTogglingActive] = useState(false);

  // Wallet type toggle
  const [walletTypeSaving, setWalletTypeSaving] = useState(false);

  // Credit limit editor
  const [creditLimitEdit, setCreditLimitEdit] = useState("");
  const [creditLimitSaving, setCreditLimitSaving] = useState(false);

  // Sub-users dialog
  const [subUsersOpen, setSubUsersOpen] = useState(false);

  // Toggle api key
  const [togglingKeyId, setTogglingKeyId] = useState<string | null>(null);
  const [apiKeyBlockTarget, setApiKeyBlockTarget] = useState<ApiKey | null>(
    null,
  );
  const [apiKeyBlockReason, setApiKeyBlockReason] = useState("");

  // Inline price edits (keyed by api_id)
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [priceNotes, setPriceNotes] = useState<Record<string, string>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);

  const fetchUser = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      try {
        const res: ApiResponse<UserDetail> = await get(
          "/api/v1/admin/users/details",
          {
            user_id: userId,
            activity_limit: "1000",
          } as any,
        );
        if (res.responseStatus?.status) {
          setUser(res.responseData);
        } else {
          toast.error(res.responseStatus?.message || "Failed to load user");
        }
      } catch {
        toast.error("Failed to load user");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchUser(false);
  }, [fetchUser]);

  const handleCreditBalance = async () => {
    const amt = Number(creditAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const note = creditNote.trim();
    if (note.length > 500) {
      toast.error("Note must be at most 500 characters");
      return;
    }
    setCrediting(true);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.CREDIT,
        user_id: userId,
        credit_amount: amt,
        ...(note ? { note } : {}),
      });
      toast.success(`₹${amt.toLocaleString("en-IN")} credited`);
      setCreditOpen(false);
      setCreditAmount("");
      setCreditNote("");
      fetchUser(true);
    } catch {
      toast.error("Failed to credit balance");
    } finally {
      setCrediting(false);
    }
  };

  const handleApiKeyToggleClick = (row: ApiKey) => {
    if (row.status === ApiKeyStatus.ACTIVE) {
      setApiKeyBlockTarget(row);
      setApiKeyBlockReason("");
      return;
    }
    void performToggleApiKey(row, true);
  };

  const performToggleApiKey = async (
    row: ApiKey,
    nextActive: boolean,
    reason?: string,
  ) => {
    setTogglingKeyId(row.id);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.TOGGLE_API_KEY,
        user_id: userId,
        api_key_id: row.id,
        is_active: nextActive,
        ...(reason ? { block_reason: reason } : {}),
      });
      toast.success(nextActive ? "API key activated" : "API key blocked");
      setUser((prev) =>
        prev
          ? {
              ...prev,
              api_keys: prev.api_keys.map((k) =>
                k.id === row.id
                  ? {
                      ...k,
                      status: nextActive
                        ? ApiKeyStatus.ACTIVE
                        : ApiKeyStatus.BLOCKED,
                      block_reason: nextActive ? null : reason ?? null,
                    }
                  : k,
              ),
            }
          : prev,
      );
      setApiKeyBlockTarget(null);
      setApiKeyBlockReason("");
    } catch {
      toast.error(
        nextActive ? "Failed to activate API key" : "Failed to block API key",
      );
    } finally {
      setTogglingKeyId(null);
    }
  };

  const handleApiKeyBlockSubmit = () => {
    if (!apiKeyBlockTarget) return;
    const reason = apiKeyBlockReason.trim();
    if (!reason) {
      toast.error("Block reason is required");
      return;
    }
    if (reason.length > 500) {
      toast.error("Reason must be at most 500 characters");
      return;
    }
    void performToggleApiKey(apiKeyBlockTarget, false, reason);
  };

  const handleToggleActiveClick = () => {
    if (!user) return;
    if (user.is_active) {
      setBlockReason("");
      setBlockOpen(true);
      return;
    }
    void performToggleActive(true);
  };

  const performToggleActive = async (nextActive: boolean, reason?: string) => {
    if (!user) return;
    setTogglingActive(true);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.TOGGLE_USER,
        user_id: userId,
        is_active: nextActive,
        ...(reason ? { block_reason: reason } : {}),
      });
      toast.success(nextActive ? "User activated" : "User deactivated");
      setUser({
        ...user,
        is_active: nextActive,
        block_reason: nextActive ? null : reason ?? null,
      });
      setBlockOpen(false);
      setBlockReason("");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleBlockSubmit = () => {
    const reason = blockReason.trim();
    if (!reason) {
      toast.error("Block reason is required");
      return;
    }
    if (reason.length > 500) {
      toast.error("Reason must be at most 500 characters");
      return;
    }
    void performToggleActive(false, reason);
  };

  const handleWalletTypeChange = async (nextType: WalletType) => {
    if (!user?.wallet || user.wallet.wallet_type === nextType) return;
    setWalletTypeSaving(true);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.SET_WALLET_TYPE,
        user_id: userId,
        wallet_type: nextType,
      });
      toast.success(`Wallet set to ${nextType}`);
      setUser((prev) =>
        prev && prev.wallet
          ? { ...prev, wallet: { ...prev.wallet, wallet_type: nextType } }
          : prev,
      );
    } catch {
      toast.error("Failed to update wallet type");
    } finally {
      setWalletTypeSaving(false);
    }
  };

  const handleSaveCreditLimit = async () => {
    if (!user?.wallet) return;
    const raw = creditLimitEdit.trim();
    if (!raw) {
      toast.error("Enter a credit limit");
      return;
    }
    const limit = Number(raw);
    if (Number.isNaN(limit) || limit < 0) {
      toast.error("Invalid credit limit");
      return;
    }
    if (limit === user.wallet.credit_limit) {
      toast.info("No change in credit limit");
      return;
    }
    setCreditLimitSaving(true);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.SET_CREDIT_LIMIT,
        user_id: userId,
        credit_limit: limit,
      });
      toast.success(`Credit limit set to ${formatINR(limit)}`);
      setUser((prev) =>
        prev && prev.wallet
          ? { ...prev, wallet: { ...prev.wallet, credit_limit: limit } }
          : prev,
      );
      setCreditLimitEdit("");
    } catch {
      toast.error("Failed to update credit limit");
    } finally {
      setCreditLimitSaving(false);
    }
  };

  const handleSavePrice = async (row: ApiPricing) => {
    const raw = priceEdits[row.api_id];
    if (raw === undefined || raw === "") {
      toast.error("Enter a price");
      return;
    }
    const price = Number(raw);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Invalid price");
      return;
    }
    const note = priceNotes[row.api_id]?.trim();
    setSavingPriceId(row.api_id);
    try {
      await post("/api/v1/admin/users/manage", {
        type: UserManageType.SET_CUSTOM_PRICING,
        user_id: userId,
        custom_api_pricings: [
          { api_id: row.api_id, price, ...(note ? { note } : {}) },
        ],
      });
      toast.success(`${row.api_name} price updated`);
      setPriceEdits((p) => {
        const { [row.api_id]: _, ...rest } = p;
        return rest;
      });
      setPriceNotes((p) => {
        const { [row.api_id]: _, ...rest } = p;
        return rest;
      });
      fetchUser(true);
    } catch {
      toast.error("Failed to update price");
    } finally {
      setSavingPriceId(null);
    }
  };

  // Latest device headers from the most recent log that has populated headers
  const latestDevice = useMemo<ActivityHeaders | null>(() => {
    if (!user?.activity_logs) return null;
    const found = user.activity_logs.find(
      (log) => log.headers && (log.headers.device || log.headers.public_ip || log.headers.ip || log.headers.city),
    );
    return found?.headers ?? null;
  }, [user]);

  // Tier-based visibility
  const tier: UserTier = user?.tier ?? UserTier.NORMAL;
  const isCommericialUser = tier === UserTier.COMMERCIAL;
  const showCooperativeKyc = tier === UserTier.COOPERATIVE;
  const showParent = tier === UserTier.COOPERATIVE_MEMBER && !!user?.parent;
  const showSubUsers =
    tier === UserTier.COOPERATIVE && (user?.sub_users?.length ?? 0) > 0;
  const canManageBilling =
    tier === UserTier.COMMERCIAL || tier === UserTier.COOPERATIVE;

  if (loading) return <Loader />;

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm">User not found</p>
        <Link
          href="/users"
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          ← Back to users
        </Link>
      </div>
    );
  }

  // ── Transaction columns ─────────────────────────────────────────────────
  const txnColumns: ColumnDef<Transaction>[] = [
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      width: 100,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase",
            txnTypeColors[val] || "bg-slate-500/10 text-slate-400",
          )}
        >
          {val}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: 100,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase",
            txnStatusColors[val] || "bg-slate-500/10 text-slate-400",
          )}
        >
          {val}
        </span>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      width: 120,
      render: (val: number, row) => (
        <span
          className={cn(
            "font-semibold",
            row.type === "CREDIT" ? "text-emerald-400" : "text-red-400",
          )}
        >
          {row.type === "CREDIT" ? "+" : "−"}
          {formatINR(Math.abs(val))}
        </span>
      ),
    },
    {
      id: "balance_after",
      header: "Balance After",
      accessorKey: "balance_after",
      width: 130,
      render: (val: number) => (
        <span className="font-medium text-slate-200">{formatINR(val)}</span>
      ),
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      width: 240,
      render: (val: string | null) => (
        <span className="text-slate-400">{val || "—"}</span>
      ),
    },
    {
      id: "reference_id",
      header: "Reference",
      accessorKey: "reference_id",
      width: 180,
      render: (val: string | null) => (
        <span className="font-mono text-[11px] text-slate-500">
          {val || "—"}
        </span>
      ),
    },
    {
      id: "created_at",
      header: "Date",
      accessorKey: "created_at",
      width: 170,
      render: (val: string) => (
        <span className="text-slate-400">{formatDate(val)}</span>
      ),
    },
  ];

  // ── API Keys columns ────────────────────────────────────────────────────
  const apiKeyColumns: ColumnDef<ApiKey>[] = [
    {
      id: "type",
      header: "Type",
      accessorKey: "type",
      width: 110,
      render: (val: string) => (
        <span className="rounded-xl bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase text-cyan-400">
          {val}
        </span>
      ),
    },
    {
      id: "key",
      header: "Key",
      accessorKey: "key",
      width: 220,
      render: (val: string) => <ApiKeyCell value={val} />,
    },
    {
      id: "status",
      header: "Status",
      accessorKey: "status",
      width: 100,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase",
            val === "ACTIVE"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400",
          )}
        >
          {val}
        </span>
      ),
    },
    {
      id: "total_amount_utilized",
      header: "Utilized",
      accessorKey: "total_amount_utilized",
      width: 120,
      render: (val: number) => (
        <span className="font-semibold text-white">{formatINR(val)}</span>
      ),
    },
    {
      id: "last_used_at",
      header: "Last Used",
      accessorKey: "last_used_at",
      width: 170,
      render: (val: string | null) => (
        <span className="text-slate-400">
          {val ? formatDate(val) : "Never"}
        </span>
      ),
    },
    {
      id: "expires_at",
      header: "Expires",
      accessorKey: "expires_at",
      width: 170,
      render: (val: string | null) => (
        <span className="text-slate-400">{val ? formatDate(val) : "—"}</span>
      ),
    },
    {
      id: "created_at",
      header: "Created",
      accessorKey: "created_at",
      width: 170,
      render: (val: string) => (
        <span className="text-slate-400">{formatDate(val)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      width: 140,
      resizable: false,
      sticky: "right",
      render: (_: any, row: ApiKey) => {
        const isActive = row.status === "ACTIVE";
        const isLoading = togglingKeyId === row.id;
        return (
          <button
            onClick={() => handleApiKeyToggleClick(row)}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[11px] font-semibold transition disabled:opacity-50",
              isActive
                ? "border-red-500/30 bg-red-500/10 text-red-400 hover:border-red-400 hover:bg-red-500/20"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/20",
            )}
          >
            {isActive ? (
              <Ban className={cn("h-3 w-3", isLoading && "animate-pulse")} />
            ) : (
              <Power className={cn("h-3 w-3", isLoading && "animate-pulse")} />
            )}
            {isActive ? "Block" : "Activate"}
          </button>
        );
      },
    },
  ];

  // ── API pricing columns ─────────────────────────────────────────────────
  const pricingColumns: ColumnDef<ApiPricing>[] = [
    {
      id: "sno",
      header: "S.No",
      width: 70,
      resizable: false,
      render: (_val: any, _row: ApiPricing, index: number) => (
        <span className="font-mono text-[11px] text-slate-400">{index + 1}</span>
      ),
    },
    {
      id: "api_name",
      header: "API",
      accessorKey: "api_name",
      width: 220,
      render: (val: string, row) => (
        <div>
          <p className="font-medium text-slate-200">{val}</p>
          <p className="font-mono text-[11px] text-slate-500">{row.endpoint}</p>
        </div>
      ),
    },
    {
      id: "user_commercial_price",
      header: `${user.name || "User"} Price`,
      width: 220,
      resizable: false,
      render: (_: any, row: ApiPricing) => {
        const editing = priceEdits[row.api_id] !== undefined;
        const displayValue = editing
          ? priceEdits[row.api_id]
          : row.custom_price != null
            ? String(row.custom_price)
            : "";
        const saving = savingPriceId === row.api_id;
        const dirty =
          editing &&
          priceEdits[row.api_id] !==
            (row.custom_price != null ? String(row.custom_price) : "");
        return (
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
                ₹
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={displayValue}
                placeholder="—"
                onChange={(e) =>
                  setPriceEdits((p) => ({
                    ...p,
                    [row.api_id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dirty && !saving) handleSavePrice(row);
                }}
                disabled={saving}
                className="w-24 rounded-xl border border-slate-700 bg-slate-900/60 py-1 pl-5 pr-2 text-[12px] font-semibold text-emerald-400 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
            <input
              type="text"
              value={priceNotes[row.api_id] ?? ""}
              placeholder="Note"
              maxLength={500}
              onChange={(e) =>
                setPriceNotes((p) => ({
                  ...p,
                  [row.api_id]: e.target.value,
                }))
              }
              disabled={saving}
              className="w-20 rounded-xl border border-slate-700 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSavePrice(row)}
              disabled={!dirty || saving}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-xl border transition",
                dirty && !saving
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/20"
                  : "border-slate-800 bg-slate-900/60 text-slate-600",
              )}
              aria-label="Save price"
            >
              {saving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </button>
          </div>
        );
      },
    },
    {
      id: "commercial_price",
      header: "Commercial Price",
      accessorKey: "commercial_price",
      width: 140,
      render: (val: number) => (
        <span className="font-semibold text-white">{formatINR(val)}</span>
      ),
    },
    {
      id: "source_price",
      header: "Source Price",
      accessorKey: "source_price",
      width: 130,
      render: (val: number) => (
        <span className="font-semibold text-white">{formatINR(val)}</span>
      ),
    },
    {
      id: "method",
      header: "Method",
      accessorKey: "method",
      width: 90,
      render: (val: string) => (
        <span className="rounded-xl bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
          {val}
        </span>
      ),
    },
    {
      id: "history",
      header: "History",
      width: 120,
      resizable: false,
      render: (_: any, row: ApiPricing) => {
        const count = row.price_history?.length ?? 0;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPricing(row);
            }}
            disabled={count === 0}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-medium transition",
              count > 0
                ? "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400"
                : "border-slate-800 bg-slate-900/40 text-slate-600",
            )}
          >
            <History className="h-3 w-3" />
            View ({count})
          </button>
        );
      },
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      width: 280,
      render: (val: string | null) => (
        <span className="text-slate-400">{val || "—"}</span>
      ),
    },
  ];

  // ── Activity log columns ────────────────────────────────────────────────
  const activityColumns: ColumnDef<ActivityLog>[] = [
    {
      id: "endpoint",
      header: "Endpoint",
      accessorKey: "endpoint",
      width: 260,
      render: (val: string, row) => (
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
            {row.method}
          </span>
          <span className="font-mono text-[11px] text-slate-300">{val}</span>
        </div>
      ),
    },
    {
      id: "status_code",
      header: "Code",
      accessorKey: "status_code",
      width: 80,
      render: (val: number) => (
        <span className={cn("font-mono font-bold", statusCodeColor(val))}>
          {val}
        </span>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      accessorKey: "duration",
      width: 100,
      render: (val: number) => <span className="text-slate-400">{val}ms</span>,
    },
    {
      id: "cost",
      header: "Cost",
      width: 100,
      render: (_: any, row) => {
        const delta = row.before_balance - row.after_balance;
        return (
          <span
            className={cn(
              "font-semibold",
              delta > 0 ? "text-red-400" : "text-slate-500",
            )}
          >
            {delta > 0 ? formatINR(delta) : "—"}
          </span>
        );
      },
    },
    {
      id: "location",
      header: "Location",
      width: 180,
      render: (_: any, row) => {
        const h = row.headers;
        const loc = [h.city, h.country].filter(Boolean).join(", ");
        return (
          <div className="flex flex-col">
            <span className="text-slate-300">{loc || "—"}</span>
            <span className="font-mono text-[10px] text-slate-500">
              {h.public_ip || h.ip || "—"}
            </span>
          </div>
        );
      },
    },
    {
      id: "device",
      header: "Device",
      width: 150,
      render: (_: any, row) => (
        <div className="flex flex-col">
          <span className="text-slate-300">{row.headers.device || "—"}</span>
          <span className="text-[10px] text-slate-500">
            {row.headers.browser || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "timestamp",
      header: "Time",
      accessorKey: "timestamp",
      width: 170,
      render: (val: string) => (
        <span className="text-slate-400">{formatDate(val)}</span>
      ),
    },
    {
      id: "payload",
      header: "Payload",
      width: 110,
      resizable: false,
      sticky: "right",
      render: (_: any, row: ActivityLog) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(row);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-400"
        >
          <Code2 className="h-3 w-3" />
          View
        </button>
      ),
    },
  ];

  // ── Sub-user columns ────────────────────────────────────────────────────
  const subUserColumns: ColumnDef<SubUser>[] = [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      width: 200,
      render: (val, row) => (
        <div>
          <p className="font-medium text-slate-200">{val || "—"}</p>
          <p className="text-[11px] text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      id: "mobile_number",
      header: "Mobile",
      accessorKey: "mobile_number",
      width: 140,
      render: (val: string | null) => (
        <span className="font-mono text-slate-300">{val || "—"}</span>
      ),
    },
    {
      id: "tier",
      header: "Tier",
      accessorKey: "tier",
      width: 140,
      render: (val: string) => (
        <span
          className={cn(
            "rounded-xl border px-2.5 py-1 text-[11px] font-semibold uppercase",
            tierColors[val] || "bg-slate-500/10 text-slate-400",
          )}
        >
          {val.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "is_active",
      header: "Status",
      accessorKey: "is_active",
      width: 100,
      render: (val: boolean) => (
        <span
          className={cn(
            "rounded-xl px-2.5 py-1 text-[11px] font-semibold",
            val
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400",
          )}
        >
          {val ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "created_at",
      header: "Joined",
      accessorKey: "created_at",
      width: 170,
      render: (val: string) => (
        <span className="text-slate-400">{formatDate(val)}</span>
      ),
    },
  ];

  // ── Overview tab content ────────────────────────────────────────────────
  const OverviewTab = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Profile */}
      <SectionCard
        title="Profile Information"
        icon={<IdCard className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 gap-5">
          <Field label="Full Name" value={user.name || "—"} />
          <Field label="Email" value={user.email} copyable={user.email} mono />
          <Field
            label="Mobile"
            value={user.mobile_number || "—"}
            copyable={user.mobile_number || undefined}
            mono
          />
          <Field label="User ID" value={user.id} copyable={user.id} mono />
          <Field label="Joined" value={formatDate(user.created_at)} />
          <Field label="Last Updated" value={formatDate(user.updated_at)} />
          <Field
            label="Last Activity"
            value={
              user.activity_logs?.[0]?.timestamp ? (
                <span className="font-medium text-emerald-400">
                  {formatDate(user.activity_logs[0].timestamp)}
                </span>
              ) : (
                "—"
              )
            }
          />
        </div>
      </SectionCard>

      {/* Commercial KYC */}
      {isCommericialUser && (
        <SectionCard title="KYC Details" icon={<Shield className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-5">
            <Field
              label="Aadhar Number"
              value={user.aadhar_number || "—"}
              mono
              copyable={user.aadhar_number || undefined}
            />
            <Field
              label="PAN Number"
              value={user.pan_number || "—"}
              mono
              copyable={user.pan_number || undefined}
            />
            <div className="col-span-2">
              <Field
                label="Full Address"
                value={
                  <span className="flex items-start gap-2 text-slate-200">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                    {user.full_address || "—"}
                  </span>
                }
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Cooperative / Business KYC */}
      {showCooperativeKyc && (
        <SectionCard
          title="Business Details"
          icon={<Building2 className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <Field label="Company Name" value={user.company_name || "—"} />
            </div>
            <Field
              label="CIN Number"
              value={user.cin_number || "—"}
              mono
              copyable={user.cin_number || undefined}
            />
            <Field
              label="GST Number"
              value={user.gst_number || "—"}
              mono
              copyable={user.gst_number || undefined}
            />
            <Field
              label="Udyam Number"
              value={user.udyam_number || "—"}
              mono
              copyable={user.udyam_number || undefined}
            />
            <Field label="Use Case" value={user.use_case || "—"} />
          </div>
        </SectionCard>
      )}

      {/* Parent (cooperative member) */}
      {showParent && user.parent && (
        <SectionCard
          title="Parent Organization"
          icon={<Building2 className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-5">
            <Field label="Name" value={user.parent.name || "—"} />
            <Field
              label="Email"
              value={user.parent.email}
              copyable={user.parent.email}
              mono
            />
            <Field
              label="Mobile"
              value={user.parent.mobile_number || "—"}
              mono
            />
            <Field
              label="Tier"
              value={
                <span
                  className={cn(
                    "rounded-xl border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    tierColors[user.parent.tier] ||
                      "bg-slate-500/10 text-slate-400",
                  )}
                >
                  {user.parent.tier.replace(/_/g, " ")}
                </span>
              }
            />
            <div className="col-span-2">
              <Link
                href={`/users/${user.parent.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                View parent profile →
              </Link>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Device / session details */}
      <SectionCard
        title="Latest Session & Device"
        icon={<Monitor className="h-4 w-4" />}
        className={cn(
          !isCommericialUser &&
            !showCooperativeKyc &&
            !showParent &&
            "lg:col-span-1",
        )}
      >
        {latestDevice ? (
          <div className="grid grid-cols-2 gap-5">
            <Field
              label="Device"
              value={
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                  {latestDevice.device || "—"}
                </span>
              }
            />
            <Field
              label="Browser"
              value={
                <span className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-500" />
                  {latestDevice.browser || "—"}
                </span>
              }
            />
            <Field label="Platform" value={latestDevice.platform || "—"} />
            <Field
              label="Device Type"
              value={latestDevice.device_type || "—"}
            />
            <Field
              label="Location"
              value={
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  {[latestDevice.city, latestDevice.country]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </span>
              }
            />
            <Field
              label="Public IP"
              value={latestDevice.public_ip || latestDevice.ip || "—"}
              mono
              copyable={latestDevice.public_ip || latestDevice.ip || undefined}
            />
            <Field
              label="ISP"
              value={
                <span className="flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-slate-500" />
                  {latestDevice.isp || "—"}
                </span>
              }
            />
            <Field label="ASN" value={latestDevice.asn || "—"} mono />
            <Field
              label="CPU"
              value={
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-slate-500" />
                  {latestDevice.cpu_cores
                    ? `${latestDevice.cpu_cores} cores`
                    : "—"}
                </span>
              }
            />
            <Field label="Memory" value={latestDevice.memory || "—"} />
            <Field
              label="Screen"
              value={latestDevice.screen_size || "—"}
              mono
            />
            <Field
              label="Language"
              value={
                <span className="flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-slate-500" />
                  {latestDevice.language || "—"}
                </span>
              }
            />
            <Field
              label="Battery"
              value={
                <span className="flex items-center gap-1.5">
                  <Battery className="h-3.5 w-3.5 text-slate-500" />
                  {latestDevice.battery_level || "—"}
                  {latestDevice.is_charging === "true" && (
                    <span className="text-emerald-400">⚡</span>
                  )}
                </span>
              }
            />
            <div className="col-span-2">
              <Field
                label="GPU"
                value={
                  <span className="break-words font-mono text-[11px] text-slate-300">
                    {latestDevice.gpu_renderer || "—"}
                  </span>
                }
              />
            </div>
            <div className="col-span-2">
              <Field
                label="User Agent"
                value={
                  <span className="break-all font-mono text-[10px] text-slate-400">
                    {latestDevice.user_agent || "—"}
                  </span>
                }
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No session data available</p>
        )}
      </SectionCard>

      {/* Sub users */}
      {showSubUsers && (
        <div className="lg:col-span-2">
          <SectionCard
            title={`Sub-Users (${user.sub_users.length})`}
            icon={<UsersIcon className="h-4 w-4" />}
          >
            <div className="h-[320px]">
              <CustomTable<SubUser>
                columns={subUserColumns}
                data={user.sub_users}
                keyExtractor={(row) => row.id}
                emptyMessage="No sub-users"
                maxHeight="100%"
              />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );

  // ── Wallet tab ──────────────────────────────────────────────────────────
  const canChangeWalletType = canManageBilling;
  const canChangeCreditLimit = canManageBilling;
  const WalletTab = user.wallet ? (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/50 to-slate-900/50 p-6 backdrop-blur-xl"
        >
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-emerald-400">
              <WalletIcon className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Balance
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">
              {formatINR(user.wallet.balance)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {user.wallet.currency} · {user.wallet.wallet_type}
            </p>
          </div>
        </motion.div>
        {canManageBilling && (
          <StatCard
            label="Credit Limit"
            value={formatINR(user.wallet.credit_limit)}
            icon={<CreditCard className="h-4 w-4" />}
            accent="bg-gradient-to-br from-cyan-500/5 to-transparent"
          />
        )}
        <StatCard
          label="Wallet Status"
          value={
            <span
              className={cn(
                "text-xl",
                user.wallet.is_active ? "text-emerald-400" : "text-red-400",
              )}
            >
              {user.wallet.is_active ? "Active" : "Inactive"}
            </span>
          }
          icon={<CircleDollarSign className="h-4 w-4" />}
          accent="bg-gradient-to-br from-amber-500/5 to-transparent"
        />
      </div>

      {canChangeWalletType && (
        <SectionCard
          title="Wallet Type"
          icon={<CreditCard className="h-4 w-4" />}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">
                Switch between prepaid deductions and postpaid credit billing.
              </span>
              <span className="text-[11px] text-slate-500">
                Current:{" "}
                <span className="font-semibold text-emerald-400">
                  {user.wallet.wallet_type}
                </span>
              </span>
            </div>
            <div className="flex rounded-xl border border-slate-800 bg-slate-900/60 p-1">
              {[WalletType.PREPAID, WalletType.POSTPAID].map((t) => {
                const active = user.wallet?.wallet_type === t;
                return (
                  <button
                    key={t}
                    onClick={() => handleWalletTypeChange(t)}
                    disabled={walletTypeSaving || active}
                    className={cn(
                      "rounded-xl px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition disabled:cursor-default",
                      active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                      walletTypeSaving && !active && "opacity-50",
                    )}
                  >
                    {walletTypeSaving && !active ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      t
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>
      )}

      {canChangeCreditLimit && (
        <SectionCard
          title="Credit Limit"
          icon={<CircleDollarSign className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-400">
                Max credit the user can draw on a postpaid wallet.
              </span>
              <span className="text-[11px] text-slate-500">
                Current:{" "}
                <span className="font-semibold text-emerald-400">
                  {formatINR(user.wallet.credit_limit)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ₹
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={creditLimitEdit}
                  placeholder={String(user.wallet.credit_limit)}
                  disabled={creditLimitSaving}
                  onChange={(e) => setCreditLimitEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      creditLimitEdit.trim() &&
                      !creditLimitSaving
                    )
                      handleSaveCreditLimit();
                  }}
                  className="w-40 rounded-xl border border-slate-700 bg-slate-900/60 py-2 pl-7 pr-3 text-sm font-semibold text-emerald-400 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleSaveCreditLimit}
                disabled={!creditLimitEdit.trim() || creditLimitSaving}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-black transition hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50"
              >
                {creditLimitSaving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {creditLimitSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard
        title={`Recent Transactions (${user.wallet.transactions.length})`}
        icon={<TrendingUp className="h-4 w-4" />}
      >
        <div className="h-[480px]">
          <CustomTable<Transaction>
            columns={txnColumns}
            data={user.wallet.transactions}
            keyExtractor={(row) => row.id}
            emptyMessage="No transactions yet"
            maxHeight="100%"
          />
        </div>
      </SectionCard>
    </div>
  ) : (
    <SectionCard title="Wallet" icon={<WalletIcon className="h-4 w-4" />}>
      <p className="text-xs text-slate-500">No wallet associated</p>
    </SectionCard>
  );

  // ── API Keys tab ────────────────────────────────────────────────────────
  const ApiTab = (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={`API Keys (${user.api_keys_count})`}
        icon={<Key className="h-4 w-4" />}
      >
        <div className="h-[160px]">
          <CustomTable<ApiKey>
            columns={apiKeyColumns}
            data={user.api_keys}
            keyExtractor={(row) => row.id}
            emptyMessage="No API keys"
            maxHeight="100%"
          />
        </div>
      </SectionCard>

      <SectionCard
        title={`API Pricing (${user.api_pricings.length})`}
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="h-[360px]">
          <CustomTable<ApiPricing>
            columns={pricingColumns}
            data={user.api_pricings}
            keyExtractor={(row) => row.api_id}
            emptyMessage="No pricing data"
            maxHeight="100%"
          />
        </div>
      </SectionCard>
    </div>
  );

  // ── Activity tab ────────────────────────────────────────────────────────
  const ActivityTab = (
    <SectionCard
      title={`Activity Logs (${user.activity_logs_returned} / ${user.activity_logs_total})`}
      icon={<Activity className="h-4 w-4" />}
    >
      <div className="h-[560px]">
        <CustomTable<ActivityLog>
          columns={activityColumns}
          data={user.activity_logs}
          keyExtractor={(row) => row.id}
          emptyMessage="No activity yet"
          maxHeight="100%"
        />
      </div>
    </SectionCard>
  );

  const tabs = [
    { value: "overview", label: "Overview", component: OverviewTab },
    { value: "wallet", label: "Wallet", component: WalletTab },
    ...(tier === UserTier.COMMERCIAL
      ? [{ value: "api", label: "API Keys", component: ApiTab }]
      : []),
    { value: "activity", label: "Activity", component: ActivityTab },
  ];

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="scrollbar-custom h-full overflow-y-auto">
      <div className="flex flex-col gap-5 pb-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/users"
            className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-emerald-500/50 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to users
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreditOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-400 transition hover:border-emerald-400 hover:bg-emerald-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Credit Balance
            </button>
            <button
              onClick={handleToggleActiveClick}
              disabled={togglingActive}
              className={cn(
                "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50",
                user.is_active
                  ? "border-red-500/30 bg-red-500/10 text-red-400 hover:border-red-400 hover:bg-red-500/20"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:border-emerald-400 hover:bg-emerald-500/20",
              )}
            >
              <Power
                className={cn("h-3.5 w-3.5", togglingActive && "animate-pulse")}
              />
              {user.is_active ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => fetchUser(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-emerald-500/50 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Hero profile card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl"
        >
          {/* Decorative glow */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-slate-800/60 to-cyan-500/10 text-2xl font-bold text-emerald-400">
                  {getInitials(user.name, user.email)}
                </div>
                <div
                  className={cn(
                    "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-slate-900",
                    user.is_active ? "bg-emerald-500" : "bg-red-500",
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">
                    {user.name || "Unnamed User"}
                  </h2>
                  <span
                    className={cn(
                      "rounded-xl border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      tierColors[user.tier] || tierColors.NORMAL,
                    )}
                  >
                    {user.tier.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                  {user.mobile_number && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {user.mobile_number}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Joined {formatDate(user.created_at)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase",
                      user.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400",
                    )}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                  <span
                    className={cn(
                      "rounded-xl px-2.5 py-1 text-[11px] font-semibold uppercase",
                      verificationColors[user.verification_status] ||
                        "bg-slate-500/10 text-slate-400",
                    )}
                  >
                    {user.verification_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!user.is_active && user.block_reason && (
            <div className="relative mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Ban className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                  Blocked — Reason
                </span>
                <p className="text-sm text-slate-200">{user.block_reason}</p>
              </div>
            </div>
          )}

          {user.verification_status === VerificationStatus.REJECTED && user.verification_rejection_reason && (
            <div className="relative mt-3 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                  Verification Rejected — Reason
                </span>
                <p className="text-sm text-slate-200">{user.verification_rejection_reason}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Balance"
            value={formatINR(user.wallet?.balance ?? 0)}
            icon={<WalletIcon className="h-4 w-4" />}
            accent="bg-gradient-to-br from-emerald-500/10 to-transparent"
          />
          {isCommericialUser && (
            <StatCard
              label="API Keys"
              value={user.api_keys_count}
              icon={<Key className="h-4 w-4" />}
              accent="bg-gradient-to-br from-cyan-500/10 to-transparent"
            />
          )}
          <StatCard
            label="Activities"
            value={user.activity_logs_total}
            icon={<Activity className="h-4 w-4" />}
            accent="bg-gradient-to-br from-purple-500/10 to-transparent"
          />
          {tier === UserTier.COOPERATIVE ? (
            <button
              onClick={() => setSubUsersOpen(true)}
              className="cursor-pointer text-left focus:outline-none"
            >
              <StatCard
                label="Sub-Users"
                value={user.sub_users.length}
                icon={<UsersIcon className="h-4 w-4" />}
                accent="bg-gradient-to-br from-amber-500/10 to-transparent"
              />
            </button>
          ) : (
            <StatCard
              label="Transactions"
              value={user.wallet?.transactions.length ?? 0}
              icon={<TrendingUp className="h-4 w-4" />}
              accent="bg-gradient-to-br from-amber-500/10 to-transparent"
            />
          )}
        </div>

        {/* Tabs */}
        <CustomTabs tabs={tabs} defaultValue="overview" />
      </div>

      {/* Credit balance dialog */}
      <ViewDialog
        open={creditOpen}
        onOpenChange={(v) => {
          if (!crediting) setCreditOpen(v);
        }}
        title="Credit Balance"
        icon={<WalletIcon className="h-4 w-4" />}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-400">
                  {getInitials(user.name, user.email)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">
                    {user.name || "Unnamed User"}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">
                  Current Balance
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatINR(user.wallet?.balance ?? 0)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Amount (₹)
              </label>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                placeholder="500"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Note
              </label>
              <textarea
                rows={3}
                placeholder="Monthly top-up"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCreditOpen(false)}
                disabled={crediting}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={handleCreditBalance}
                disabled={crediting || !creditAmount}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-semibold text-black transition hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-50"
              >
                {crediting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {crediting ? "Crediting..." : "Credit Balance"}
              </button>
            </div>
        </div>
      </ViewDialog>

      {/* Block reason dialog */}
      <ViewDialog
        open={blockOpen}
        onOpenChange={(v) => {
          if (!togglingActive) setBlockOpen(v);
        }}
        title="Deactivate User"
        icon={<Ban className="h-4 w-4" />}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs text-slate-300">
              Deactivating will block{" "}
              <span className="font-semibold text-white">
                {user.name || user.email}
              </span>{" "}
              from accessing the platform. Provide a reason (max 500 chars).
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Block Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={4}
              autoFocus
              maxLength={500}
              placeholder="Suspicious usage, KYC mismatch, etc."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <span className="text-right text-[10px] text-slate-600">
              {blockReason.length}/500
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setBlockOpen(false)}
              disabled={togglingActive}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={handleBlockSubmit}
              disabled={togglingActive || !blockReason.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50"
            >
              {togglingActive ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              {togglingActive ? "Blocking..." : "Block User"}
            </button>
          </div>
        </div>
      </ViewDialog>

      {/* Payload viewer */}
      <ViewDialog
        open={!!selectedLog}
        onOpenChange={(v) => !v && setSelectedLog(null)}
        title="Request / Response Payload"
        icon={<Code2 className="h-4 w-4" />}
        size="xl"
        fullHeight
      >
        {selectedLog && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <Field
                label="Endpoint"
                value={
                  <span className="flex items-center gap-2">
                    <span className="rounded-xl bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                      {selectedLog.method}
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {selectedLog.endpoint}
                    </span>
                  </span>
                }
              />
              <Field
                label="Status"
                value={
                  <span
                    className={cn(
                      "font-mono font-bold",
                      statusCodeColor(selectedLog.status_code),
                    )}
                  >
                    {selectedLog.status_code}
                  </span>
                }
              />
              <Field label="Duration" value={`${selectedLog.duration}ms`} />
              <Field label="Time" value={formatDate(selectedLog.timestamp)} />
              {selectedLog.txn_id && (
                <div className="col-span-2">
                  <Field
                    label="Txn ID"
                    value={selectedLog.txn_id}
                    mono
                    copyable={selectedLog.txn_id}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                  Request Payload
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(selectedLog.request_payload, null, 2),
                    );
                    toast.success("Request copied");
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-400"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="scrollbar-custom max-h-[55vh] overflow-auto rounded-xl border border-slate-800 bg-[#05070b] p-4 font-mono text-[12px] leading-relaxed text-slate-300">
                {selectedLog.request_payload
                  ? JSON.stringify(selectedLog.request_payload, null, 2)
                  : "—"}
              </pre>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400">
                  Response Payload
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(selectedLog.response_payload, null, 2),
                    );
                    toast.success("Response copied");
                  }}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-400"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="scrollbar-custom max-h-[55vh] overflow-auto rounded-xl border border-slate-800 bg-[#05070b] p-4 font-mono text-[12px] leading-relaxed text-slate-300">
                {selectedLog.response_payload
                  ? JSON.stringify(selectedLog.response_payload, null, 2)
                  : "—"}
              </pre>
            </div>
          </>
        )}
      </ViewDialog>

      {/* API Key block reason dialog */}
      <ViewDialog
        open={!!apiKeyBlockTarget}
        onOpenChange={(v) => {
          if (togglingKeyId) return;
          if (!v) {
            setApiKeyBlockTarget(null);
            setApiKeyBlockReason("");
          }
        }}
        title="Block API Key"
        icon={<Ban className="h-4 w-4" />}
        size="sm"
      >
        {apiKeyBlockTarget && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs text-slate-300">
                Blocking this API key will immediately revoke its access.
                Provide a reason (max 500 chars).
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-xl bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-400">
                  {apiKeyBlockTarget.type}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {apiKeyBlockTarget.key.slice(0, 6)}…
                  {apiKeyBlockTarget.key.slice(-4)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Block Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={4}
                autoFocus
                maxLength={500}
                placeholder="Leaked key, abuse, rotation, etc."
                value={apiKeyBlockReason}
                onChange={(e) => setApiKeyBlockReason(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <span className="text-right text-[10px] text-slate-600">
                {apiKeyBlockReason.length}/500
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setApiKeyBlockTarget(null);
                  setApiKeyBlockReason("");
                }}
                disabled={!!togglingKeyId}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
              <button
                onClick={handleApiKeyBlockSubmit}
                disabled={!!togglingKeyId || !apiKeyBlockReason.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-50"
              >
                {togglingKeyId ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                {togglingKeyId ? "Blocking..." : "Block Key"}
              </button>
            </div>
          </div>
        )}
      </ViewDialog>

      {/* Price history viewer */}
      <ViewDialog
        open={!!selectedPricing}
        onOpenChange={(v) => !v && setSelectedPricing(null)}
        title="Price History"
        icon={<History className="h-4 w-4" />}
        size="lg"
      >
        {selectedPricing && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <Field
                label="API"
                value={
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">
                      {selectedPricing.api_name}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {selectedPricing.endpoint}
                    </span>
                  </div>
                }
              />
              <Field
                label="Current Custom Price"
                value={
                  selectedPricing.custom_price != null ? (
                    <span className="font-semibold text-emerald-400">
                      {formatINR(selectedPricing.custom_price)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Commercial Price"
                value={formatINR(selectedPricing.commercial_price)}
              />
              <Field
                label="Source Price"
                value={formatINR(selectedPricing.source_price)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Change Log ({selectedPricing.price_history?.length ?? 0})
              </span>
              {(selectedPricing.price_history?.length ?? 0) === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
                  No history yet
                </div>
              ) : (
                <div className="scrollbar-custom max-h-[60vh] overflow-y-auto">
                  <ol className="relative ml-2 border-l border-slate-800">
                    {selectedPricing.price_history.map((h, i) => (
                      <li
                        key={h.id}
                        className="relative mb-3 ml-4 rounded-xl border border-slate-800 bg-slate-900/50 p-3"
                      >
                        <span
                          className={cn(
                            "absolute -left-[9px] top-4 h-3 w-3 rounded-full border-2 border-slate-900",
                            i === 0 ? "bg-emerald-500" : "bg-slate-600",
                          )}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-lg font-bold text-emerald-400">
                            {formatINR(h.price)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatDate(h.changed_at)}
                          </span>
                        </div>
                        {h.note && (
                          <p className="mt-1 text-xs text-slate-400">
                            {h.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </>
        )}
      </ViewDialog>

      {/* Sub-users dialog */}
      <ViewDialog
        open={subUsersOpen}
        onOpenChange={setSubUsersOpen}
        title={`Sub-Users (${user.sub_users.length})`}
        icon={<UsersIcon className="h-4 w-4" />}
        size="xl"
      >
        <div className="h-[480px]">
          <CustomTable<SubUser>
            columns={subUserColumns}
            data={user.sub_users}
            keyExtractor={(row) => row.id}
            emptyMessage="No sub-users"
            maxHeight="100%"
            onRowClick={(row) => router.push(`/users/${row.id}`)}
          />
        </div>
      </ViewDialog>
    </div>
  );
};

export default UserDetails;
