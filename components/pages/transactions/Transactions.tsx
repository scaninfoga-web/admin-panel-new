"use client";

import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, type Variants } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Coins,
  CreditCard,
  IndianRupee,
  Receipt,
  RefreshCw,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import Title from "@/components/custom/custom-title";
import { Button } from "@/components/ui/button";
import CustomSelect from "@/components/custom/custom-select";
import { get } from "@/lib/api";
import { cn } from "@/lib/utils";
import TransactionsTableSection from "./TransactionsTableSection";
import {
  formatCompactNumber,
  formatINR,
  formatTimeAgo,
} from "@/utils/functions";
import { REFRESH_INTERVAL } from "@/utils/constant";

type Period = "monthly" | "quarterly" | "semi_annually" | "annually";
type Tier =
  | "ALL"
  | "NORMAL"
  | "COOPERATIVE"
  | "COOPERATIVE_MEMBER"
  | "COMMERCIAL";
type Vendor = "ALL" | "Scaninfoga" | "Befisc" | "LeakOsint";

interface ProfitBreakdownRow {
  label: string;
  revenue: number;
  source_cost: number;
  gst_on_sales: number;
  profit: number;
  profit_margin_pct: number;
  count: number;
}

interface ApiRow {
  api_id: string | null;
  api_name: string;
  endpoint: string;
  api_vendor: string | null;
  revenue: number;
  source_cost: number;
  gst_on_sales: number;
  profit: number;
  profit_margin_pct: number;
  count: number;
}

interface ProfitStats {
  filters: {
    period: Period;
    year: number;
    tier: Tier;
    api_vendor: Vendor;
    api_id: string | null;
  };
  totals: {
    revenue: number;
    source_cost: number;
    gst_on_sales: number;
    profit: number;
    profit_margin_pct: number;
    debit_count: number;
  };
  breakdown: ProfitBreakdownRow[];
  previous_period: {
    revenue: number;
    source_cost: number;
    gst_on_sales: number;
    profit: number;
    debit_count: number;
  };
  growth: {
    revenue_pct: number;
    profit_pct: number;
  };
  all_apis: ApiRow[];
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

interface TxnGrowthBlock {
  current_count: number;
  previous_count: number;
  current_volume: number;
  previous_volume: number;
  count_percentage: number;
  volume_percentage: number;
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

function periodGranularityLabel(period: Period): string {
  if (period === "monthly") return "Monthly";
  if (period === "quarterly") return "Quarterly";
  if (period === "semi_annually") return "Semi-Annual";
  return "Annual";
}

function formatProfitBreakdownLabel(raw: string, period: Period): string {
  if (period === "monthly") {
    const { year, month } = parseMonth(raw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return raw;
    return new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "short",
    });
  }
  if (period === "quarterly") {
    const match = raw.match(/^(\d{4})-?Q?(\d)$/i);
    if (match) return `Q${match[2]} ${match[1]}`;
    return raw;
  }
  if (period === "semi_annually") {
    const match = raw.match(/^(\d{4})-?H?(\d)$/i);
    if (match) return `H${match[2]} ${match[1]}`;
    return raw;
  }
  return raw;
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
  emerald: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/25",
    stroke: "#10b981",
    bar: "bg-emerald-500",
  },
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    ring: "ring-cyan-500/25",
    stroke: "#06b6d4",
    bar: "bg-cyan-500",
  },
  amber: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/25",
    stroke: "#f59e0b",
    bar: "bg-amber-500",
  },
  rose: {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    ring: "ring-rose-500/25",
    stroke: "#f43f5e",
    bar: "bg-rose-500",
  },
  violet: {
    text: "text-violet-300",
    bg: "bg-violet-500/10",
    ring: "ring-violet-500/25",
    stroke: "#8b5cf6",
    bar: "bg-violet-500",
  },
  slate: {
    text: "text-slate-300",
    bg: "bg-slate-500/10",
    ring: "ring-slate-500/25",
    stroke: "#94a3b8",
    bar: "bg-slate-400",
  },
} as const;

type AccentKey = keyof typeof accent;

const vendorTone: Record<string, { bar: string; chip: string }> = {
  Scaninfoga: {
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
  },
  Befisc: {
    bar: "bg-cyan-500",
    chip: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25",
  },
  LeakOsint: {
    bar: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  },
};

const txnTypeColor: Record<string, string> = {
  CREDIT: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
  DEBIT: "bg-rose-500/10 text-rose-400 border border-rose-500/25",
  TRANSFER: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25",
};

const txnStatusColor: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/25",
  FAILED: "bg-rose-500/10 text-rose-400 border border-rose-500/25",
  REVERSED: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25",
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

function Delta({ pct, suffix }: { pct: number; suffix?: string }): JSX.Element {
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
      <div
        className={cn("absolute inset-y-0 left-0 w-[3px] opacity-80", t.bar)}
      />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {metric.label}
      </span>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tabular-nums sm:text-xl",
          t.text,
        )}
      >
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
            <p className="mt-1 text-xs font-medium text-slate-500">
              {subtitle}
            </p>
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
  scopeLabel,
}: {
  data: ProfitBreakdownRow[];
  mode: "revenue" | "profit" | "gst_on_sales" | "source_cost";
  scopeLabel: string;
}): JSX.Element {
  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center text-xs font-medium text-slate-600">
        Insufficient data
      </div>
    );
  }
  const values = data.map((d) => Math.abs(d[mode]));
  const max = Math.max(...values, 1);
  const gradient =
    mode === "revenue"
      ? "from-cyan-500/50 to-cyan-400 group-hover:from-cyan-500 group-hover:to-cyan-300"
      : mode === "profit"
        ? "from-emerald-500/50 to-emerald-400 group-hover:from-emerald-500 group-hover:to-emerald-300"
        : mode === "gst_on_sales"
          ? "from-amber-500/50 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300"
          : "from-rose-500/50 to-rose-400 group-hover:from-rose-500 group-hover:to-rose-300";
  return (
    <div className="flex h-64 items-stretch gap-2">
      {data.map((d, i) => {
        const raw = d[mode];
        const h = raw > 0 ? Math.max((Math.abs(raw) / max) * 100, 4) : 0;
        return (
          <div
            key={`${d.label}-${i}`}
            className="group flex flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-full w-full items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, delay: i * 0.03, ease: "easeOut" }}
                className={cn(
                  "w-full rounded-xl bg-gradient-to-t transition-all",
                  gradient,
                )}
              />
              <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-950/95 px-2 py-1 text-[10px] font-semibold tabular-nums text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {formatCompactINR(raw)}
              </div>
            </div>
            <span className="font-mono text-[10px] font-medium uppercase text-slate-500">
              {formatProfitBreakdownLabel(d.label, "monthly")}
            </span>
          </div>
        );
      })}
      <span className="sr-only">{scopeLabel}</span>
    </div>
  );
}

function TransactionsSkeleton(): JSX.Element {
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

const Transactions = (): JSX.Element => {
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(currentMonthKey());
  const [period, setPeriod] = useState<Period>("monthly");
  const [year, setYear] = useState<number>(currentYear);
  const [tier, setTier] = useState<Tier>("ALL");
  const [vendor, setVendor] = useState<Vendor>("ALL");
  const [apiId, setApiId] = useState<string>("ALL");
  const [trendMode, setTrendMode] = useState<
    "revenue" | "profit" | "gst_on_sales" | "source_cost"
  >("profit");
  const [apiSort, setApiSort] = useState<
    "profit" | "revenue" | "margin" | "count"
  >("profit");

  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [txnStats, setTxnStats] = useState<TxnStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const reqIdRef = useRef(0);

  const yearOptions = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const value = String(currentYear - index);
      return { label: value, value };
    });
  }, [currentYear]);

  const apiOptions = useMemo(() => {
    const base = [{ label: "All APIs", value: "ALL" }];
    const rows = profitStats?.all_apis ?? [];
    return base.concat(
      rows.map((api) => ({
        label: api.api_name,
        value: api.api_id ?? `endpoint:${api.endpoint}`,
      })),
    );
  }, [profitStats]);

  const buildProfitParams = useCallback((): Record<string, string | number> => {
    const params: Record<string, string | number> = {
      period,
      year,
      tier,
      api_vendor: vendor,
    };
    if (apiId !== "ALL") {
      params.api_id = apiId.startsWith("endpoint:")
        ? apiId.replace("endpoint:", "")
        : apiId;
    }
    return params;
  }, [apiId, period, tier, vendor, year]);

  const fetchAll = useCallback(
    async (silent = false) => {
      silent ? setRefreshing(true) : setLoading(true);
      const requestId = ++reqIdRef.current;
      try {
        const [profitRes, txnRes] = await Promise.all([
          get<ApiEnvelope<ProfitStats>>(
            "/api/v1/admin/txn/profit",
            buildProfitParams() as any,
          ),
          get<ApiEnvelope<TxnStatsData>>("/api/v1/admin/txn/stats", {
            tier,
            month,
          } as any),
        ]);
        if (requestId !== reqIdRef.current) return;
        setProfitStats(profitRes.responseData);
        setTxnStats(txnRes.responseData);
      } catch {
        if (requestId === reqIdRef.current) {
          toast.error("Failed to load transactions overview", {
            id: "transactions-overview",
          });
        }
      } finally {
        if (requestId === reqIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [buildProfitParams, month, tier],
  );

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const vendorBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        revenue: number;
        profit: number;
        gst: number;
        cost: number;
        count: number;
      }
    >();
    for (const row of profitStats?.all_apis ?? []) {
      const key = row.api_vendor ?? "Unknown";
      const current = map.get(key) ?? {
        revenue: 0,
        profit: 0,
        gst: 0,
        cost: 0,
        count: 0,
      };
      current.revenue += row.revenue;
      current.profit += row.profit;
      current.gst += row.gst_on_sales;
      current.cost += row.source_cost;
      current.count += row.count;
      map.set(key, current);
    }
    const totalRevenue = Array.from(map.values()).reduce(
      (sum, r) => sum + r.revenue,
      0,
    );
    return Array.from(map.entries())
      .map(([name, row]) => ({
        name,
        ...row,
        percentage: totalRevenue ? (row.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [profitStats]);

  const sortedApis = useMemo(() => {
    const rows = [...(profitStats?.all_apis ?? [])];
    rows.sort((left, right) => {
      if (apiSort === "revenue") return right.revenue - left.revenue;
      if (apiSort === "margin")
        return right.profit_margin_pct - left.profit_margin_pct;
      if (apiSort === "count") return right.count - left.count;
      return right.profit - left.profit;
    });
    return rows;
  }, [apiSort, profitStats]);

  const maxApiProfit = useMemo(
    () =>
      Math.max(
        ...(sortedApis.map((a) => Math.abs(a.profit)).filter(Boolean) ?? [0]),
        1,
      ),
    [sortedApis],
  );

  if (loading) {
    return (
      <div className="scrollbar-custom h-full overflow-y-auto pr-1 pb-10">
        <TransactionsSkeleton />
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

  const granularity = periodGranularityLabel(period);
  const profitScopeLabel = `${granularity} · ${year}`;
  const profitTotals = profitStats?.totals;
  const profitGrowth = profitStats?.growth;
  const profitPrev = profitStats?.previous_period;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="scrollbar-custom h-full space-y-6 overflow-y-auto pr-1 pb-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Title
          title="Transactions"
          subTitle="Live ledger, profit analysis, and API performance — scoped to the filters you set below."
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
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            variant="outline"
            className="h-10 rounded-xl border-slate-800 bg-slate-900/50 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400"
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")}
            />
            {refreshing ? "Syncing" : "Sync"}
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

            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-4 text-xs font-medium text-slate-300 outline-none focus:border-emerald-500/50"
              />
            </div>

            <CustomSelect
              data={[
                { label: "Monthly", value: "monthly" },
                { label: "Quarterly", value: "quarterly" },
                { label: "Semi-Annually", value: "semi_annually" },
                { label: "Annually", value: "annually" },
              ]}
              value={period}
              onChange={(v) => setPeriod(v as Period)}
              className="w-[160px] border-slate-800 bg-slate-900/50 text-slate-300"
            />

            <CustomSelect
              data={yearOptions}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              className="w-[110px] border-slate-800 bg-slate-900/50 text-slate-300"
            />

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

            <CustomSelect
              data={[
                { label: "All Vendors", value: "ALL" },
                { label: "Scaninfoga", value: "Scaninfoga" },
                { label: "Befisc", value: "Befisc" },
                { label: "LeakOsint", value: "LeakOsint" },
              ]}
              value={vendor}
              onChange={(v) => setVendor(v as Vendor)}
              className="w-[160px] border-slate-800 bg-slate-900/50 text-slate-300"
            />

            <CustomSelect
              data={apiOptions}
              value={apiId}
              onChange={setApiId}
              placeholder="APIs"
              className="min-w-[200px] flex-1 border-slate-800 bg-slate-900/50 text-slate-300"
            />

            <span className="ml-auto flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                Monthly Scope
              </span>
              <span className="text-xs font-semibold text-white">
                {scopeLabel}
              </span>
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-slate-500">
                Profit Scope
              </span>
              <span className="text-xs font-semibold text-white">
                {profitScopeLabel}
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
                  Independent of the filter above.
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
                    label: "Admin Credits · Today",
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
          subtitle={`Every metric below covers ${scopeLabel}. The percentage badge compares it to ${prevMonthLabel}. Adjust the month picker to explore a different period.`}
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
              hint: "Revenue minus source cost",
            },
            {
              label: `GST · ${scopeLabel}`,
              value: formatINR(scope?.gst_collection ?? 0),
              tone: "cyan",
              hint: "Tax collected this month",
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
              hint: "Provider spend this month",
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
                Each card benchmarks the selected month against the previous
                month, quarter, and year — so you can spot seasonality at a
                glance.
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
                vs{" "}
                {formatCompactNumber(
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
                vs{" "}
                {formatCompactNumber(
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
                vs{" "}
                {formatCompactNumber(
                  txnStats.growth.vs_last_year.previous_count,
                )}
              </p>
            </div>
          ) : null}
        </Panel>
      </motion.div>

      <motion.div variants={itemVariants}>
        <PeriodSection
          eyebrow={`Profit analysis · ${profitScopeLabel}`}
          title={`${profitScopeLabel} profitability`}
          subtitle={`Aggregated across ${vendor === "ALL" ? "every vendor" : vendor}, ${tier === "ALL" ? "every tier" : tier}, ${apiId === "ALL" ? "every API" : "selected API"} for ${year}. Delta compares against the previous ${granularity.toLowerCase()} cycle.`}
          accentTone="emerald"
          metrics={[
            {
              label: `Revenue · ${year}`,
              value: formatINR(profitTotals?.revenue ?? 0),
              tone: "cyan",
              delta: profitGrowth?.revenue_pct,
              deltaSuffix: "vs prev period",
            },
            {
              label: `Profit · ${year}`,
              value: formatINR(profitTotals?.profit ?? 0),
              tone: (profitTotals?.profit ?? 0) >= 0 ? "emerald" : "rose",
              delta: profitGrowth?.profit_pct,
              deltaSuffix: "vs prev period",
            },
            {
              label: `Margin · ${year}`,
              value: `${(profitTotals?.profit_margin_pct ?? 0).toFixed(2)}%`,
              tone: "emerald",
              hint: "Profit ÷ revenue",
            },
            {
              label: `Source Cost · ${year}`,
              value: formatINR(profitTotals?.source_cost ?? 0),
              tone: "rose",
              hint: "What we paid vendors",
            },
            {
              label: `GST on Sales · ${year}`,
              value: formatINR(profitTotals?.gst_on_sales ?? 0),
              tone: "amber",
              hint: "Tax on billed revenue",
            },
            {
              label: `Debit Count · ${year}`,
              value: formatCompactNumber(profitTotals?.debit_count ?? 0),
              tone: "slate",
              hint: "Billable API calls",
            },
            {
              label: `Prev Revenue`,
              value: formatINR(profitPrev?.revenue ?? 0),
              tone: "slate",
              hint: `Prior ${granularity.toLowerCase()} cycle`,
            },
            {
              label: `Prev Profit`,
              value: formatINR(profitPrev?.profit ?? 0),
              tone: "slate",
              hint: "Baseline to compare",
            },
          ]}
        />
      </motion.div>

      <motion.div variants={itemVariants}>
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800/60 p-5">
            <div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400">
                Trend · {profitScopeLabel} breakdown
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                {trendMode === "revenue"
                  ? `Revenue per ${granularity.toLowerCase()} bucket`
                  : trendMode === "profit"
                    ? `Profit per ${granularity.toLowerCase()} bucket`
                    : trendMode === "gst_on_sales"
                      ? `GST collected per ${granularity.toLowerCase()} bucket`
                      : `Source cost per ${granularity.toLowerCase()} bucket`}
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Toggle to inspect a single dimension across the{" "}
                {granularity.toLowerCase()} cycles of {year}.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              {[
                { key: "profit", label: "Profit" },
                { key: "revenue", label: "Revenue" },
                { key: "gst_on_sales", label: "GST" },
                { key: "source_cost", label: "Cost" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setTrendMode(opt.key as typeof trendMode)}
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
              data={profitStats?.breakdown ?? []}
              mode={trendMode}
              scopeLabel={profitScopeLabel}
            />
          </div>
        </Panel>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel>
            <div className="border-b border-slate-800/60 p-5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-400">
                Vendor Matrix · {profitScopeLabel}
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                Revenue mix by provider
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Each vendor&apos;s share of revenue for the profit scope you
                selected above. Useful for spotting over-reliance on any single
                source.
              </p>
            </div>
            <div className="space-y-5 p-5">
              {vendorBreakdown.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                  <Wallet className="h-8 w-8 opacity-20" />
                  <p className="text-xs font-medium">No vendor data</p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
                    <div className="flex h-10 w-full">
                      {vendorBreakdown.map((row) => {
                        if (row.percentage <= 0) return null;
                        const tone =
                          vendorTone[row.name] ?? vendorTone.Scaninfoga!;
                        return (
                          <motion.div
                            key={row.name}
                            initial={{ width: 0 }}
                            animate={{ width: `${row.percentage}%` }}
                            transition={{ duration: 1, ease: "circOut" }}
                            className={cn("h-full", tone.bar)}
                            title={`${row.name} · ${row.percentage.toFixed(1)}%`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {vendorBreakdown.map((row) => {
                      const tone =
                        vendorTone[row.name] ?? vendorTone.Scaninfoga!;
                      return (
                        <div
                          key={row.name}
                          className="border-b border-slate-800/60 pb-4 last:border-b-0 last:pb-0"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn("h-2 w-2 rounded-full", tone.bar)}
                              />
                              <span
                                className={cn(
                                  "rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                  tone.chip,
                                )}
                              >
                                {row.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold tabular-nums text-white">
                                {formatCompactINR(row.revenue)}
                              </p>
                              <p className="font-mono text-[10px] font-medium tabular-nums text-slate-500">
                                {row.percentage.toFixed(1)}% of revenue
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-emerald-500/60" />
                              profit {formatCompactINR(row.profit)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3 text-rose-500/60" />
                              cost {formatCompactINR(row.cost)}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3 text-amber-500/60" />
                              gst {formatCompactINR(row.gst)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3 text-cyan-500/60" />
                              {formatCompactNumber(row.count)} calls
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel>
            <div className="border-b border-slate-800/60 p-5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-amber-400">
                Type & Status · {scopeLabel}
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                How the ledger broke down
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Credit vs debit split, plus the health mix of every transaction
                processed in {scopeLabel}.
              </p>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Transaction type
                </span>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(txnStats?.type_breakdown ?? {}).map(
                    ([type, val]) => (
                      <div
                        key={type}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                      >
                        <span
                          className={cn(
                            "inline-block rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                            txnTypeColor[type] ?? "bg-slate-800 text-slate-400",
                          )}
                        >
                          {type}
                        </span>
                        <p className="mt-2 text-base font-semibold tabular-nums text-white">
                          {formatCompactNumber(val.count)} txns
                        </p>
                        <p className="font-mono text-[10px] font-medium tabular-nums text-slate-500">
                          {formatCompactINR(val.volume)} volume
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  Settlement status
                </span>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(txnStats?.status_breakdown ?? {}).map(
                    ([status, val]) => (
                      <div
                        key={status}
                        className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                      >
                        <span
                          className={cn(
                            "inline-block rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                            txnStatusColor[status] ??
                              "bg-slate-800 text-slate-400",
                          )}
                        >
                          {status}
                        </span>
                        <p className="mt-2 text-base font-semibold tabular-nums text-white">
                          {formatCompactNumber(val.count)} txns
                        </p>
                        <p className="font-mono text-[10px] font-medium tabular-nums text-slate-500">
                          {formatCompactINR(val.volume)} volume
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <PeriodSection
          eyebrow="All time · Lifetime"
          title="Lifetime totals"
          subtitle="Cumulative numbers since inception — not filtered by the month or period above. Use this for long-horizon health checks."
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
        <Panel>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-800/60 p-5">
            <div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400">
                API Leaderboard · {profitScopeLabel}
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                Which endpoints earn and which bleed
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                Every API scoped to your profit filter. Sort to find the profit
                leaders, thin-margin APIs, or highest-volume endpoints. Negative
                bars are loss-making — worth a pricing review.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              {[
                { value: "profit", label: "Profit" },
                { value: "revenue", label: "Revenue" },
                { value: "margin", label: "Margin" },
                { value: "count", label: "Calls" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setApiSort(item.value as typeof apiSort)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all",
                    apiSort === item.value
                      ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "text-slate-500 hover:text-slate-300",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="scrollbar-custom max-h-[620px] overflow-y-auto">
            {sortedApis.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <Target className="h-8 w-8 opacity-20" />
                <p className="text-xs font-medium">No active APIs</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/60">
                {sortedApis.map((api, i) => {
                  const positive = api.profit >= 0;
                  const widthPct = (Math.abs(api.profit) / maxApiProfit) * 100;
                  const tone =
                    vendorTone[api.api_vendor ?? ""] ?? vendorTone.Scaninfoga!;
                  return (
                    <li
                      key={`${api.api_id ?? api.endpoint}-${i}`}
                      className="group relative px-5 py-4 transition-colors hover:bg-slate-800/20"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 font-mono text-[10px] font-semibold tabular-nums text-slate-400">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">
                                {api.api_name}
                              </p>
                              <span
                                className={cn(
                                  "rounded-xl px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                                  tone.chip,
                                )}
                              >
                                {api.api_vendor ?? "UNLINKED"}
                              </span>
                            </div>
                            <p className="truncate font-mono text-[10px] font-medium text-slate-500">
                              {api.endpoint}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={cn(
                              "text-sm font-semibold tabular-nums tracking-tight",
                              positive ? "text-emerald-400" : "text-rose-400",
                            )}
                          >
                            {positive ? "+" : ""}
                            {formatCompactINR(api.profit)}
                          </p>
                          <p className="font-mono text-[10px] font-medium uppercase text-slate-500">
                            {api.profit_margin_pct.toFixed(1)}% margin
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-xl bg-slate-800/60">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 1, ease: "circOut" }}
                          className={cn(
                            "h-full rounded-xl",
                            positive ? "bg-emerald-500" : "bg-rose-500",
                          )}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-500 md:grid-cols-4">
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3 opacity-40" />
                          rev {formatCompactINR(api.revenue)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3 opacity-40" />
                          cost {formatCompactINR(api.source_cost)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3 opacity-40" />
                          gst {formatCompactINR(api.gst_on_sales)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3 opacity-40" />
                          {formatCompactNumber(api.count)} calls
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Panel>
          <div className="flex items-center justify-between border-b border-slate-800/60 p-5">
            <div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-400">
                Settlement Feed · Latest
              </span>
              <h3 className="mt-1 text-base font-semibold text-white">
                Most recent ledger entries
              </h3>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                A sample of the most recent credits and debits across the entire
                platform — independent of the filters above.
              </p>
            </div>
            <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 sm:inline-flex">
              Last {txnStats?.recent_transactions.length ?? 0}
            </span>
          </div>

          <div className="scrollbar-custom max-h-[520px] overflow-y-auto">
            {(txnStats?.recent_transactions ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
                <ArrowLeftRight className="h-8 w-8 opacity-20" />
                <p className="text-xs font-medium">No recent activity</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800/60">
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
                                "System entry"}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] font-medium text-slate-500">
                              {txn.endpoint || txn.description || "Unlabeled"}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                                  txnTypeColor[txn.type] ??
                                    "bg-slate-800 text-slate-400",
                                )}
                              >
                                {txn.type}
                              </span>
                              <span
                                className={cn(
                                  "rounded-xl px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                                  txnStatusColor[txn.status] ??
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
                            bal {formatCompactINR(txn.balance_after)}
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
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-emerald-400">
            Granular audit log
          </span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className="text-[11px] font-medium text-slate-500">
            Every billable transaction for the profit scope above
          </span>
        </div>
        <TransactionsTableSection
          period={period}
          year={year}
          tier={tier}
          vendor={vendor}
          apiId={apiId}
        />
      </motion.div>
    </motion.div>
  );
};

export default Transactions;
