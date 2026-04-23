// ─── Global enums ─────────────────────────────────────────────────────────────

export enum UserTier {
  NORMAL = "NORMAL",
  COOPERATIVE = "COOPERATIVE",
  COOPERATIVE_MEMBER = "COOPERATIVE_MEMBER",
  COMMERCIAL = "COMMERCIAL",
  ADMIN = "ADMIN",
}

export enum VerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum WalletType {
  PREPAID = "PREPAID",
  POSTPAID = "POSTPAID",
}

export enum ApiKeyStatus {
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
}

export enum TransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
  REFUND = "REFUND",
}

export enum TransactionStatus {
  SUCCESS = "SUCCESS",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

export enum UserManageType {
  CREDIT = "CREDIT",
  TOGGLE_USER = "TOGGLE_USER",
  TOGGLE_API_KEY = "TOGGLE_API_KEY",
  SET_VERIFICATION = "SET_VERIFICATION",
  SET_WALLET_TYPE = "SET_WALLET_TYPE",
  SET_CREDIT_LIMIT = "SET_CREDIT_LIMIT",
  SET_CUSTOM_PRICING = "SET_CUSTOM_PRICING",
}

// ─── Shared API response envelope ─────────────────────────────────────────────

export interface ResponseStatus {
  status: boolean;
  statusCode: number;
  message: string;
}

export interface ApiResponse<T> {
  responseStatus: ResponseStatus;
  responseData: T;
}

// ─── User & related resources (admin panel) ───────────────────────────────────

export interface ParentSummary {
  id: string;
  name: string | null;
  email: string;
  mobile_number: string | null;
  tier: UserTier;
}

export interface SubUser {
  id: string;
  name: string | null;
  email: string;
  mobile_number: string | null;
  tier: UserTier;
  is_active: boolean;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  metadata: unknown;
  created_at: string;
}

export interface Wallet {
  id: string;
  wallet_type: WalletType;
  balance: number;
  credit_limit: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  transactions: Transaction[];
}

export interface ApiKey {
  id: string;
  key: string;
  type: string;
  status: ApiKeyStatus;
  block_reason: string | null;
  total_amount_utilized: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  price: number;
  note: string;
  changed_at: string;
}

export interface ApiPricing {
  api_id: string;
  api_name: string;
  endpoint: string;
  method: string;
  description: string | null;
  user_price: number;
  cooperative_price: number;
  commercial_price: number;
  source_price: number;
  custom_price: number | null;
  has_custom_price: boolean;
  price_history: PriceHistory[];
}

export interface ActivityHeaders {
  latitude: number | null;
  longitude: number | null;
  ip: string | null;
  public_ip: string | null;
  isp: string | null;
  city: string | null;
  asn: string | null;
  country: string | null;
  browser: string | null;
  device_type: string | null;
  cpu_cores: number | null;
  memory: string | null;
  screen_size: string | null;
  battery_level: string | null;
  device: string | null;
  user_agent: string | null;
  platform: string | null;
  language: string | null;
  cookies_enabled: boolean | null;
  javascript_enabled: boolean | null;
  touch_support: boolean | null;
  is_charging: string | null;
  gpu_renderer: string | null;
  cameras: string | null;
  microphones: string | null;
  possible_iot: boolean | null;
}

export interface ActivityLog {
  id: string;
  txn_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  duration: number;
  before_balance: number;
  after_balance: number;
  request_payload: unknown;
  response_payload: unknown;
  timestamp: string;
  headers: ActivityHeaders;
}

export interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  mobile_number: string | null;
  tier: UserTier;
  is_active: boolean;
  block_reason: string | null;
  verification_status: VerificationStatus;
  verification_rejection_reason: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  full_address: string | null;
  company_name: string | null;
  cin_number: string | null;
  gst_number: string | null;
  udyam_number: string | null;
  use_case: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  parent: ParentSummary | null;
  sub_users: SubUser[];
  wallet: Wallet | null;
  api_keys: ApiKey[];
  api_keys_count: number;
  api_pricings: ApiPricing[];
  activity_logs: ActivityLog[];
  activity_logs_total: number;
  activity_logs_returned: number;
}

export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  mobile_number: string | null;
  tier: UserTier;
  is_active: boolean;
  verification_status: VerificationStatus;
  created_at: string;
  balance: number | null;
  wallet_type: WalletType | null;
}

export interface UsersListResponseData {
  users: UserListItem[];
  next_cursor: string | null;
  has_next: boolean;
}

export interface AdminLog {
  id: string;
  method: string;
  url: string;
  status: number;
  duration: number;
  request_payload: unknown;
  response_payload: unknown;
  timestamp: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface AdminLogsResponseData {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  logs: AdminLog[];
}
