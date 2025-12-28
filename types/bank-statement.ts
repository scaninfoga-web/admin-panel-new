// Bank Statement Types

export type StatementStatus = "pending" | "approved" | "rejected" | "success";

// File within a bank statement
export interface BankStatementFile {
  id: number;
  s3_key: string;
  filename: string;
  uploaded_by_email: string;
  from_date: string;
  to_date: string;
  created_at: string;
  updated_at: string;
}

// Bank statement data record (account with files)
export interface BankStatementData {
  id: number;
  mobile_number: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string | null;
  bank_name: string | null;
  files: BankStatementFile[];
  total_files: number;
  created_at: string;
  updated_at: string;
}

// Status history details for access requests
export interface StatusHistoryDetails {
  reason?: string;
  holder_name?: string;
  account_holder_name?: string;
  investigator_officier_name?: string;
  previous_status?: string;
  grant_all?: boolean;
  granted_file_ids?: number[];
  [key: string]: string | boolean | number[] | undefined;
}

// Status history item for access requests
export interface StatusHistoryItem {
  action: string;
  details: StatusHistoryDetails;
  timestamp: string;
  by_user_email: string;
}

// Access request record
export interface BankStatementAccessRequest {
  id: number;
  mobile_number: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string | null;
  bank_name: string | null;
  investigator_officier_name: string;
  request_user_email: string;
  status: StatementStatus;
  accessible_file_ids: number[];
  status_history: StatusHistoryItem[];
  created_at: string;
  updated_at: string;
}

// Pagination info
export interface PaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Full API response
export interface BankStatementsResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    statements: BankStatementData[];
    total_statements: number;
    access_requests: BankStatementAccessRequest[];
    pagination: PaginationInfo;
  };
}

// Filter state for access requests
export interface BankStatementFilterState {
  search: string;
  status: StatementStatus | "all";
}

// Status config for UI display
export interface StatusConfig {
  label: string;
  icon: React.FC<{ className?: string }>;
  className: string;
  dotColor: string;
}
