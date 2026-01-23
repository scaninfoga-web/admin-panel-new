"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { get, post, postWithProgress } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  RefreshCw,
  FileText,
  Clock,
  BadgeCheck,
  XCircle,
  CheckCircle,
  History,
  Trash2,
  Check,
  X,
  Package,
  CircleDot,
  Mail,
  Upload,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { CustomTable, type Column } from "@/components/custom/custom-table";
import Pagination from "@/components/custom/pagination";
import { AccessRequestFilter } from "@/components/custom/access-request-filter";
import type {
  AIStatementAccessRequest,
  AIStatementData,
  AIStatementFile,
  AIStatementsResponse,
  AIStatementFilterState,
  AIStatementPaginationInfo,
  AIStatementStatus,
  AIStatusHistoryItem,
} from "@/types/ai-statement";
import { motion, AnimatePresence } from "framer-motion";
import { getSignedUrlS3 } from "@/actions/s3-related";

// Upload response type
interface UploadResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    success: boolean;
    file_url: string;
    s3_key: string;
    file_size: number;
    content_type: string;
    original_filename: string;
    filename: string;
    is_signed: boolean;
  };
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// Default filter state
const DEFAULT_FILTERS: AIStatementFilterState = {
  search: "",
  status: "all",
};

// Status config for history timeline
type StatusConfigType = {
  icon: typeof Clock;
  color: string;
  bgColor: string;
};

const STATUS_CONFIGS: Record<string, StatusConfigType> = {
  requested: {
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
  },
  re_requested: {
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
  },
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500",
  },
  approved: {
    icon: BadgeCheck,
    color: "text-blue-500",
    bgColor: "bg-blue-500",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500",
  },
};

const DEFAULT_STATUS_CONFIG: StatusConfigType = {
  icon: Clock,
  color: "text-gray-500",
  bgColor: "bg-gray-500",
};

const getStatusConfig = (action: string): StatusConfigType => {
  return STATUS_CONFIGS[action] ?? DEFAULT_STATUS_CONFIG;
};

// Status badge for current status
const getStatusBadge = (status: AIStatementStatus) => {
  const config = {
    pending: {
      label: "Pending",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    },
    approved: {
      label: "Approved",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    rejected: {
      label: "Rejected",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
    success: {
      label: "Success",
      className: "bg-green-500/10 text-green-600 border-green-500/20",
    },
  };
  return config[status];
};

export default function AnnualIncomeList() {
  // Data state
  const [accessRequests, setAccessRequests] = useState<AIStatementAccessRequest[]>([]);
  const [statementData, setStatementData] = useState<AIStatementData[]>([]);
  const [pagination, setPagination] = useState<AIStatementPaginationInfo | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // History Dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AIStatementAccessRequest | null>(null);

  // Upload Dialog state (for uploading new files)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadRequest, setUploadRequest] = useState<AIStatementAccessRequest | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse["responseData"] | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [deleteUploadLoading, setDeleteUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grant Files Dialog state (for approved requests with existing files)
  const [grantFilesDialogOpen, setGrantFilesDialogOpen] = useState(false);
  const [grantRequest, setGrantRequest] = useState<AIStatementAccessRequest | null>(null);
  const [availableFiles, setAvailableFiles] = useState<AIStatementFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [grantAllFiles, setGrantAllFiles] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);

  // Form fields for upload
  const [name, setName] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [investigatorName, setInvestigatorName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Confirm Dialog state (for approve/reject/delete actions)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "delete_request" | null>(null);
  const [actionRequest, setActionRequest] = useState<AIStatementAccessRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filter state
  const [filters, setFilters] = useState<AIStatementFilterState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Signed URL loading state
  const [signedUrlLoading, setSignedUrlLoading] = useState<number | null>(null);

  // Handle opening file for success requests
  const handleOpenFile = async (request: AIStatementAccessRequest) => {
    if (request.status !== "success" || request.accessible_file_ids.length === 0) return;

    // Get the first accessible file's s3_key from statementData
    const fileId = request.accessible_file_ids[0];
    const statement = statementData.find(d =>
      d.pan_number === request.pan_number && d.mobile_number === request.mobile_number
    );
    const fileObj = statement?.files.find(f => f.id === fileId);

    if (!fileObj?.s3_key) return;

    setSignedUrlLoading(request.id);
    const toastId = toast.loading("Fetching PDF...");

    try {
      const signedUrl = await getSignedUrlS3(fileObj.s3_key);
      if (signedUrl) {
        toast.success("Opening PDF...", { id: toastId, duration: 300 });
        window.open(signedUrl, "_blank");
      } else {
        toast.error("Failed to get signed URL", { id: toastId, duration: 300 });
      }
    } catch {
      toast.error("Failed to fetch PDF", { id: toastId, duration: 300 });
    } finally {
      setSignedUrlLoading(null);
    }
  };

  // Clickable cell wrapper for success requests
  const ClickableCell = ({
    children,
    record
  }: {
    children: React.ReactNode;
    record: AIStatementAccessRequest;
  }) => {
    const isClickable = record.status === "success" && record.accessible_file_ids.length > 0;

    if (!isClickable) {
      return <>{children}</>;
    }

    return (
      <span
        onClick={() => handleOpenFile(record)}
        className={cn(
          "hover:underline hover:text-primary cursor-pointer transition-all",
          signedUrlLoading === record.id && "opacity-50 pointer-events-none"
        )}
      >
        {children}
      </span>
    );
  };

  // View History handler
  const handleViewHistory = (request: AIStatementAccessRequest) => {
    setSelectedRequest(request);
    setHistoryDialogOpen(true);
  };

  const executeAction = async () => {
    if (!actionRequest || !confirmAction) return;

    setActionLoading(true);
    try {
      const payload: Record<string, unknown> = {};

      switch (confirmAction) {
        case "approve":
          payload.request_type = "approve";
          payload.request_id = actionRequest.id;
          break;
        case "reject":
          payload.request_type = "reject";
          payload.request_id = actionRequest.id;
          payload.rejected_reason = rejectReason.trim();
          break;
        case "delete_request":
          payload.request_type = "delete_request";
          payload.request_id = actionRequest.id;
          break;
      }

      const res = await post("/api/mobile/set-ais-statement", payload);

      toast.success(
        res?.responseStatus?.message || `${confirmAction.replace("_", " ")} successful`
      );

      setConfirmDialogOpen(false);
      setActionRequest(null);
      setConfirmAction(null);
      setRejectReason("");
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg =
        err?.response?.data?.responseStatus?.message ||
        `${confirmAction.replace("_", " ")} failed`;
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Action handlers - open confirm dialog
  const handleApprove = (request: AIStatementAccessRequest) => {
    setActionRequest(request);
    setConfirmAction("approve");
    setConfirmDialogOpen(true);
  };

  const handleReject = (request: AIStatementAccessRequest) => {
    setActionRequest(request);
    setConfirmAction("reject");
    setConfirmDialogOpen(true);
  };

  const handleDelete = (request: AIStatementAccessRequest) => {
    setActionRequest(request);
    setConfirmAction("delete_request");
    setConfirmDialogOpen(true);
  };

  // Grant Files handlers for approved/success requests
  const handleOpenGrantFilesDialog = (request: AIStatementAccessRequest) => {
    // Find files for this PAN and mobile
    const statement = statementData.find(d =>
      d.pan_number === request.pan_number && d.mobile_number === request.mobile_number
    );
    const files = statement?.files || [];

    if (files.length === 0) {
      // No existing files, open upload dialog instead
      handleOpenUploadDialog(request);
      return;
    }

    setGrantRequest(request);
    setAvailableFiles(files);

    // Pre-select currently accessible files if status is success
    if (request.status === "success" && request.accessible_file_ids.length > 0) {
      setSelectedFileIds(request.accessible_file_ids);
      setGrantAllFiles(request.accessible_file_ids.length === files.length);
    } else {
      setSelectedFileIds([]);
      setGrantAllFiles(false);
    }

    setGrantFilesDialogOpen(true);
  };

  const handleToggleFile = (fileId: number) => {
    setSelectedFileIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleToggleGrantAll = () => {
    if (grantAllFiles) {
      setGrantAllFiles(false);
      setSelectedFileIds([]);
    } else {
      setGrantAllFiles(true);
      setSelectedFileIds(availableFiles.map(f => f.id));
    }
  };

  const handleGrantFiles = async () => {
    if (!grantRequest || (selectedFileIds.length === 0 && !grantAllFiles)) {
      toast.error("Please select at least one file to grant access");
      return;
    }

    setGrantLoading(true);
    try {
      const res = await post("/api/mobile/set-ais-statement", {
        request_type: "grant_access",
        request_id: grantRequest.id,
        grant_all: grantAllFiles,
        file_ids: grantAllFiles ? availableFiles.map(f => f.id) : selectedFileIds,
      });

      toast.success(res?.responseStatus?.message || "Access granted successfully");
      resetGrantFilesDialog();
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg = err?.response?.data?.responseStatus?.message || "Failed to grant access";
      toast.error(errMsg);
    } finally {
      setGrantLoading(false);
    }
  };

  const resetGrantFilesDialog = () => {
    setGrantFilesDialogOpen(false);
    setGrantRequest(null);
    setAvailableFiles([]);
    setSelectedFileIds([]);
    setGrantAllFiles(false);
  };

  // Upload handlers for new file upload
  const handleOpenUploadDialog = (request: AIStatementAccessRequest) => {
    setUploadRequest(request);
    setName(request.name);
    setPanNumber(request.pan_number);
    setMobileNumber(request.mobile_number);
    setInvestigatorName(request.investigator_officier_name || "");
    setUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.name.match(/\.pdf$/i)) {
        setFile(selectedFile);
        setUploadError("");
      } else {
        setUploadError("Please select a valid PDF file (.pdf)");
        setFile(null);
      }
    }
  };

  const handleUploadToS3 = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "ai-statements");

    try {
      const response = await postWithProgress<UploadResponse>(
        "/api/upload/s3/upload",
        formData,
        setProgress
      );
      setUploadedFile(response.responseData);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setUploadError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitUpload = async () => {
    if (!uploadedFile?.s3_key || !uploadRequest) {
      setUploadError("Please upload a file first.");
      return;
    }

    if (!name.trim()) {
      setUploadError("Name is required.");
      return;
    }

    if (!panNumber.trim()) {
      setUploadError("PAN number is required.");
      return;
    }

    if (!mobileNumber.trim()) {
      setUploadError("Mobile number is required.");
      return;
    }

    if (!fromDate || !toDate) {
      setUploadError("From date and To date are required.");
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await post("/api/mobile/set-ais-statement", {
        request_type: "upload",
        s3_key: uploadedFile.s3_key,
        pan_number: panNumber.trim(),
        mobile_number: mobileNumber.trim(),
        name: name.trim(),
        investigator_officier_name: investigatorName.trim() || null,
        from_date: fromDate,
        to_date: toDate,
      });

      toast.success(res?.responseStatus?.message || "File uploaded successfully");

      // Now grant access to this file for the user
      const newFileId = res?.responseData?.new_file?.id;
      if (newFileId && uploadRequest) {
        await post("/api/mobile/set-ais-statement", {
          request_type: "grant_access",
          request_id: uploadRequest.id,
          file_ids: [newFileId],
          grant_all: false,
        });
      }

      resetUploadDialog();
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg = err?.response?.data?.responseStatus?.message || "Submission failed";
      toast.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUploadedFile = async () => {
    if (!uploadedFile?.s3_key) {
      toast.error("No file to delete");
      return;
    }

    setDeleteUploadLoading(true);
    try {
      const res = await post("/api/upload/s3/delete", {
        s3_key: uploadedFile.s3_key,
      });
      toast.success(res?.responseStatus?.message || "File deleted successfully");
      setUploadedFile(null);
      setFile(null);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg = err?.response?.data?.responseStatus?.message || "Delete failed";
      toast.error(errMsg);
    } finally {
      setDeleteUploadLoading(false);
    }
  };

  const resetUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadRequest(null);
    setFile(null);
    setProgress(0);
    setUploadedFile(null);
    setUploadError("");
    setName("");
    setPanNumber("");
    setMobileNumber("");
    setInvestigatorName("");
    setFromDate("");
    setToDate("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Table columns
  const columns: Column<AIStatementAccessRequest>[] = [
    {
      title: "Requested User Email",
      dataIndex: "request_user_email",
      render: (val: string, record: AIStatementAccessRequest) => (
        <ClickableCell record={record}>
          <span className="text-medium">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      render: (val: string, record: AIStatementAccessRequest) => (
        <ClickableCell record={record}>
          <span className="font-sm">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "PAN Number",
      dataIndex: "pan_number",
      render: (val: string, record: AIStatementAccessRequest) => (
        <ClickableCell record={record}>
          <span className="font-mono text-sm flex items-center gap-1">
            <CreditCard className="h-3 w-3 text-muted-foreground" />
            {val}
          </span>
        </ClickableCell>
      ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile_number",
      render: (val: string, record: AIStatementAccessRequest) => (
        <ClickableCell record={record}>
          <span className="font-mono text-sm">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Investigator",
      dataIndex: "investigator_officier_name",
      render: (val: string, record: AIStatementAccessRequest) => (
        <ClickableCell record={record}>
          <span>{val || "-"}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Requested Period",
      dataIndex: "from_date",
      render: (_: string, record: AIStatementAccessRequest) => (
        <ClickableCell record={record}>
          <div className="text-xs">
            <div className="font-medium">{record.from_date || "-"}</div>
            <div className="text-muted-foreground">to {record.to_date || "-"}</div>
          </div>
        </ClickableCell>
      ),
    },
    {
      title: "Files Access",
      dataIndex: "accessible_file_ids",
      render: (val: number[], record: AIStatementAccessRequest) => {
        const statement = statementData.find(d =>
          d.pan_number === record.pan_number && d.mobile_number === record.mobile_number
        );
        const totalFiles = statement?.total_files || 0;
        return (
          <span className="text-sm">
            {val.length} / {totalFiles} files
          </span>
        );
      },
    },
    {
      title: "History",
      dataIndex: "status_history",
      render: (_: AIStatusHistoryItem[], record: AIStatementAccessRequest) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewHistory(record)}
          className="gap-1"
        >
          <History className="h-4 w-4" />
          View
        </Button>
      ),
    },
    {
      title: "Action",
      dataIndex: "status",
      render: (status: AIStatementStatus, record: AIStatementAccessRequest) => (
        <div className="flex items-center gap-2">
          {status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApprove(record)}
                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(record)}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(record)}
                className="gap-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {status === "approved" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenGrantFilesDialog(record)}
                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <CheckCircle className="h-4 w-4" />
                Grant Access
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(record)}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(record)}
                className="gap-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {status === "success" && (
            <>
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                <CheckCircle className="h-3 w-3" />
                Success
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenGrantFilesDialog(record)}
                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <CheckCircle className="h-4 w-4" />
                Modify Access
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(record)}
                className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(record)}
                className="gap-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {status === "rejected" && (
            <>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                <XCircle className="h-3 w-3" />
                Rejected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApprove(record)}
                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(record)}
                className="gap-1 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.status]);

  // Build query params
  const buildQueryParams = useCallback((): string => {
    const params = new URLSearchParams();
    params.append("page", currentPage.toString());
    params.append("page_size", pageSize.toString());

    if (filters.status !== "all") {
      params.append("status", filters.status);
    }

    if (debouncedSearch) {
      params.append("search", debouncedSearch);
    }

    return params.toString();
  }, [currentPage, pageSize, filters.status, debouncedSearch]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = buildQueryParams();
      const res = await get<AIStatementsResponse>(
        `/api/mobile/get-all-ais-statements?${queryParams}`
      );

      const statements = res.responseData?.statements || [];
      const requests = res.responseData?.access_requests || [];
      const paginationData = res.responseData?.pagination || null;

      setStatementData(statements);
      setAccessRequests(requests);
      setPagination(paginationData);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { responseStatus?: { message?: string } } } })?.response
          ?.data?.responseStatus?.message || "Failed to fetch data";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handler functions
  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: AIStatementStatus | "all") => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleRefresh = () => {
    fetchData();
    toast.success("Refreshed");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const hasActiveFilters = filters.search || filters.status !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Annual Income Statements</h1>
            <p className="text-muted-foreground text-sm">
              View and manage AI statement access requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AccessRequestFilter
        filters={filters}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClearFilters={handleClearFilters}
        pagination={pagination}
        searchPlaceholder="Search by name, PAN, mobile, investigator..."
        resultLabel="access requests"
      />

      {/* Results Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {pagination?.total_count || 0}
              </span>{" "}
              access requests found
            </div>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                Filters active
              </Badge>
            )}
          </div>

          {pagination && pagination.total_pages > 0 && (
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar max-h-[600px]">
          <CustomTable
            columns={columns}
            dataSource={accessRequests}
            loading={loading}
            scroll={{ x: true }}
          />
        </div>

        {pagination && pagination.total_count > 0 && (
          <div className="p-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalRecords={pagination.total_count}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        )}
      </Card>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Access Request History
            </DialogTitle>
            {selectedRequest && (
              <DialogDescription className="flex flex-col gap-1">
                <span>
                  <span className="font-medium text-foreground">{selectedRequest.name}</span>
                  {" - "}
                  PAN: {selectedRequest.pan_number}
                </span>
                <span className="text-xs">
                  Mobile: {selectedRequest.mobile_number}
                </span>
                <span className="text-xs">
                  Period: {selectedRequest.from_date} to {selectedRequest.to_date}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Current Status */}
          {selectedRequest && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <Badge
                variant="outline"
                className={cn("gap-1", getStatusBadge(selectedRequest.status).className)}
              >
                {getStatusBadge(selectedRequest.status).label}
              </Badge>
            </div>
          )}

          {/* Timeline */}
          <div className="flex-1 overflow-auto custom-scrollbar pr-2">
            {selectedRequest?.status_history && selectedRequest.status_history.length > 0 ? (
              <div className="relative pl-8 py-4">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline Items */}
                <div className="space-y-6">
                  {selectedRequest.status_history.map((history, index) => {
                    const config = getStatusConfig(history.action);
                    const Icon = config.icon;
                    const isLast = index === selectedRequest.status_history.length - 1;

                    return (
                      <div key={index} className="relative">
                        {/* Timeline Dot */}
                        <div
                          className={cn(
                            "absolute -left-8 w-8 h-8 rounded-full flex items-center justify-center border-4 border-background",
                            config.bgColor
                          )}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>

                        {/* Content */}
                        <div
                          className={cn(
                            "p-4 rounded-lg border",
                            isLast ? "bg-primary/5 border-primary/20" : "bg-card"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={cn(
                                "font-semibold capitalize text-sm",
                                config.color
                              )}
                            >
                              {history.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(history.timestamp)}
                            </span>
                          </div>

                          {/* User Email */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{history.by_user_email}</span>
                          </div>

                          {/* Details */}
                          {history.details && Object.keys(history.details).length > 0 && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                              {history.details.reason && (
                                <div className="text-red-500">
                                  <span className="font-medium">Reason:</span> {String(history.details.reason)}
                                </div>
                              )}
                              {history.details.name && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Name:</span>{" "}
                                  {String(history.details.name)}
                                </div>
                              )}
                              {history.details.investigator_officier_name && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Investigator:</span>{" "}
                                  {String(history.details.investigator_officier_name)}
                                </div>
                              )}
                              {history.details.previous_status && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Previous Status:</span>{" "}
                                  {String(history.details.previous_status)}
                                </div>
                              )}
                              {history.details.grant_all !== undefined && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Grant All:</span>{" "}
                                  {history.details.grant_all ? "Yes" : "No"}
                                </div>
                              )}
                              {history.details.granted_file_ids && history.details.granted_file_ids.length > 0 && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Granted File IDs:</span>{" "}
                                  {history.details.granted_file_ids.join(", ")}
                                </div>
                              )}
                              {(history.details.from_date || history.details.to_date) && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Requested Period:</span>{" "}
                                  {history.details.from_date} to {history.details.to_date}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CircleDot className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">No history available</p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setHistoryDialogOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grant Files Dialog */}
      <Dialog open={grantFilesDialogOpen} onOpenChange={(open) => !open && resetGrantFilesDialog()}>
        <DialogContent className="w-[90vw] max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Grant File Access
            </DialogTitle>
            {grantRequest && (
              <DialogDescription className="flex flex-col gap-1">
                <span>
                  <span className="font-medium text-foreground">{grantRequest.name}</span>
                  {" - "}
                  PAN: {grantRequest.pan_number}
                </span>
                <span className="text-xs">
                  Select files to grant access to user: {grantRequest.request_user_email}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Grant All Checkbox */}
            <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="grantAll"
                checked={grantAllFiles}
                onCheckedChange={handleToggleGrantAll}
              />
              <Label htmlFor="grantAll" className="cursor-pointer font-medium">
                Grant access to all files ({availableFiles.length})
              </Label>
            </div>

            {/* File List */}
            <div className="space-y-2">
              <Label>Available Files:</Label>
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {availableFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      id={`file-${file.id}`}
                      checked={selectedFileIds.includes(file.id)}
                      onCheckedChange={() => handleToggleFile(file.id)}
                      disabled={grantAllFiles}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.filename}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {file.from_date} to {file.to_date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload New File Option */}
            <Button
              variant="outline"
              onClick={() => {
                resetGrantFilesDialog();
                if (grantRequest) handleOpenUploadDialog(grantRequest);
              }}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New File Instead
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetGrantFilesDialog}
              disabled={grantLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantFiles}
              disabled={grantLoading || (selectedFileIds.length === 0 && !grantAllFiles)}
              loading={grantLoading}
            >
              Grant Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => !open && resetUploadDialog()}>
        <DialogContent className="w-[90vw] max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload AI Statement PDF
            </DialogTitle>
            {uploadRequest && (
              <DialogDescription className="flex flex-col gap-1">
                <span>
                  <span className="font-medium text-foreground">{uploadRequest.name}</span>
                  {" - "}
                  PAN: {uploadRequest.pan_number}
                </span>
                <span className="text-xs">
                  Requested by: {uploadRequest.request_user_email}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {uploadedFile ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* File Details */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    File uploaded successfully!
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium truncate">
                        {uploadedFile.original_filename}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Size: {formatFileSize(uploadedFile.file_size)}
                    </div>
                    <a
                      href={uploadedFile.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View File
                    </a>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="name"
                      placeholder="Enter name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">PAN Number <span className="text-destructive">*</span></Label>
                    <Input
                      id="panNumber"
                      placeholder="Enter PAN number"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mobileNumber">Mobile Number <span className="text-destructive">*</span></Label>
                    <Input
                      id="mobileNumber"
                      placeholder="Enter mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investigatorName">Investigator Name</Label>
                    <Input
                      id="investigatorName"
                      placeholder="Enter investigator name"
                      value={investigatorName}
                      onChange={(e) => setInvestigatorName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="fromDate">From Date <span className="text-destructive">*</span></Label>
                      <Input
                        id="fromDate"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="toDate">To Date <span className="text-destructive">*</span></Label>
                      <Input
                        id="toDate"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {uploadError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-destructive text-sm flex items-center gap-1.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      {uploadError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitUpload}
                  disabled={submitLoading}
                  loading={submitLoading}
                  className="w-full"
                >
                  Submit
                </Button>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFile(null);
                      setFile(null);
                      setProgress(0);
                    }}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Upload Different
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteUploadedFile}
                    disabled={deleteUploadLoading}
                    loading={deleteUploadLoading}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete File
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {/* File Input */}
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="truncate max-w-[250px]">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">Click to select PDF file</p>
                      <p className="text-xs text-muted-foreground mt-1">.pdf supported</p>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                <AnimatePresence>
                  {uploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                <AnimatePresence>
                  {uploadError && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-destructive text-sm flex items-center gap-1.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      {uploadError}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Upload Button */}
                <Button
                  onClick={handleUploadToS3}
                  disabled={!file || uploading}
                  loading={uploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to S3
                </Button>
              </motion.div>
            )}
          </div>

          {/* Cancel Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={resetUploadDialog}
              className="w-full"
              disabled={submitLoading || uploading}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {confirmAction?.replace("_", " ")} Access Request
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "approve" &&
                "Are you sure you want to approve this access request?"}
              {confirmAction === "reject" &&
                "Are you sure you want to reject this access request?"}
              {confirmAction === "delete_request" &&
                "Are you sure you want to delete this request? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {actionRequest && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-secondary/30 rounded-lg space-y-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{actionRequest.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>PAN: {actionRequest.pan_number}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Investigator: {actionRequest.investigator_officier_name}</span>
              </div>
            </motion.div>
          )}

          {/* Reject Reason Input */}
          {confirmAction === "reject" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="rejectReason">
                Reason for Rejection <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rejectReason"
                placeholder="Enter reason for rejection"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </motion.div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setRejectReason("");
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmAction === "delete_request" || confirmAction === "reject"
                  ? "destructive"
                  : "default"
              }
              onClick={executeAction}
              disabled={
                actionLoading ||
                (confirmAction === "reject" && !rejectReason.trim())
              }
              loading={actionLoading}
            >
              {confirmAction === "approve" && "Approve"}
              {confirmAction === "reject" && "Reject"}
              {confirmAction === "delete_request" && "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
