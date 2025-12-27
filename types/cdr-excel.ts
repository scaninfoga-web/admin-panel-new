// CDR Excel Data Types

export type CdrStatus = "pending" | "approved" | "rejected" | "success";

export interface StatusHistoryDetails {
  reason?: string;
  name?: string;
  s3_key?: string;
  filename?: string;
  [key: string]: string | undefined;
}

export interface StatusHistoryItem {
  action: string;
  details: StatusHistoryDetails;
  timestamp: string;
  user_email: string;
}

export interface CdrExcelRecord {
  id: number;
  name: string;
  mobile_number: string;
  filename: string | null;
  s3_key: string | null;
  status: CdrStatus;
  request_user_email: string;
  created_at: string;
  updated_at: string;
  investigator_officier_name: string;
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

export interface CdrExcelResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    records: CdrExcelRecord[];
    pagination: PaginationInfo;
  };
}

export interface CdrExcelFilterState {
  search: string;
  status: CdrStatus | "all";
}

export interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  bgColor?: string;
  dotColor?: string;
}
