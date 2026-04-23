"use client";

import { type JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Title from "@/components/custom/custom-title";
import { Button } from "@/components/ui/button";
import CustomSelect from "@/components/custom/custom-select";
import { get } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  formatCompactNumber,
  formatINR,
  formatTimeAgo,
} from "@/utils/functions";
import { REFRESH_INTERVAL } from "@/utils/constant";

type Tier =
  | "ALL"
  | "NORMAL"
  | "COOPERATIVE"
  | "COOPERATIVE_MEMBER"
  | "COMMERCIAL";

interface MonthlyCount {
  month: string;
  count: number;
}

interface UserGrowthBlock {
  current: number;
  previous: number;
  percentage: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  mobile_number: string | null;
  tier: string;
  is_active: boolean;
  verification_status: string;
  created_at: string;
  balance: number;
  wallet_type: string;
}

interface UserStatsData {
  filters: { tier: string; month: string };
  total_users: number;
  monthly_joined: MonthlyCount[];
  growth: {
    vs_last_month: UserGrowthBlock;
    vs_last_quarter: UserGrowthBlock;
    vs_last_year: UserGrowthBlock;
  };
  tier_breakdown: Record<string, number>;
  recent_users: RecentUser[];
}

interface TxnGrowthBlock {
  current_count: number;
  previous_count: number;
  current_volume: number;
  previous_volume: number;
  count_percentage: number;
  volume_percentage: number;
}

interface MetricsBlock {
  revenue: number;
  gst_collection: number;
  platform_fees: number;
  profit: number;
  source_cost: number;
  api_calls: number;
  admin_giveaway_credits: number;
  user_reference_credits: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  balance_after: number;
  endpoint: string | null;
  description: string | null;
  reference_id: string | null;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    tier: string;
  } | null;
}

interface TxnStatsData {
  filters: {
    tier: string;
    month: string;
    period_label: string;
  };
  total_transactions: number;
  total_volume: number;
  today: MetricsBlock;
  lifetime: MetricsBlock;
  period_summary: MetricsBlock & {
    label: string;
    start: string;
    end: string;
  };
  monthly_breakdown: Array<{ month: string; count: number; volume: number }>;
  growth: {
    vs_last_month: TxnGrowthBlock;
    vs_last_quarter: TxnGrowthBlock;
    vs_last_year: TxnGrowthBlock;
  };
  type_breakdown: Record<string, { count: number; volume: number }>;
  status_breakdown: Record<string, { count: number; volume: number }>;
  recent_transactions: RecentTransaction[];
}

interface ApiEnvelope<T> {
  responseStatus: { status: boolean; statusCode: number; message: string };
  responseData: T;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(key: string): { year: number; month: number } {
  const [y, m] = key.split("-");
  return { year: Number(y), month: Number(m) };
}

function monthLongLabel(key: string): string {
  const { year, month } = parseMonth(key);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthShortLabel(key: string): string {
  const { year, month } = parseMonth(key);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

function shiftMonth(key: string, deltaMonths: number): string {
  const { year, month } = parseMonth(key);
  const d = new Date(year, month - 1 + deltaMonths, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calendarQuarterRange(
  key: string,
  deltaQuarters: number,
): { start: string; end: string; quarter: number; year: number } {
  const { year, month } = parseMonth(key);
  const currentQuarter = Math.ceil(month / 3);
  let q = currentQuarter + deltaQuarters;
  let y = year;
  while (q < 1) {
    q += 4;
    y -= 1;
  }
  while (q > 4) {
    q -= 4;
    y += 1;
  }
  const startMonth = (q - 1) * 3 + 1;
  const start = `${y}-${String(startMonth).padStart(2, "0")}`;
  const end = `${y}-${String(startMonth + 2).padStart(2, "0")}`;
  return { start, end, quarter: q, year: y };
}

function quarterRangeLabel(endKey: string, deltaQuarters: number): string {
  const { start, end, quarter, year } = calendarQuarterRange(
    endKey,
    deltaQuarters,
  );
  return `Q${quarter} ${year} · ${monthShortLabel(start)} – ${monthShortLabel(end)}`;
}

function yearLabel(key: string, delta: number): string {
  const { year } = parseMonth(key);
  return String(year + delta);
}

function initials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatCompactINR(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${Math.round(abs)}`;
}

const accent = {
  emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/25", stroke: "#10b981", bar: "bg-emerald-500" },
  cyan: { text: "text-cyan-400", bg: "bg-cyan-500/10", ring: "ring-cyan-500/25", stroke: "#06b6d4", bar: "bg-cyan-500" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/25", stroke: "#f59e0b", bar: "bg-amber-500" },
  rose: { text: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/25", stroke: "#f43f5e", bar: "bg-rose-500" },
  violet: { text: "text-violet-300", bg: "bg-violet-500/10", ring: "ring-violet-500/25", stroke: "#8b5cf6", bar: "bg-violet-500" },
  slate: { text: "text-slate-300", bg: "bg-slate-500/10", ring: "ring-slate-500/25", stroke: "#94a3b8", bar: "bg-slate-400" },
} as const;

type AccentKey = keyof typeof accent;

const tierTone: Record<string, { bar: string; chip: string }> = {
  NORMAL: {
    bar: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-300 border border-violet-500/25",
  },
  COOPERATIVE: {
    bar: "bg-cyan-500",
    chip: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  },
  COOPERATIVE_MEMBER: {
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  },
  COMMERCIAL: {
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  },
};

const txnTypeColor: Record<string, string> = {
  CREDIT: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  DEBIT: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  TRANSFER: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};

const txnStatusColor: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  REVERSED: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Delta({
  pct,
  suffix,
}: {
  pct: number;
  suffix?: string;
}): JSX.Element {
  const positive = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        positive
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
          : "border-rose-500/25 bg-rose-500/10 text-rose-400",
      )}
    >
      {positive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(pct).toFixed(1)}%
      {suffix ? <span className="ml-0.5 opacity-70">{suffix}</span> : null}
    </span>
  );
}

interface MetricSpec {
  label: string;
  value: string;
  tone: AccentKey;
  delta?: number;
  deltaSuffix?: string;
  hint?: string;
}

function MetricTile({ metric }: { metric: MetricSpec }): JSX.Element {
  const t = accent[metric.tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className={cn("absolute inset-y-0 left-0 w-[3px] opacity-80", t.bar)} />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {metric.label}
      </span>
      <p className={cn("mt-2 text-lg font-semibold tabular-nums sm:text-xl", t.text)}>
        {metric.value}
      </p>
      {metric.delta !== undefined ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Delta pct={metric.delta} />
          {metric.deltaSuffix ? (
            <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
              {metric.deltaSuffix}
            </span>
          ) : null}
        </div>
      ) : metric.hint ? (
        <p className="mt-1 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {metric.hint}
        </p>
      ) : null}
    </div>
  );
}

function PeriodSection({
  eyebrow,
  title,
  subtitle,
  accentTone,
  metrics,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  accentTone: AccentKey;
  metrics: MetricSpec[];
  footer?: React.ReactNode;
}): JSX.Element {
  const a = accent[accentTone];
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 p-5">
        <div>
          <span
            className={cn(
              "font-mono text-[10px] font-medium uppercase tracking-[0.3em]",
              a.text,
            )}
          >
            {eyebrow}
          </span>
          <h3 className="mt-1 text-base font-semibold text-white">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {footer}
      </div>
      <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <MetricTile key={m.label} metric={m} />
        ))}
      </div>
    </Panel>
  );
}

function ComparisonCard({
  heading,
  previousLabel,
  currentValue,
  previousValue,
  pct,
  formatter,
}: {
  heading: string;
  previousLabel: string;
  currentValue: number;
  previousValue: number;
  pct: number;
  formatter: (n: number) => string;
}): JSX.Element {
  const positive = pct >= 0;
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            {heading}
          </span>
          <p className="mt-1 text-xs font-medium text-slate-400">
            compared to{" "}
            <span className="font-semibold text-slate-200">
              {previousLabel}
            </span>
          </p>
        </div>
        <Delta pct={pct} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            This period
          </p>
          <p
            className={cn(
              "mt-1 text-lg font-semibold tabular-nums",
              positive ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {formatter(currentValue)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            Previous
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-300">
            {formatter(previousValue)}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function TrendBars({
  data,
  mode,
}: {
  data: Array<{ month: string; count: number; volume: number }>;
  mode: "volume" | "count";
}): JSX.Element {
  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center text-xs font-medium text-slate-600">
        Insufficient data
      </div>
    );
  }
  const values = data.map((d) => (mode === "volume" ? d.volume : d.count));
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-64 items-stretch gap-2">
      {data.map((d, i) => {
        const v = mode === "volume" ? d.volume : d.count;
        const h = v > 0 ? Math.max((v / max) * 100, 4) : 0;
        return (
          <div
            key={`${d.month}-${i}`}
            className="group flex flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-full w-full items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                className={cn(
                  "w-full rounded-xl bg-gradient-to-t transition-all",
                  mode === "volume"
                    ? "from-emerald-500/50 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300"
                    : "from-cyan-500/50 to-cyan-400 group-hover:from-cyan-500 group-hover:to-cyan-300",
                )}
              />
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-950/95 px-2 py-1 text-[10px] font-semibold tabular-nums text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {mode === "volume" ? formatCompactINR(v) : formatCompactNumber(v)}
              </div>
            </div>
            <span className="font-mono text-[10px] font-medium uppercase text-slate-500">
              {monthShortLabel(d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-xl bg-slate-800/40" />
      <div className="h-[320px] animate-pulse rounded-xl bg-slate-800/40" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-slate-800/40"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl bg-slate-800/40"
          />
        ))}
      </div>
    </div>
  );
}

const Dashboard = (): JSX.Element => {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());
  const [tier, setTier] = useState<Tier>("ALL");
  const [userStats, setUserStats] = useState<UserStatsData | null>(null);
  const [txnStats, setTxnStats] = useState<TxnStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendMode, setTrendMode] = useState<"volume" | "count">("volume");
  const [pendingCount, setPendingCount] = useState(0);
  const [hasMorePending, setHasMorePending] = useState(false);

  const fetchStats = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      try {
        const params = { tier, month };
        const [userRes, txnRes, pendingRes] = await Promise.all([
          get<ApiEnvelope<UserStatsData>>(
            "/api/v1/admin/users/stats",
            params as any,
          ),
          get<ApiEnvelope<TxnStatsData>>(
            "/api/v1/admin/txn/stats",
            params as any,
          ),
          get<any>("/api/v1/admin/users/all?verification_status=PENDING,REJECTED"),
        ]);
        setUserStats(userRes.responseData);
        setTxnStats(txnRes.responseData);
        if (pendingRes?.responseData) {
          setPendingCount(pendingRes.responseData.users?.length || 0);
          setHasMorePending(pendingRes.responseData.has_next || false);
        }
      } catch {
        toast.error("Failed to load dashboard", { id: "dashboard-stats" });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [month, tier],
  );

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const tierEntries = useMemo(() => {
    if (!userStats) return [];
    const total = Object.values(userStats.tier_breakdown).reduce(
      (s, c) => s + c,
      0,
    );
    return Object.entries(userStats.tier_breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([t, count]) => ({
        tier: t,
        count,
        percentage: total ? (count / total) * 100 : 0,
      }));
  }, [userStats]);

  if (loading) {
    return (
      <div className="scrollbar-custom h-full overflow-y-auto pr-1 pb-10">
        <DashboardSkeleton />
      </div>
    );
  }

  const today = txnStats?.today;
  const scope = txnStats?.period_summary;
  const lifetime = txnStats?.lifetime;
  const monthGrowth = txnStats?.growth.vs_last_month;
  const todayDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const scopeLabel = monthLongLabel(month);
  const prevMonthLabel = monthLongLabel(shiftMonth(month, -1));
  const prevQuarterLabel = quarterRangeLabel(month, -1);
  const currentQuarterLabel = quarterRangeLabel(month, 0);
  const prevYearLabel = yearLabel(month, -1);
  const currentYearLabel = yearLabel(month, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="scrollbar-custom h-full space-y-6 overflow-y-auto pr-1 pb-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Title
          title="Dashboard"
          subTitle="Today at a glance, with comparisons to previous periods."
        />
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400">
              Live
            </span>
          </div>
          <Button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            variant="outline"
            className="h-10 rounded-xl border-slate-800 bg-slate-900/50 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing ? "Syncing" : "Sync"}
          </Button>
          <Button
            onClick={() => router.push("/accept_approvals")}
            variant="outline"
            className="relative h-10 w-10 rounded-xl border-slate-800 bg-slate-900/50 p-0 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400"
          >
            <Bell className="h-4 w-4" />
            {pendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#060b17]">
                {pendingCount}
                {hasMorePending && "+"}
              </span>
            )}
          </Button>
        </div>
      </div>

      <motion.div variants={itemVariants}>
        <Panel className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Filters
            </span>
            <span className="h-4 w-px bg-slate-800" />
            <CustomSelect
              data={[
                { label: "All Tiers", value: "ALL" },
                { label: "Normal", value: "NORMAL" },
                { label: "Cooperative", value: "COOPERATIVE" },
                { label: "Cooperative Member", value: "COOPERATIVE_MEMBER" },
                { label: "Commercial", value: "COMMERCIAL" },
              ]}
              value={tier}
              onChange={(v) => setTier(v as Tier)}
              className="w-[190px] border-slate-800 bg-slate-900/50 text-slate-300"
            />
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 text-xs font-medium text-slate-300 outline-none focus:border-emerald-500/50"
              />
            </div>
            <span className="ml-auto flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                Scope
              </span>
              <span className="text-xs font-semibold text-white">
                {scopeLabel}
              </span>
            </span>
          </div>
        </Panel>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Panel className="relative overflow-hidden p-6 sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-[90px]" />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400">
                  Today · Live
                </span>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {todayDate}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Real-time numbers for the current calendar day in IST.
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Revenue · Today
                </span>
                <div className="mt-1 text-[36px] font-semibold tracking-tight text-white sm:text-[44px]">
                  {formatINR(today?.revenue ?? 0)}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  {formatCompactNumber(today?.api_calls ?? 0)} API calls today
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {(
                [
                  {
                    label: "Profit · Today",
                    value: formatINR(today?.profit ?? 0),
                    tone:
                      (today?.profit ?? 0) >= 0
                        ? ("emerald" as AccentKey)
                        : ("rose" as AccentKey),
                  },
                  {
                    label: "GST · Today",
                    value: formatINR(today?.gst_collection ?? 0),
                    tone: "cyan" as AccentKey,
                  },
                  {
                    label: "Platform Fee · Today",
                    value: formatINR(today?.platform_fees ?? 0),
                    tone: "amber" as AccentKey,
                  },
                  {
                    label: "Source Cost · Today",
                    value: formatINR(today?.source_cost ?? 0),
                    tone: "rose" as AccentKey,
                  },
                  {
                    label: "Admin Credits Given · Today",
                    value: formatINR(today?.admin_giveaway_credits ?? 0),
                    tone: "violet" as AccentKey,
                  },
                  {
                    label: "Reference Credits · Today",
                    value: formatINR(today?.user_reference_credits ?? 0),
                    tone: "violet" as AccentKey,
                  },
                  {
                    label: "API Calls · Today",
                    value: formatCompactNumber(today?.api_calls ?? 0),
                    tone: "slate" as AccentKey,
                  },
                ] as MetricSpec[]
              ).map((m) => (
                <MetricTile key={m.label} metric={m} />
              ))}
            </div>
          </div>
        </Panel>
      </motion.div>

      <motion.div variants={itemVariants}>
        <PeriodSection
          eyebrow={`Selected month · ${scopeLabel}`}
          title={`${scopeLabel} totals`}
          subtitle={`Every metric below covers ${scopeLabel}. The percentage badge compares it to ${prevMonthLabel}.`}
          accentTone="emerald"
          metrics={[
            {
              label: `Revenue · ${scopeLabel}`,
              value: formatINR(scope?.revenue ?? 0),
              tone: "emerald",
              delta: monthGrowth?.volume_percentage,
              deltaSuffix: `vs ${prevMonthLabel}`,
            },
            {
              label: `Profit · ${scopeLabel}`,
              value: formatINR(scope?.profit ?? 0),
              tone: (scope?.profit ?? 0) >= 0 ? "emerald" : "rose",
            },
            {
              label: `GST · ${scopeLabel}`,
              value: formatINR(scope?.gst_collection ?? 0),
              tone: "cyan",
            },
            {
              label: `Platform Fee · ${scopeLabel}`,
              value: formatINR(scope?.platform_fees ?? 0),
              tone: "amber",
            },
            {
              label: `Source Cost · ${scopeLabel}`,
              value: formatINR(scope?.source_cost ?? 0),
              tone: "rose",
            },
            {
              label: `API Calls · ${scopeLabel}`,
              value: formatCompactNumber(scope?.api_calls ?? 0),
              tone: "slate",
            },
            {
              label: `Admin Credits · ${scopeLabel}`,
              value: formatINR(scope?.admin_giveaway_credits ?? 0),
              tone: "violet",
              hint: "Giveaways this month",
            },
            {
              label: `Reference Credits · ${scopeLabel}`,
              value: formatINR(scope?.user_reference_credits ?? 0),
              tone: "violet",
              hint: "Referral rewards this month",
            },
            {
              label: `Txns · ${scopeLabel}`,
              value: formatCompactNumber(monthGrowth?.current_count ?? 0),
              tone: "cyan",
              delta: monthGrowth?.count_percentage,
              deltaSuffix: `vs ${prevMonthLabel}`,
            },
            {
              label: `Volume · ${scopeLabel}`,
              value: formatCompactINR(monthGrowth?.current_volume ?? 0),
              tone: "amber",
              delta: monthGrowth?.volume_percentage,
              deltaSuffix: `vs ${prevMonthLabel}`,
            },
          ]}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <PeriodSection
          eyebrow="All time · Lifetime"
          title="Lifetime totals"
          subtitle="Cumulative numbers since inception. No period comparison — these are running totals."
          accentTone="cyan"
          metrics={[
            {
              label: "Revenue · All Time",
              value: formatINR(lifetime?.revenue ?? 0),
              tone: "emerald",
            },
            {
              label: "Profit · All Time",
              value: formatINR(lifetime?.profit ?? 0),
              tone: (lifetime?.profit ?? 0) >= 0 ? "emerald" : "rose",
            },
            {
              label: "GST · All Time",
              value: formatINR(lifetime?.gst_collection ?? 0),
              tone: "cyan",
            },
            {
              label: "Platform Fee · All Time",
              value: formatINR(lifetime?.platform_fees ?? 0),
              tone: "amber",
            },
            {
              label: "Source Cost · All Time",
              value: formatINR(lifetime?.source_cost ?? 0),
              tone: "rose",
            },
            {
              label: "API Calls · All Time",
              value: formatCompactNumber(lifetime?.api_calls ?? 0),
              tone: "slate",
            },
            {
              label: "Admin Credits · All Time",
              value: formatINR(lifetime?.admin_giveaway_credits ?? 0),
              tone: "violet",
              hint: "Total giveaways",
            },
            {
              label: "Reference Credits · All Time",
              value: formatINR(lifetime?.user_reference_credits ?? 0),
              tone: "violet",
              hint: "Total referral rewards",
            },
            {
              label: "Total Txns · All Time",
              value: formatCompactNumber(txnStats?.total_transactions ?? 0),
              tone: "cyan",
            },
            {
              label: "Total Volume · All Time",
              value: formatCompactINR(txnStats?.total_volume ?? 0),
              tone: "amber",
            },
          ]}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <PeriodSection
          eyebrow="User base"
          title="Users overview"
          subtitle={`Signup activity for ${scopeLabel} with comparisons to prior periods.`}
          accentTone="violet"
          metrics={[
            {
              label: "Total Users · All Time",
              value: formatCompactNumber(userStats?.total_users ?? 0),
              tone: "emerald",
              hint: "Cumulative signups",
            },
            {
              label: `Signups · ${scopeLabel}`,
              value: formatCompactNumber(
                userStats?.growth.vs_last_month.current ?? 0,
              ),
              tone: "emerald",
              delta: userStats?.growth.vs_last_month.percentage,
              deltaSuffix: `vs ${prevMonthLabel}`,
            },
            {
              label: `Signups · ${currentQuarterLabel}`,
              value: formatCompactNumber(
                userStats?.growth.vs_last_quarter.current ?? 0,
              ),
              tone: "cyan",
              delta: userStats?.growth.vs_last_quarter.percentage,
              deltaSuffix: `vs ${prevQuarterLabel}`,
            },
            {
              label: `Signups · ${currentYearLabel}`,
              value: formatCompactNumber(
                userStats?.growth.vs_last_year.current ?? 0,
              ),
              tone: "amber",
              delta: userStats?.growth.vs_last_year.percentage,
              deltaSuffix: `vs ${prevYearLabel}`,
            },
          ]}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Panel className="p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-400">
                Period Comparison · {scopeLabel}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-white">
                How {scopeLabel} stacks up
              </h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Each card compares the selected scope against the immediately
                previous period, so you can see the trend at a glance.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {txnStats ? (
              <>
                <ComparisonCard
                  heading={`Monthly · ${scopeLabel}`}
                  previousLabel={prevMonthLabel}
                  currentValue={txnStats.growth.vs_last_month.current_volume}
                  previousValue={txnStats.growth.vs_last_month.previous_volume}
                  pct={txnStats.growth.vs_last_month.volume_percentage}
                  formatter={formatINR}
                />
                <ComparisonCard
                  heading={`Quarterly · ${currentQuarterLabel}`}
                  previousLabel={prevQuarterLabel}
                  currentValue={txnStats.growth.vs_last_quarter.current_volume}
                  previousValue={
                    txnStats.growth.vs_last_quarter.previous_volume
                  }
                  pct={txnStats.growth.vs_last_quarter.volume_percentage}
                  formatter={formatINR}
                />
                <ComparisonCard
                  heading={`Yearly · ${currentYearLabel}`}
                  previousLabel={prevYearLabel}
                  currentValue={txnStats.growth.vs_last_year.current_volume}
                  previousValue={txnStats.growth.vs_last_year.previous_volume}
                  pct={txnStats.growth.vs_last_year.volume_percentage}
                  formatter={formatINR}
                />
              </>
            ) : null}
          </div>

          {txnStats ? (
            <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] font-medium text-slate-500 sm:grid-cols-3">
              <p>
                Txn count {scopeLabel}:{" "}
                <span className="font-semibold text-slate-300">
                  {formatCompactNumber(
                    txnStats.growth.vs_last_month.current_count,
                  )}
                </span>{" "}
                vs {formatCompactNumber(
                  txnStats.growth.vs_last_month.previous_count,
                )}
              </p>
              <p>
                Txn count {currentQuarterLabel}:{" "}
                <span className="font-semibold text-slate-300">
                  {formatCompactNumber(
                    txnStats.growth.vs_last_quarter.current_count,
                  )}
                </span>{" "}
                vs {formatCompactNumber(
                  txnStats.growth.vs_last_quarter.previous_count,
                )}
              </p>
              <p>
                Txn count {currentYearLabel}:{" "}
                <span className="font-semibold text-slate-300">
                  {formatCompactNumber(
                    txnStats.growth.vs_last_year.current_count,
                  )}
                </span>{" "}
                vs {formatCompactNumber(
                  txnStats.growth.vs_last_year.previous_count,
                )}
              </p>
            </div>
          ) : null}
        </Panel>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Panel>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800/60 p-5">
              <div>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400">
                  Trend · Last 12 months ·{" "}
                  {trendMode === "volume"
                    ? "Transaction Volume (₹)"
                    : "Transaction Count"}
                </span>
                <h3 className="mt-1 text-base font-semibold text-white">
                  {trendMode === "volume"
                    ? "Month-on-month transaction volume"
                    : "Month-on-month transaction count"}
                </h3>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  {trendMode === "volume"
                    ? "Total rupee value of all transactions per month."
                    : "Number of transactions recorded per month."}
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                {[
                  { key: "volume", label: "Volume" },
                  { key: "count", label: "Count" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTrendMode(opt.key as "volume" | "count")}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all",
                      trendMode === opt.key
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "text-slate-500 hover:text-slate-300",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5">
              <TrendBars
                data={txnStats?.monthly_breakdown ?? []}
                mode={trendMode}
              />
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-slate-800/60 p-5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-violet-300">
                Tier Distribution
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                User base by tier
              </h3>
            </div>
            <div className="space-y-4 p-5">
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                <div className="flex h-9 w-full">
                  {tierEntries.map((e) => {
                    if (e.percentage <= 0) return null;
                    const tone = tierTone[e.tier] ?? tierTone.NORMAL!;
                    return (
                      <motion.div
                        key={e.tier}
                        initial={{ width: 0 }}
                        animate={{ width: `${e.percentage}%` }}
                        transition={{ duration: 0.9, ease: "circOut" }}
                        className={cn("h-full", tone.bar)}
                        title={`${e.tier} · ${e.percentage.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                {tierEntries.map((e) => {
                  const tone = tierTone[e.tier] ?? tierTone.NORMAL!;
                  return (
                    <div
                      key={e.tier}
                      className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn("h-2 w-2 rounded-full", tone.bar)} />
                        <span
                          className={cn(
                            "rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            tone.chip,
                          )}
                        >
                          {e.tier.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-white">
                          {formatCompactNumber(e.count)}
                        </span>
                        <span className="ml-2 font-mono text-[10px] font-medium text-slate-500">
                          {e.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="xl:col-span-1">
            <div className="border-b border-slate-800/60 p-5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
                Quick Jump
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                Where to next
              </h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {[
                {
                  href: "/users",
                  icon: UserPlus,
                  title: "Users",
                  desc: "Signups, tiers, balances",
                  tone: "emerald" as const,
                },
                {
                  href: "/transactions",
                  icon: ArrowLeftRight,
                  title: "Financial Statements",
                  desc: "Profit, margin, audit trail",
                  tone: "cyan" as const,
                },
                {
                  href: "/api_pricing",
                  icon: CreditCard,
                  title: "API Pricing",
                  desc: "Cost vs consumer price",
                  tone: "amber" as const,
                },
              ].map((q) => {
                const t = accent[q.tone];
                const Icon = q.icon;
                return (
                  <a
                    key={q.href}
                    href={q.href}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-800/30"
                  >
                    <div
                      className={cn(
                        "rounded-xl p-2 ring-1 transition-transform group-hover:scale-105",
                        t.bg,
                        t.ring,
                      )}
                    >
                      <Icon className={cn("h-4 w-4", t.text)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {q.title}
                      </p>
                      <p className="truncate text-[11px] font-medium text-slate-500">
                        {q.desc}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-400" />
                  </a>
                );
              })}
            </div>
          </Panel>

          <Panel className="xl:col-span-1">
            <div className="flex items-center justify-between border-b border-slate-800/60 p-5">
              <div>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400">
                  Onboarding Stream
                </span>
                <h3 className="mt-1 text-base font-semibold text-white">
                  Recent signups
                </h3>
              </div>
              <a
                href="/users"
                className="group flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-400 hover:text-emerald-300"
              >
                All
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
            <div className="scrollbar-custom max-h-[420px] overflow-y-auto">
              {(userStats?.recent_users ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                  <Users className="h-8 w-8 opacity-20" />
                  <p className="text-xs font-medium">No recent signups</p>
                </div>
              ) : (
                <ul>
                  {userStats?.recent_users.map((u) => {
                    const tone = tierTone[u.tier] ?? tierTone.NORMAL!;
                    return (
                      <li
                        key={u.id}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-800/20"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-[11px] font-semibold text-slate-300">
                          {initials(u.name, u.email)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {u.name || "Anonymous"}
                          </p>
                          <p className="truncate text-[11px] font-medium text-slate-500">
                            {u.email}
                          </p>
                        </div>
                        <div className="shrink-0 space-y-1 text-right">
                          <span
                            className={cn(
                              "inline-block rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                              tone.chip,
                            )}
                          >
                            {u.tier.replace("_", " ")}
                          </span>
                          <p className="font-mono text-[10px] font-medium uppercase text-slate-600">
                            {formatTimeAgo(u.created_at)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>

          <Panel className="xl:col-span-1">
            <div className="flex items-center justify-between border-b border-slate-800/60 p-5">
              <div>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-400">
                  Transaction Pulse
                </span>
                <h3 className="mt-1 text-base font-semibold text-white">
                  Live settlements
                </h3>
              </div>
              <a
                href="/transactions"
                className="group flex items-center gap-1 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-cyan-400 hover:text-cyan-300"
              >
                All
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
            <div className="scrollbar-custom max-h-[420px] overflow-y-auto">
              {(txnStats?.recent_transactions ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                  <Activity className="h-8 w-8 opacity-20" />
                  <p className="text-xs font-medium">No activity</p>
                </div>
              ) : (
                <ul>
                  {txnStats?.recent_transactions.map((txn) => {
                    const isCredit = txn.type === "CREDIT";
                    return (
                      <li
                        key={txn.id}
                        className="px-5 py-3 transition-colors hover:bg-slate-800/20"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-slate-950",
                                isCredit
                                  ? "border-emerald-500/25 text-emerald-400"
                                  : "border-rose-500/25 text-rose-400",
                              )}
                            >
                              {isCredit ? (
                                <ArrowDownRight className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">
                                {txn.user?.name ||
                                  txn.user?.email ||
                                  "System"}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[10px] font-medium text-slate-500">
                                {txn.endpoint ||
                                  txn.description ||
                                  "Unlabeled"}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                                    txnTypeColor[txn.type] ||
                                    "bg-slate-800 text-slate-400",
                                  )}
                                >
                                  {txn.type}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                                    txnStatusColor[txn.status] ||
                                    "bg-slate-800 text-slate-400",
                                  )}
                                >
                                  {txn.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 space-y-1 text-right">
                            <p
                              className={cn(
                                "text-sm font-semibold tabular-nums tracking-tight",
                                isCredit ? "text-emerald-400" : "text-white",
                              )}
                            >
                              {isCredit ? "+" : "−"}
                              {formatINR(Math.abs(txn.amount))}
                            </p>
                            <p className="font-mono text-[10px] font-medium uppercase text-slate-600">
                              {formatTimeAgo(txn.created_at)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
