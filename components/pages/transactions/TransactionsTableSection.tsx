"use client";

import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Search, X, Calendar, Database, Filter, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  CustomTable,
  type ColumnDef,
} from "@/components/custom/custom-table";
import { Card } from "@/components/ui/card";
import CustomSelect from "@/components/custom/custom-select";
import { get } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  formatCompactNumber,
  formatINR,
  formatTimeAgo,
} from "@/utils/functions";

type Period = "monthly" | "quarterly" | "semi_annually" | "annually";
type Tier =
  | "ALL"
  | "NORMAL"
  | "COOPERATIVE"
  | "COOPERATIVE_MEMBER"
  | "COMMERCIAL";
type Vendor = "ALL" | "Scaninfoga" | "Befisc" | "LeakOsint";
type TxnStatus = "ALL" | "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

interface TxnTableRow {
  id: string;
  reference_id: string | null;
  created_at: string;
  endpoint: string;
  api_name: string | null;
  api_vendor: string | null;
  revenue: number;
  source_cost: number;
  gst_on_sales: number;
  profit: number;
  balance_after: number;
  txn_status: string;
  description: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    mobile_number: string | null;
    tier: string;
  } | null;
}

interface TxnTable {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  items: TxnTableRow[];
}

interface ProfitStatsResponse {
  transactions: TxnTable;
}

interface ApiEnvelope<T> {
  responseStatus: { status: boolean; statusCode: number; message: string };
  responseData: T;
}

interface TransactionsTableSectionProps {
  period: Period;
  year: number;
  tier: Tier;
  vendor: Vendor;
  apiId: string;
}

const vendorColor: Record<string, string> = {
  Scaninfoga: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Befisc: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  LeakOsint: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

const tierColor: Record<string, string> = {
  NORMAL: "bg-slate-800 text-slate-400",
  COOPERATIVE: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
  COOPERATIVE_MEMBER: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  COMMERCIAL: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
};

const txnStatusColor: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  FAILED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  REVERSED: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
};

const txnColumns: ColumnDef<TxnTableRow>[] = [
  {
    id: "reference_id",
    header: "Transaction Ref",
    width: 200,
    render: (_value, row) => (
      <div className="min-w-0 py-1">
        <p className="truncate font-mono text-[10px] font-black text-white/90">
          {row.reference_id ?? row.id}
        </p>
        <p className="truncate text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{row.id}</p>
      </div>
    ),
  },
  {
    id: "user",
    header: "Account",
    width: 240,
    render: (_value, row) => (
      <div className="min-w-0 py-1">
        <p className="truncate text-[12px] font-black text-white">
          {row.user?.name ?? "Anonymous Entity"}
        </p>
        <p className="truncate text-[10px] font-bold text-slate-500">
          {row.user?.email ?? "No identifier"}
        </p>
      </div>
    ),
  },
  {
    id: "tier",
    header: "Tier",
    width: 130,
    render: (_value, row) => (
      <span className={cn("rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider", tierColor[row.user?.tier ?? ""] || "bg-slate-800 text-slate-500")}>
        {(row.user?.tier ?? "UNKNOWN").replace("_", " ")}
      </span>
    ),
  },
  {
    id: "api",
    header: "Service Endpoint",
    width: 250,
    render: (_value, row) => (
      <div className="min-w-0 py-1">
        <p className="truncate text-[11px] font-black text-white">
          {row.api_name ?? "Unlabeled API"}
        </p>
        <p className="truncate font-mono text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
          {row.endpoint}
        </p>
      </div>
    ),
  },
  {
    id: "revenue",
    header: "Revenue",
    width: 110,
    render: (_value, row) => (
      <span className="font-black text-cyan-400 text-sm tracking-tight">{formatINR(row.revenue)}</span>
    ),
  },
  {
    id: "profit",
    header: "Net Profit",
    width: 110,
    render: (_value, row) => (
      <span className={cn("font-black text-sm tracking-tight", row.profit >= 0 ? "text-emerald-400" : "text-rose-400")}>
        {row.profit >= 0 ? "+" : ""}{formatINR(row.profit)}
      </span>
    ),
  },
  {
    id: "txn_status",
    header: "Status",
    width: 120,
    render: (_value, row) => (
      <span className={cn("rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest", txnStatusColor[row.txn_status] || "bg-slate-800 text-slate-500")}>
        {row.txn_status}
      </span>
    ),
  },
  {
    id: "created_at",
    header: "Timestamp",
    width: 130,
    render: (_value, row) => (
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
        {formatTimeAgo(row.created_at)}
      </span>
    ),
  },
  {
     id: "actions",
     header: "",
     width: 50,
     render: () => <ArrowRight className="h-4 w-4 text-slate-700" />
  }
];

export default function TransactionsTableSection({
  period,
  year,
  tier,
  vendor,
  apiId,
}: TransactionsTableSectionProps): JSX.Element {
  const router = useRouter();
  const reqIdRef = useRef(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [txnStatus, setTxnStatus] = useState<TxnStatus>("COMPLETED");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [httpStatusCode, setHttpStatusCode] = useState("");
  const [limit, setLimit] = useState("50");
  const [txnItems, setTxnItems] = useState<TxnTableRow[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnHasMore, setTxnHasMore] = useState(false);
  const [txnLoading, setTxnLoading] = useState(true);
  const [txnLoadingMore, setTxnLoadingMore] = useState(false);

  const buildProfitParams = useCallback(
    (extra: Record<string, string | number> = {}): Record<string, string | number> => {
      const params: Record<string, string | number> = {
        period,
        year,
        tier,
        api_vendor: vendor,
        ...extra,
      };

      if (apiId !== "ALL") {
        params.api_id = apiId.startsWith("endpoint:")
          ? apiId.replace("endpoint:", "")
          : apiId;
      }

      if (search.trim()) params.q = search.trim();
      if (txnStatus !== "ALL") params.txn_status = txnStatus;
      if (minAmount.trim()) params.min_amount = minAmount.trim();
      if (maxAmount.trim()) params.max_amount = maxAmount.trim();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (httpStatusCode.trim()) params.http_status_code = httpStatusCode.trim();

      return params;
    },
    [
      apiId,
      endDate,
      httpStatusCode,
      maxAmount,
      minAmount,
      period,
      search,
      startDate,
      tier,
      txnStatus,
      vendor,
      year,
    ],
  );

  const fetchTransactions = useCallback(
    async (page = 1, append = false) => {
      append ? setTxnLoadingMore(true) : setTxnLoading(true);
      const requestId = ++reqIdRef.current;

      try {
        const response = await get<ApiEnvelope<ProfitStatsResponse>>(
          "/api/v1/admin/txn/profit",
          buildProfitParams({ page, limit: Number(limit) }) as any,
        );

        if (requestId !== reqIdRef.current) return;

        const table = response.responseData.transactions;
        setTxnItems((previous) => (append ? [...previous, ...table.items] : table.items));
        setTxnPage(table.page);
        setTxnTotal(table.total);
        setTxnHasMore(table.has_more);
      } catch {
        if (requestId === reqIdRef.current) {
          toast.error("Failed to load transaction list", { id: "transactions-table" });
        }
      } finally {
        if (requestId === reqIdRef.current) {
          setTxnLoading(false);
          setTxnLoadingMore(false);
        }
      }
    },
    [buildProfitParams, limit],
  );

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    fetchTransactions(1, false);
  }, [fetchTransactions]);

  const handleLoadMore = useCallback(() => {
    if (!txnLoadingMore && txnHasMore) {
      fetchTransactions(txnPage + 1, true);
    }
  }, [fetchTransactions, txnHasMore, txnLoadingMore, txnPage]);

  const tableFilterCount = useMemo(() => {
    return [
      search.trim(),
      txnStatus !== "COMPLETED" ? txnStatus : "",
      minAmount.trim(),
      maxAmount.trim(),
      startDate,
      endDate,
      httpStatusCode.trim(),
      limit !== "50" ? limit : "",
    ].filter(Boolean).length;
  }, [endDate, httpStatusCode, limit, maxAmount, minAmount, search, startDate, txnStatus]);

  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/50 bg-slate-900/30 px-6 py-5">
        <div className="flex items-center gap-3">
           <div className="rounded-xl bg-emerald-500/10 p-2 border border-emerald-500/20">
              <Receipt className="h-5 w-5 text-emerald-400" />
           </div>
           <div>
              <h3 className="text-sm font-black text-white tracking-wide uppercase">Granular Audit Log</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Historical performance & settlement records</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">{formatCompactNumber(txnTotal)} Entries</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">
                 {tableFilterCount > 0 ? (
                    <span className="text-emerald-500">{tableFilterCount} Filters Active</span>
                 ) : "Default View"}
              </p>
           </div>
        </div>
      </div>

      <div className="border-b border-slate-800/50 bg-slate-950/20 px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[320px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-500" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search users, emails, or reference IDs..."
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-10 text-xs font-bold text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none transition-all"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <CustomSelect
            data={[
              { label: "Completed", value: "COMPLETED" },
              { label: "All Status", value: "ALL" },
              { label: "Pending", value: "PENDING" },
              { label: "Failed", value: "FAILED" },
              { label: "Reversed", value: "REVERSED" },
            ]}
            value={txnStatus}
            onChange={(v) => setTxnStatus(v as TxnStatus)}
            className="w-[140px] border-slate-800 bg-slate-900/50"
          />

          <div className="flex items-center gap-2">
             <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">Min</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="h-10 w-24 rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-3 text-xs font-bold text-white focus:border-emerald-500/50 focus:outline-none"
                />
             </div>
             <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">Max</span>
                <input
                  type="number"
                  placeholder="∞"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="h-10 w-24 rounded-xl border border-slate-800 bg-slate-900/50 pl-10 pr-3 text-xs font-bold text-white focus:border-emerald-500/50 focus:outline-none"
                />
             </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/40 p-1 rounded-xl border border-slate-800">
             <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 bg-transparent text-[10px] font-bold text-slate-300 px-2 focus:outline-none"
            />
            <div className="h-4 w-px bg-slate-800" />
             <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 bg-transparent text-[10px] font-bold text-slate-300 px-2 focus:outline-none"
            />
          </div>

          <CustomSelect
            data={[
              { label: "50 Rows", value: "50" },
              { label: "100 Rows", value: "100" },
              { label: "250 Rows", value: "250" },
            ]}
            value={limit}
            onChange={setLimit}
            className="w-[110px] border-slate-800 bg-slate-900/50"
          />

          <button
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setTxnStatus("COMPLETED");
              setMinAmount("");
              setMaxAmount("");
              setStartDate("");
              setEndDate("");
              setHttpStatusCode("");
              setLimit("50");
            }}
            className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-rose-500/30 hover:text-rose-400 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="p-2">
        <div className="min-h-0 flex-1">
          <CustomTable<TxnTableRow>
            columns={txnColumns}
            data={txnItems}
            loading={txnLoading}
            loadingMore={txnLoadingMore}
            keyExtractor={(row) => row.id}
            hasMore={txnHasMore}
            onLoadMore={handleLoadMore}
            onRowClick={(row) => router.push(`/transactions/${row.id}`)}
            maxHeight="700px"
            emptyMessage="No transaction records found matching your criteria"
          />
        </div>
      </div>
    </Card>
  );
}
