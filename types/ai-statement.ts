// AI Statement (Annual Income) Types

export type AIStatementStatus = "pending" | "approved" | "rejected" | "success";

// File within an AI statement
export interface AIStatementFile {
  id: number;
  s3_key: string;
  filename: string;
  uploaded_by_email: string;
  from_date: string;
  to_date: string;
  created_at: string;
  updated_at: string;
}

// AI statement data record (with files)
export interface AIStatementData {
  id: number;
  pan_number: string;
  mobile_number: string;
  name: string;
  investigator_officier_name: string | null;
  files: AIStatementFile[];
  total_files: number;
  created_at: string;
  updated_at: string;
}

// Status history details for access requests
export interface AIStatusHistoryDetails {
  reason?: string;
  name?: string;
  investigator_officier_name?: string;
  from_date?: string;
  to_date?: string;
  previous_status?: string;
  grant_all?: boolean;
  granted_file_ids?: number[];
  [key: string]: string | boolean | number[] | undefined;
}

// Status history item for access requests
export interface AIStatusHistoryItem {
  action: string;
  details: AIStatusHistoryDetails;
  timestamp: string;
  by_user_email: string;
}

// Access request record
export interface AIStatementAccessRequest {
  id: number;
  pan_number: string;
  mobile_number: string;
  name: string;
  investigator_officier_name: string;
  from_date: string;
  to_date: string;
  request_user_email: string;
  status: AIStatementStatus;
  accessible_file_ids: number[];
  status_history: AIStatusHistoryItem[];
  created_at: string;
  updated_at: string;
}

// Pagination info
export interface AIStatementPaginationInfo {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Full API response
export interface AIStatementsResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    statements: AIStatementData[];
    total_statements: number;
    access_requests: AIStatementAccessRequest[];
    pagination: AIStatementPaginationInfo;
  };
}

// Filter state for access requests
export interface AIStatementFilterState {
  search: string;
  status: AIStatementStatus | "all";
}
