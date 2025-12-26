// Bank Statement Types

export type StatementStatus = "pending" | "approved" | "rejected" | "success";

export interface StatusHistoryItem {
  action: string;
  details: Record<string, string | number | boolean>;
  timestamp: string;
  user_email: string;
}

export interface BankStatement {
  id: number;
  s3_key: string | null;
  name: string;
  account_number: string;
  ifsc_code: string | null;
  bank_name: string | null;
  mobile_number: string;
  investigator_officier_name: string;
  filename: string | null;
  status: StatementStatus;
  created_at: string;
  updated_at: string;
  status_history: StatusHistoryItem[];
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface BankStatementsResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    records: BankStatement[];
    pagination: PaginationInfo;
  };
}

export interface BankStatementFilterState {
  search: string;
  status: StatementStatus | "all";
}

export interface StatusConfig {
  label: string;
  icon: React.FC<{ className?: string }>;
  className: string;
  dotColor: string;
}
