"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  Globe,
  IndianRupee,
  Key,
  Mail,
  MapPin,
  Phone,
  Shield,
  User as UserIcon,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import Title from "@/components/custom/custom-title";
import { Loader } from "@/components/custom/custom-loader";
import { get } from "@/lib/api";
import { formatDate, formatINR } from "@/utils/functions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TxnDetailTransaction {
  id: string;
  reference_id: string;
  type: string;
  status: string;
  amount: number;
  balance_after: number;
  endpoint: string;
  description: string;
  metadata: any;
  created_at: string;
  api_key_id: string | null;
  revenue: number;
  source_cost: number;
  profit: number;
  profit_margin_pct: number;
}

interface TxnDetailUser {
  id: string;
  name: string | null;
  email: string;
  mobile_number: string | null;
  tier: string;
  isActive: boolean;
  verificationStatus: string;
  company_name: string | null;
  pan_number: string | null;
  aadhar_number: string | null;
  gst_number: string | null;
  full_address: string | null;
  createdAt: string;
}

interface TxnDetailWallet {
  id: string;
  wallet_type: string;
  balance: number;
  credit_limit: number;
  currency: string;
  is_active: boolean;
}

interface TxnDetailApiKey {
  id: string;
  type: string;
  status: string;
  key_hash: string;
  total_amount_utilized: number;
  last_used_at: string;
}

interface TxnDetailApi {
  id: string;
  api_name: string;
  endpoint: string;
  method: string;
  api_vendor: string;
  api_vendor_url: string | null;
  description: string | null;
  user_price: number;
  cooperative_price: number;
  commercial_price: number;
  source_price: number | null;
}

interface TxnDetailClient {
  ip: string | null;
  public_ip: string | null;
  isp: string | null;
  asn: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  browser: string | null;
  device_type: string | null;
  device: string | null;
  platform: string | null;
  user_agent: string | null;
  language: string | null;
  screen_size: string | null;
  cpu_cores: number | null;
  memory: string | null;
  battery_level: number | null;
  is_charging: boolean | null;
  cookies_enabled: boolean | null;
  javascript_enabled: boolean | null;
  touch_support: boolean | null;
  gpu_renderer: string | null;
  cameras: any;
  microphones: any;
  possible_iot: boolean | null;
}

interface TxnDetailActivity {
  id: string;
  txn_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  before_balance: number;
  after_balance: number;
  request_payload: any;
  response_payload: any;
  timestamp: string;
  client: TxnDetailClient;
}

interface TxnDetail {
  transaction: TxnDetailTransaction;
  user: TxnDetailUser;
  wallet: TxnDetailWallet;
  api_key: TxnDetailApiKey | null;
  api: TxnDetailApi;
  user_activity: TxnDetailActivity | null;
}

interface ApiEnvelope<T> {
  responseStatus: { status: boolean; statusCode: number; message: string };
  responseData: T;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  SUCCESS: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  FAILED: "bg-red-500/10 text-red-400 ring-red-500/20",
  REVERSED: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
};

const tierColor: Record<string, string> = {
  NORMAL: "bg-slate-500/10 text-slate-400",
  COOPERATIVE: "bg-cyan-500/10 text-cyan-400",
  COOPERATIVE_MEMBER: "bg-purple-500/10 text-purple-400",
  COMMERCIAL: "bg-amber-500/10 text-amber-400",
  ADMIN: "bg-red-500/10 text-red-400",
};

const vendorColor: Record<string, string> = {
  Scaninfoga: "bg-emerald-500/10 text-emerald-400",
  Befisc: "bg-cyan-500/10 text-cyan-400",
  LeakOsint: "bg-purple-500/10 text-purple-400",
};

function copy(text: string, label = "Copied") {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(label, { id: "copy" }))
    .catch(() => toast.error("Copy failed"));
}

// ─── Reusable row / cards ─────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  copyable,
}: {
  icon?: typeof Mail;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyable?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-800/60 py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
        <span className="text-[11px] uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`max-w-[260px] truncate text-[13px] text-slate-200 ${
            mono ? "font-mono text-[11px]" : ""
          }`}
        >
          {value ?? <span className="text-slate-600">—</span>}
        </span>
        {copyable && (
          <button
            onClick={() => copy(copyable)}
            className="text-slate-500 hover:text-emerald-400"
            title="Copy"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  accent,
  children,
  action,
}: {
  icon: typeof Mail;
  title: string;
  accent: "emerald" | "cyan" | "amber" | "purple" | "rose";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const ring: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
    amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    purple: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
    rose: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  };
  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-xl p-2 ring-1 ${ring[accent]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {action}
      </div>
      <div className="px-5 py-2">{children}</div>
    </Card>
  );
}

// ─── JSON viewer ──────────────────────────────────────────────────────────────

function JsonBlock({
  title,
  data,
  defaultOpen = true,
}: {
  title: string;
  data: any;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const json = useJsonString(data);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              copy(json, `${title} copied`);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400"
          >
            <Copy className="h-3 w-3" />
          </button>
          {open ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </button>
      {open && (
        <pre className="scrollbar-custom max-h-80 overflow-auto border-t border-slate-800/80 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-300">
          {json}
        </pre>
      )}
    </div>
  );
}

function useJsonString(data: any) {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return "";
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  txnId: string;
}

const TransactionDetail: React.FC<Props> = ({ txnId }) => {
  const [data, setData] = useState<TxnDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get<ApiEnvelope<TxnDetail>>(
        `/api/v1/admin/txn/${txnId}`,
      );
      setData(res.responseData);
    } catch {
      toast.error("Failed to load transaction details", { id: "txn-detail" });
    } finally {
      setLoading(false);
    }
  }, [txnId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) return <Loader />;

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-500">Transaction not found</p>
      </div>
    );
  }

  const { transaction, user, wallet, api_key, api, user_activity } = data;
  const isCredit = transaction.type === "CREDIT";
  const profitPositive = transaction.profit >= 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="scrollbar-custom h-full space-y-6 overflow-y-auto pr-1"
    >
      <Title
        title="Transaction Details"
        subTitle={transaction.reference_id}
        backButton
        path="/transactions"
      />

      {/* Hero card */}
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden border-slate-800 bg-slate-900/50 p-6 backdrop-blur-xl">
          <div
            className={`pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl ${
              isCredit ? "bg-emerald-500/10" : "bg-red-500/10"
            }`}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ring-1 ${
                  isCredit
                    ? "bg-emerald-500/10 ring-emerald-500/20"
                    : "bg-red-500/10 ring-red-500/20"
                }`}
              >
                {isCredit ? (
                  <ArrowDownRight className="h-7 w-7 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="h-7 w-7 text-red-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
                      statusColor[transaction.status] ??
                      "bg-slate-800 text-slate-400 ring-slate-700"
                    }`}
                  >
                    {transaction.status}
                  </span>
                  <span
                    className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      isCredit
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {transaction.type}
                  </span>
                </div>
                <p
                  className={`mt-2 text-4xl font-bold tracking-tight ${
                    isCredit ? "text-emerald-400" : "text-white"
                  }`}
                >
                  {isCredit ? "+" : "−"}
                  {formatINR(Math.abs(transaction.amount))}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="font-mono text-[11px]">
                    {transaction.reference_id}
                  </span>
                  <button
                    onClick={() => copy(transaction.reference_id, "Ref copied")}
                    className="text-slate-500 hover:text-emerald-400"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(transaction.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <HeroStat
                icon={IndianRupee}
                label="Revenue"
                value={formatINR(transaction.revenue)}
                color="cyan"
              />
              <HeroStat
                icon={Zap}
                label="Source Cost"
                value={formatINR(transaction.source_cost)}
                color="rose"
              />
              <HeroStat
                icon={IndianRupee}
                label="Profit"
                value={`${profitPositive ? "+" : ""}${formatINR(transaction.profit)}`}
                color={profitPositive ? "emerald" : "rose"}
              />
              <HeroStat
                icon={IndianRupee}
                label="Margin"
                value={`${transaction.profit_margin_pct.toFixed(1)}%`}
                color="amber"
              />
            </div>
          </div>
          <div className="relative mt-6 border-t border-slate-800 pt-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">
              Description
            </p>
            <p className="mt-1 font-mono text-[12px] text-slate-300">
              {transaction.description}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              endpoint:{" "}
              <span className="font-mono text-slate-400">
                {transaction.endpoint}
              </span>
            </p>
          </div>
        </Card>
      </motion.div>

      {/* User + Wallet */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <SectionCard icon={UserIcon} title="User" accent="emerald">
            <InfoRow
              icon={UserIcon}
              label="Name"
              value={user.name ?? "—"}
              copyable={user.name ?? undefined}
            />
            <InfoRow
              icon={Mail}
              label="Email"
              value={user.email}
              copyable={user.email}
            />
            <InfoRow
              icon={Phone}
              label="Mobile"
              value={user.mobile_number ?? "—"}
              copyable={user.mobile_number ?? undefined}
            />
            <InfoRow
              icon={Shield}
              label="Tier"
              value={
                <span
                  className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    tierColor[user.tier] ?? "bg-slate-500/10 text-slate-400"
                  }`}
                >
                  {user.tier.replace("_", " ")}
                </span>
              }
            />
            <InfoRow
              icon={CheckCircle2}
              label="Verification"
              value={
                <span
                  className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    user.verificationStatus === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : user.verificationStatus === "PENDING"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {user.verificationStatus}
                </span>
              }
            />
            <InfoRow
              icon={Building2}
              label="Company"
              value={user.company_name ?? "—"}
            />
            <InfoRow label="PAN" value={user.pan_number ?? "—"} mono />
            <InfoRow label="Aadhaar" value={user.aadhar_number ?? "—"} mono />
            <InfoRow label="GST" value={user.gst_number ?? "—"} mono />
            <InfoRow
              icon={MapPin}
              label="Address"
              value={user.full_address ?? "—"}
            />
            <InfoRow label="Joined" value={formatDate(user.createdAt)} />
          </SectionCard>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <SectionCard icon={Wallet} title="Wallet" accent="cyan">
            <InfoRow
              label="Balance"
              value={
                <span className="font-semibold text-emerald-400">
                  {formatINR(wallet.balance)}
                </span>
              }
            />
            <InfoRow
              label="Credit Limit"
              value={formatINR(wallet.credit_limit)}
            />
            <InfoRow
              label="Type"
              value={
                <span className="rounded-xl bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                  {wallet.wallet_type}
                </span>
              }
            />
            <InfoRow label="Currency" value={wallet.currency} />
            <InfoRow
              label="Status"
              value={
                <span
                  className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold ${
                    wallet.is_active
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {wallet.is_active ? "Active" : "Inactive"}
                </span>
              }
            />
            <InfoRow
              label="Balance After Txn"
              value={
                <span className="font-semibold text-white">
                  {formatINR(transaction.balance_after)}
                </span>
              }
            />
          </SectionCard>

          {api_key ? (
            <SectionCard icon={Key} title="API Key" accent="amber">
              <InfoRow
                label="Key Hash"
                value={api_key.key_hash}
                mono
                copyable={api_key.key_hash}
              />
              <InfoRow
                label="Type"
                value={
                  <span className="rounded-xl bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                    {api_key.type}
                  </span>
                }
              />
              <InfoRow
                label="Status"
                value={
                  <span
                    className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      api_key.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {api_key.status}
                  </span>
                }
              />
              <InfoRow
                label="Total Utilized"
                value={formatINR(api_key.total_amount_utilized)}
              />
              <InfoRow
                label="Last Used"
                value={formatDate(api_key.last_used_at)}
              />
            </SectionCard>
          ) : (
            <SectionCard icon={Key} title="API Key" accent="amber">
              <p className="py-6 text-center text-sm text-slate-500">
                No API key used (internal/web call)
              </p>
            </SectionCard>
          )}
        </motion.div>
      </div>

      {/* API info */}
      <motion.div variants={itemVariants}>
        <SectionCard
          icon={Zap}
          title="API"
          accent="purple"
          action={
            <span
              className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                vendorColor[api.api_vendor] ??
                "bg-slate-500/10 text-slate-400"
              }`}
            >
              {api.api_vendor}
            </span>
          }
        >
          <InfoRow label="Name" value={api.api_name} />
          <InfoRow
            label="Endpoint"
            value={api.endpoint}
            mono
            copyable={api.endpoint}
          />
          <InfoRow
            label="Method"
            value={
              <span className="rounded-xl bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
                {api.method}
              </span>
            }
          />
          <InfoRow label="Description" value={api.description ?? "—"} />
          <InfoRow
            label="Vendor URL"
            value={api.api_vendor_url ?? "—"}
            mono
            copyable={api.api_vendor_url ?? undefined}
          />
          <div className="mt-2 grid grid-cols-2 gap-3 pb-3 md:grid-cols-4">
            <PriceCell label="User" price={api.user_price} />
            <PriceCell label="Cooperative" price={api.cooperative_price} />
            <PriceCell label="Commercial" price={api.commercial_price} />
            <PriceCell label="Source" price={api.source_price} />
          </div>
        </SectionCard>
      </motion.div>

      {/* User activity */}
      {user_activity ? (
        <motion.div variants={itemVariants}>
          <SectionCard
            icon={Activity}
            title="API Call Activity"
            accent="rose"
            action={
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-xl px-2 py-0.5 text-[10px] font-semibold ${
                    user_activity.status_code >= 200 &&
                    user_activity.status_code < 300
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {user_activity.status_code}
                </span>
                <span className="rounded-xl bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  {user_activity.duration_ms}ms
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3 py-3 md:grid-cols-4">
              <MiniCell
                label="Before Balance"
                value={formatINR(user_activity.before_balance)}
              />
              <MiniCell
                label="After Balance"
                value={formatINR(user_activity.after_balance)}
              />
              <MiniCell
                label="Duration"
                value={`${user_activity.duration_ms} ms`}
              />
              <MiniCell label="Method" value={user_activity.method} />
            </div>
            <div className="space-y-3 pb-4">
              <JsonBlock
                title="Request Payload"
                data={user_activity.request_payload}
              />
              <JsonBlock
                title="Response Payload"
                data={user_activity.response_payload}
                defaultOpen={false}
              />
            </div>
          </SectionCard>
        </motion.div>
      ) : null}

      {/* Client info */}
      {user_activity?.client && (
        <motion.div variants={itemVariants}>
          <SectionCard icon={Globe} title="Client Info" accent="cyan">
            <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
              <div>
                <InfoRow label="IP" value={user_activity.client.ip ?? "—"} mono />
                <InfoRow
                  label="Public IP"
                  value={user_activity.client.public_ip ?? "—"}
                  mono
                />
                <InfoRow label="ISP" value={user_activity.client.isp ?? "—"} />
                <InfoRow label="ASN" value={user_activity.client.asn ?? "—"} />
                <InfoRow
                  label="City"
                  value={user_activity.client.city ?? "—"}
                />
                <InfoRow
                  label="Country"
                  value={user_activity.client.country ?? "—"}
                />
                <InfoRow
                  label="Platform"
                  value={user_activity.client.platform ?? "—"}
                />
                <InfoRow
                  label="Browser"
                  value={user_activity.client.browser ?? "—"}
                />
              </div>
              <div>
                <InfoRow
                  label="Device"
                  value={user_activity.client.device ?? "—"}
                />
                <InfoRow
                  label="Device Type"
                  value={user_activity.client.device_type ?? "—"}
                />
                <InfoRow
                  label="Screen Size"
                  value={user_activity.client.screen_size ?? "—"}
                />
                <InfoRow
                  label="CPU Cores"
                  value={
                    user_activity.client.cpu_cores !== null
                      ? String(user_activity.client.cpu_cores)
                      : "—"
                  }
                />
                <InfoRow
                  label="Memory"
                  value={user_activity.client.memory ?? "—"}
                />
                <InfoRow
                  label="GPU"
                  value={user_activity.client.gpu_renderer ?? "—"}
                />
                <InfoRow
                  label="Language"
                  value={user_activity.client.language ?? "—"}
                />
                <InfoRow
                  label="User Agent"
                  value={user_activity.client.user_agent ?? "—"}
                  mono
                />
              </div>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* Metadata */}
      {transaction.metadata && (
        <motion.div variants={itemVariants}>
          <SectionCard icon={CreditCard} title="Metadata" accent="purple">
            <div className="py-3">
              <JsonBlock title="Transaction metadata" data={transaction.metadata} />
            </div>
          </SectionCard>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Small components ─────────────────────────────────────────────────────────

function HeroStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  color: "emerald" | "cyan" | "amber" | "rose" | "purple";
}) {
  const ring: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
    amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 ring-rose-500/20",
    purple: "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center gap-2">
        <div className={`rounded-xl p-1.5 ring-1 ${ring[color]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function MiniCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function PriceCell({
  label,
  price,
}: {
  label: string;
  price: number | null;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">
        {price === null || price === undefined ? "—" : formatINR(price)}
      </p>
    </div>
  );
}

export default TransactionDetail;
