// CDR Excel Data Types

export type CdrStatus = "pending" | "approved" | "rejected" | "success";

// File within a CDR data record
export interface CdrFile {
  id: number;
  s3_key: string;
  filename: string;
  uploaded_by_email: string;
  from_date: string;
  to_date: string;
  created_at: string;
  updated_at: string;
}

// CDR data record (holder with files)
export interface CdrDataRecord {
  id: number;
  holder_name: string;
  mobile_number: string;
  files: CdrFile[];
  total_files: number;
  created_at: string;
  updated_at: string;
}

// Status history details for access requests
export interface StatusHistoryDetails {
  reason?: string;
  holder_name?: string;
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
export interface CdrAccessRequest {
  id: number;
  mobile_number: string;
  holder_name: string;
  investigator_officier_name: string;
  request_user_email: string;
  status: CdrStatus;
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
export interface CdrExcelResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    cdr_data: CdrDataRecord[];
    total_cdr_data: number;
    access_requests: CdrAccessRequest[];
    pagination: PaginationInfo;
  };
}

// Filter state for access requests
export interface CdrExcelFilterState {
  search: string;
  status: CdrStatus | "all";
}

// Status config for UI display
export interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  bgColor?: string;
  dotColor?: string;
}
