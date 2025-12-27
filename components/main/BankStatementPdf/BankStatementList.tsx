"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { get, post, del, postWithProgress } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Plus,
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
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { CustomTable, type Column } from "@/components/custom/custom-table";
import Pagination from "@/components/custom/pagination";
import { BankStatementFilter } from "@/components/custom/bank-statement-filter";
import BankStatementNewRecord from "@/components/main/BankStatementPdf/BankStatementNewRecord";
import type {
  BankStatement,
  BankStatementsResponse,
  BankStatementFilterState,
  PaginationInfo,
  StatementStatus,
  StatusHistoryItem,
} from "@/types/bank-statement";
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
const DEFAULT_FILTERS: BankStatementFilterState = {
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
const getStatusBadge = (status: StatementStatus) => {
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

export default function BankStatementList() {
  // Data state
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Loading state
  const [loading, setLoading] = useState(false);

  // New Record Dialog state
  const [newRecordOpen, setNewRecordOpen] = useState(false);

  // History Dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);

  // Upload Dialog state (for approved statements)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadStatement, setUploadStatement] = useState<BankStatement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse["responseData"] | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [deleteUploadLoading, setDeleteUploadLoading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm Dialog state (for approve/reject/delete actions)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "delete" | null>(null);
  const [actionStatement, setActionStatement] = useState<BankStatement | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Filter state
  const [filters, setFilters] = useState<BankStatementFilterState>(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Signed URL loading state
  const [signedUrlLoading, setSignedUrlLoading] = useState<number | null>(null);

  // Handle opening PDF for success statements
  const handleOpenPdf = async (statement: BankStatement) => {
    if (statement.status !== "success" || !statement.s3_key) return;

    setSignedUrlLoading(statement.id);
    const toastId = toast.loading("Fetching PDF...");

    try {
      const signedUrl = await getSignedUrlS3(statement.s3_key);
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

  // Clickable cell wrapper for success statements
  const ClickableCell = ({
    children,
    record
  }: {
    children: React.ReactNode;
    record: BankStatement;
  }) => {
    const isClickable = record.status === "success" && record.s3_key;

    if (!isClickable) {
      return <>{children}</>;
    }

    return (
      <span
        onClick={() => handleOpenPdf(record)}
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
  const handleViewHistory = (statement: BankStatement) => {
    setSelectedStatement(statement);
    setHistoryDialogOpen(true);
  };

  const executeAction = async () => {
    if (!actionStatement || !confirmAction) return;

    setActionLoading(true);
    try {
      let endpoint = "";
      let payload: Record<string, unknown> = { id: actionStatement.id };

      switch (confirmAction) {
        case "approve":
          endpoint = "/api/mobile/set-pdf-bank-statement";
          payload = { ...payload, request_type: "approve" };
          break;
        case "reject":
          endpoint = "/api/mobile/set-pdf-bank-statement";
          payload = {
            ...payload,
            request_type: "reject",
            rejected_reason: rejectReason.trim(),
          };
          break;
        case "delete":
          endpoint = "/api/upload/s3/delete";
          payload = {
            ...payload,
            s3_key: actionStatement.s3_key,
            request_type: "delete",
          };
          break;
      }

      let res = null;
      if (confirmAction === "delete") {
        if (payload.s3_key) {
          res = await del(endpoint, payload);
        }
        endpoint = "/api/mobile/set-pdf-bank-statement";
      }
      res = await post(endpoint, payload);

      toast.success(
        res?.responseStatus?.message || `${confirmAction} successful`
      );

      setConfirmDialogOpen(false);
      setActionStatement(null);
      setConfirmAction(null);
      setRejectReason("");
      fetchStatements();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg =
        err?.response?.data?.responseStatus?.message ||
        `${confirmAction} failed`;
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };


  // Action handlers - open confirm dialog
  const handleApprove = (statement: BankStatement) => {
    setActionStatement(statement);
    setConfirmAction("approve");
    setConfirmDialogOpen(true);
  };

  const handleReject = (statement: BankStatement) => {
    setActionStatement(statement);
    setConfirmAction("reject");
    setConfirmDialogOpen(true);
  };

  const handleDelete = (statement: BankStatement) => {
    setActionStatement(statement);
    setConfirmAction("delete");
    setConfirmDialogOpen(true);
  };

  // Upload handlers for approved statements
  const handleOpenUploadDialog = (statement: BankStatement) => {
    setUploadStatement(statement);
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
    formData.append("folder", "bank-statements");

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
    if (!uploadedFile?.s3_key || !uploadStatement) {
      setUploadError("Please upload a file first.");
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await post("/api/mobile/set-pdf-bank-statement", {
        request_type: "success",
        id: uploadStatement.id,
        s3_key: uploadedFile.s3_key,
        mobile_number: uploadStatement.mobile_number,
        name: uploadStatement.name,
        account_number: uploadStatement.account_number,
        investigator_officier_name: uploadStatement.investigator_officier_name,
        bank_name: uploadStatement.bank_name,
        ifsc_code: uploadStatement.ifsc_code,
      });

      toast.success(res?.responseStatus?.message || "Statement uploaded successfully");
      resetUploadDialog();
      fetchStatements();
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
      const res = await del("/api/upload/s3/delete", {
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
    setUploadStatement(null);
    setFile(null);
    setProgress(0);
    setUploadedFile(null);
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Table columns
  const columns: Column<BankStatement>[] = [
    // {
    //   title: "ID",
    //   dataIndex: "id",
    //   width: 60,
    // },
    {
      title: "Requested User Email",
      dataIndex: "request_user_email",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span className="text-medium">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Acc Holder Name",
      dataIndex: "name",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span className="font-sm">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Mobile",
      dataIndex: "mobile_number",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span className="font-mono text-sm">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Account No.",
      dataIndex: "account_number",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span className="font-mono text-sm">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Bank",
      dataIndex: "bank_name",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span>{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "IFSC",
      dataIndex: "ifsc_code",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "Investigator",
      dataIndex: "investigator_officier_name",
      render: (val: string, record: BankStatement) => (
        <ClickableCell record={record}>
          <span>{val}</span>
        </ClickableCell>
      ),
    },
    {
      title: "History",
      dataIndex: "status_history",
      render: (_: StatusHistoryItem[], record: BankStatement) => (
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
      render: (status: StatementStatus, record: BankStatement) => (
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
                onClick={() => handleOpenUploadDialog(record)}
                className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Upload className="h-4 w-4" />
                Upload
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

  // Fetch statements
  const fetchStatements = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = buildQueryParams();
      const res = await get<BankStatementsResponse>(
        `/api/mobile/get-all-bank-statements?${queryParams}`
      );

      const records = res.responseData?.records || [];
      const paginationData = res.responseData?.pagination || null;

      setStatements(records);
      setPagination(paginationData);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { responseStatus?: { message?: string } } } })?.response
          ?.data?.responseStatus?.message || "Failed to fetch statements";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  // Fetch on mount and when params change
  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  // Handler functions
  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleStatusChange = (value: StatementStatus | "all") => {
    setFilters((prev) => ({ ...prev, status: value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleRefresh = () => {
    fetchStatements();
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
            <h1 className="text-2xl font-bold tracking-tight">Bank Statements</h1>
            <p className="text-muted-foreground text-sm">
              View and manage all bank statement requests
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
          <Button size="sm" onClick={() => setNewRecordOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <BankStatementFilter
        filters={filters}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onClearFilters={handleClearFilters}
        pagination={pagination}
      />

      {/* Results Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {pagination?.total_count || 0}
              </span>{" "}
              statements found
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
        <div className="overflow-auto custom-scrollbar max-h-[600px]">
          <CustomTable
            columns={columns}
            dataSource={statements}
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

      {/* New Record Dialog */}
      <BankStatementNewRecord
        open={newRecordOpen}
        onOpenChange={setNewRecordOpen}
        onSuccess={handleRefresh}
      />

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Statement History
            </DialogTitle>
            {selectedStatement && (
              <DialogDescription className="flex flex-col gap-1">
                <span>
                  <span className="font-medium text-foreground">{selectedStatement.name}</span>
                  {" - "}
                  {selectedStatement.bank_name}
                </span>
                <span className="text-xs">
                  Account: {selectedStatement.account_number} | Mobile: {selectedStatement.mobile_number}
                </span>
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Current Status */}
          {selectedStatement && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <Badge
                variant="outline"
                className={cn("gap-1", getStatusBadge(selectedStatement.status).className)}
              >
                {getStatusBadge(selectedStatement.status).label}
              </Badge>
            </div>
          )}

          {/* Timeline */}
          <div className="flex-1 overflow-auto custom-scrollbar pr-2">
            {selectedStatement?.status_history && selectedStatement.status_history.length > 0 ? (
              <div className="relative pl-8 py-4">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline Items */}
                <div className="space-y-6">
                  {selectedStatement.status_history.map((history, index) => {
                    const config = getStatusConfig(history.action);
                    const Icon = config.icon;
                    const isLast = index === selectedStatement.status_history.length - 1;

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
                              {history.action}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(history.timestamp)}
                            </span>
                          </div>

                          {/* User Email */}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{history.user_email}</span>
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
                              {history.details.bank_name && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Bank:</span>{" "}
                                  {String(history.details.bank_name)}
                                </div>
                              )}
                              {history.details.s3_key && (
                                <div>
                                  <span className="font-medium text-muted-foreground">File:</span>{" "}
                                  <span className="font-mono">{String(history.details.s3_key)}</span>
                                </div>
                              )}
                              {history.details.filename && (
                                <div>
                                  <span className="font-medium text-muted-foreground">Filename:</span>{" "}
                                  {String(history.details.filename)}
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

      {/* Upload Dialog for Approved Statements */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => !open && resetUploadDialog()}>
        <DialogContent className="w-[90vw] max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Upload Bank Statement
            </DialogTitle>
            {uploadStatement && (
              <DialogDescription className="flex flex-col gap-1">
                <span>
                  <span className="font-medium text-foreground">{uploadStatement.name}</span>
                  {" - "}
                  {uploadStatement.bank_name}
                </span>
                <span className="text-xs">
                  Account: {uploadStatement.account_number} | Mobile: {uploadStatement.mobile_number}
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
              {confirmAction} Statement
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "approve" &&
                "Are you sure you want to approve this statement request?"}
              {confirmAction === "reject" &&
                "Are you sure you want to reject this statement request?"}
              {confirmAction === "delete" &&
                "Are you sure you want to delete this statement? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {actionStatement && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-secondary/30 rounded-lg space-y-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{actionStatement.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{actionStatement.bank_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{actionStatement.account_number}</span>
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
                confirmAction === "delete" || confirmAction === "reject"
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
              {confirmAction === "delete" && "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
