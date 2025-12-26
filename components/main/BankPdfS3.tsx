"use client";

import React, { useState, useRef } from "react";
import { del, post, postWithProgress } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  ExternalLink,
  RotateCcw,
  Trash2,
  User,
  CreditCard,
  Calendar,
  Building2,
  Hash,
  UserCheck,
  Pencil,
  Check,
  XCircle,
  Clock,
  BadgeCheck,
  AlertCircle,
  Mail,
  Key,
  FileCheck,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  MessageSquareWarning,
} from "lucide-react";
import { isValidIndianMobileNumber } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Types
type StatementStatus = "pending" | "approved" | "rejected" | "success";

interface Statement {
  id: number;
  approved_user_email: string | null;
  rejected_user_email: string | null;
  success_user_email: string | null;
  request_user_email: string | null;
  s3_key: string | null;
  name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  investigator_officier_name: string;
  mobile_number: string;
  filename: string | null;
  encrypted_url: string | null;
  request_at: string | null;
  approved_at: string | null;
  success_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  status: StatementStatus;
}

interface StatementsResponse {
  responseStatus: {
    status: boolean;
    message: string;
  };
  responseData: {
    mobile_number: string;
    total_count: number;
    statements: Statement[];
  };
}

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

// Utility functions
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusConfig = (status: StatementStatus) => {
  const configs = {
    pending: {
      label: "Pending",
      icon: Clock,
      className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
      dotColor: "bg-yellow-500",
    },
    approved: {
      label: "Approved",
      icon: BadgeCheck,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      dotColor: "bg-blue-500",
    },
    rejected: {
      label: "Rejected",
      icon: XCircle,
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      dotColor: "bg-red-500",
    },
    success: {
      label: "Success",
      icon: CheckCircle,
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      dotColor: "bg-green-500",
    },
  };
  return configs[status];
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const tileVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Statement Tile Component
interface StatementTileProps {
  statement: Statement;
  onApprove: (statement: Statement) => void;
  onReject: (statement: Statement) => void;
  onDelete: (statement: Statement) => void;
  onEdit: (statement: Statement) => void;
  isLoading: boolean;
}

const StatementTile: React.FC<StatementTileProps> = ({
  statement,
  onApprove,
  onReject,
  onDelete,
  onEdit,
  isLoading,
}) => {
  const statusConfig = getStatusConfig(statement.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      variants={tileVariants}
      layout
      className="group relative p-4 rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-md transition-all duration-300"
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
            statusConfig.className
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", statusConfig.dotColor)} />
          {statusConfig.label}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 pr-24">
        {/* Name & Bank */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Account Holder</span>
              <p className="font-semibold text-foreground truncate">{statement.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Bank Name</span>
              <p className="text-sm text-foreground truncate">{statement.bank_name}</p>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Account No.</span>
              <p className="text-foreground truncate">{statement.account_number}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">IFSC Code</span>
              <p className="text-foreground truncate">{statement.ifsc_code}</p>
            </div>
          </div>
        </div>

        {/* Investigator */}
        <div className="flex items-start gap-2">
          <UserCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground">Investigator Officer</span>
            <p className="text-sm text-foreground truncate">{statement.investigator_officier_name}</p>
          </div>
        </div>

        {/* File Details */}
        {(statement.filename || statement.s3_key) && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {statement.filename && (
              <div className="flex items-start gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground">Filename</span>
                  <p className="text-foreground truncate">{statement.filename}</p>
                </div>
              </div>
            )}
            {statement.s3_key && (
              <div className="flex items-start gap-2">
                <Key className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-muted-foreground">S3 Key</span>
                  <p className="text-foreground truncate text-xs">{statement.s3_key}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {statement.request_user_email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Requested By</span>
                <p className="text-foreground truncate text-xs">{statement.request_user_email}</p>
              </div>
            </div>
          )}
          {statement.approved_user_email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Approved By</span>
                <p className="text-foreground truncate text-xs">{statement.approved_user_email}</p>
              </div>
            </div>
          )}
          {statement.rejected_user_email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Rejected By</span>
                <p className="text-foreground truncate text-xs">{statement.rejected_user_email}</p>
              </div>
            </div>
          )}
          {statement.success_user_email && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Completed By</span>
                <p className="text-foreground truncate text-xs">{statement.success_user_email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {statement.request_at && (
            <div className="flex items-start gap-2">
              <CalendarClock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Requested At</span>
                <p className="text-foreground text-xs">{formatDate(statement.request_at)}</p>
              </div>
            </div>
          )}
          {statement.approved_at && (
            <div className="flex items-start gap-2">
              <CalendarCheck className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Approved At</span>
                <p className="text-foreground text-xs">{formatDate(statement.approved_at)}</p>
              </div>
            </div>
          )}
          {statement.rejected_at && (
            <div className="flex items-start gap-2">
              <CalendarX className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Rejected At</span>
                <p className="text-foreground text-xs">{formatDate(statement.rejected_at)}</p>
              </div>
            </div>
          )}
          {statement.success_at && (
            <div className="flex items-start gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-xs text-muted-foreground">Completed At</span>
                <p className="text-foreground text-xs">{formatDate(statement.success_at)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Rejected Reason */}
        {statement.rejected_reason && (
          <div className="flex items-start gap-2">
            <MessageSquareWarning className="h-4 w-4 text-red-400 dark:text-red-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-red-400 dark:text-red-500">Rejection Reason</span>
              <p className="text-sm text-red-600 dark:text-red-400">{statement.rejected_reason}</p>
            </div>
          </div>
        )}

        {/* File Link (if success) */}
        {statement.status === "success" && statement.encrypted_url && (
          <a
            href={statement.encrypted_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            View Statement
          </a>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
        {statement.status === "pending" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
              onClick={() => onApprove(statement)}
              disabled={isLoading}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
              onClick={() => onReject(statement)}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </>
        )}

        {statement.status === "approved" && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8"
            onClick={() => onEdit(statement)}
            disabled={isLoading}
          >
            <Pencil className="h-4 w-4" />
            Edit / Upload
          </Button>
        )}

        {(statement.status === "success" || statement.status === "rejected") && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(statement)}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}

        {statement.status !== "success" && statement.status !== "rejected" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(statement)}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// Main Component
export default function BankPdfS3() {
  // Mobile input state
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [fixedMobileNumber, setFixedMobileNumber] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [fetchingStatements, setFetchingStatements] = useState<boolean>(false);
  const [statements, setStatements] = useState<Statement[]>([]);

  // Action states
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "delete" | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse["responseData"] | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [deleteUploadLoading, setDeleteUploadLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Record state
  const [newRecordUploadDialogOpen, setNewRecordUploadDialogOpen] = useState<boolean>(false);
  const [newRecordFormDialogOpen, setNewRecordFormDialogOpen] = useState<boolean>(false);
  const [newRecordFile, setNewRecordFile] = useState<File | null>(null);
  const [newRecordProgress, setNewRecordProgress] = useState<number>(0);
  const [newRecordUploading, setNewRecordUploading] = useState<boolean>(false);
  const [newRecordUploadedFile, setNewRecordUploadedFile] = useState<UploadResponse["responseData"] | null>(null);
  const [newRecordSubmitLoading, setNewRecordSubmitLoading] = useState<boolean>(false);
  const [newRecordDeleteLoading, setNewRecordDeleteLoading] = useState<boolean>(false);
  const newRecordFileInputRef = useRef<HTMLInputElement>(null);

  // New Record form inputs
  const [newRecordName, setNewRecordName] = useState<string>("");
  const [newRecordAccountNumber, setNewRecordAccountNumber] = useState<string>("");
  const [newRecordIfscCode, setNewRecordIfscCode] = useState<string>("");
  const [newRecordBankName, setNewRecordBankName] = useState<string>("");
  const [newRecordInvestigatorName, setNewRecordInvestigatorName] = useState<string>("");

  const handleProceed = async () => {
    if (!mobileNumber) {
      setErrorMessage("Please enter a mobile number.");
      return;
    }

    const { result, fixedNumber } = isValidIndianMobileNumber(mobileNumber);
    if (!result) {
      setErrorMessage("Please enter a valid Indian mobile number.");
      return;
    }

    setErrorMessage("");
    setFixedMobileNumber(fixedNumber);
    setFetchingStatements(true);
    setDialogOpen(true);

    try {
      const res = await post<StatementsResponse>("/api/mobile/get-pdf-bank-statement", {
        mobile_number: fixedNumber,
      });
      setStatements(res.responseData?.statements || []);
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Failed to fetch statements";
      toast.error(errMsg);
      setDialogOpen(false);
    } finally {
      setFetchingStatements(false);
    }
  };

  const refreshStatements = async () => {
    if (!fixedMobileNumber) return;

    setFetchingStatements(true);
    try {
      const res = await post<StatementsResponse>("/api/mobile/get-pdf-bank-statement", {
        mobile_number: fixedMobileNumber,
      });
      setStatements(res.responseData?.statements || []);
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Failed to fetch statements";
      toast.error(errMsg);
    } finally {
      setFetchingStatements(false);
    }
  };

  const handleApprove = (statement: Statement) => {
    setSelectedStatement(statement);
    setConfirmAction("approve");
    setConfirmDialogOpen(true);
  };

  const handleReject = (statement: Statement) => {
    setSelectedStatement(statement);
    setConfirmAction("reject");
    setConfirmDialogOpen(true);
  };

  const handleDelete = (statement: Statement) => {
    setSelectedStatement(statement);
    setConfirmAction("delete");
    setConfirmDialogOpen(true);
  };

  const handleEdit = (statement: Statement) => {
    setSelectedStatement(statement);
    setUploadDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selectedStatement || !confirmAction) return;

    setActionLoading(true);
    try {
      let endpoint = "";
      let payload: Record<string, any> = { id: selectedStatement.id };

      switch (confirmAction) {
        case "approve":
          endpoint = "/api/mobile/set-pdf-bank-statement";
          payload = {...payload, request_type: "approved"}
          break;
        case "reject":
          endpoint = "/api/mobile/set-pdf-bank-statement";
          payload = { ...payload, request_type: "rejected", rejected_reason: rejectReason.trim() }
          break;
        case "delete":
          endpoint = "/api/upload/s3/delete";
          payload = { ...payload, s3_key: selectedStatement.s3_key, request_type: "delete" }
          break;
      }
      let res = null;
      if(confirmAction === "delete") {
        if (payload.s3_key){
          res = await del(endpoint, payload);
        }
        endpoint = "/api/mobile/set-pdf-bank-statement";
      }
      res = await post(endpoint, payload);

      toast.success(res?.responseStatus?.message || `${confirmAction} successful`);

      setConfirmDialogOpen(false);
      setSelectedStatement(null);
      setConfirmAction(null);
      setRejectReason("");
      refreshStatements();
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || `${confirmAction} failed`;
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.name.match(/\.pdf$/i)) {
        setFile(selectedFile);
        setErrorMessage("");
      } else {
        setErrorMessage("Please select a valid PDF file (.pdf)");
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setErrorMessage("");

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
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitUpload = async () => {
    if (!uploadedFile?.s3_key || !selectedStatement) {
      setErrorMessage("Please upload a file first.");
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await post("/api/mobile/set-pdf-bank-statement", {
        request_type: "success",
        id: selectedStatement.id,
        s3_key: uploadedFile.s3_key,
        mobile_number: fixedMobileNumber,
        name: selectedStatement.name,
        account_number: selectedStatement.account_number,
        investigator_officier_name: selectedStatement.investigator_officier_name,
        bank_name: selectedStatement.bank_name,
        ifsc_code: selectedStatement.ifsc_code,
      });

      toast.success(res?.responseStatus?.message || "Statement uploaded successfully");
      resetUploadDialog();
      refreshStatements();
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Submission failed";
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
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Delete failed";
      toast.error(errMsg);
    } finally {
      setDeleteUploadLoading(false);
    }
  };

  const resetUploadDialog = () => {
    setUploadDialogOpen(false);
    setFile(null);
    setProgress(0);
    setUploadedFile(null);
    setSelectedStatement(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // New Record handlers
  const handleNewRecordFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.name.match(/\.pdf$/i)) {
        setNewRecordFile(selectedFile);
        setErrorMessage("");
      } else {
        setErrorMessage("Please select a valid PDF file (.pdf)");
        setNewRecordFile(null);
      }
    }
  };

  const handleNewRecordUpload = async () => {
    if (!newRecordFile) return;

    setNewRecordUploading(true);
    setNewRecordProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", newRecordFile);
    formData.append("folder", "bank-statements");

    try {
      const response = await postWithProgress<UploadResponse>(
        "/api/upload/s3/upload",
        formData,
        setNewRecordProgress
      );
      setNewRecordUploadedFile(response.responseData);
      setNewRecordFile(null);
      if (newRecordFileInputRef.current) {
        newRecordFileInputRef.current.value = "";
      }
      // Close upload dialog and open form dialog
      setNewRecordUploadDialogOpen(false);
      setNewRecordFormDialogOpen(true);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setNewRecordUploading(false);
    }
  };

  const handleNewRecordDeleteFile = async () => {
    if (!newRecordUploadedFile?.s3_key) {
      toast.error("No file to delete");
      return;
    }

    setNewRecordDeleteLoading(true);
    try {
      const res = await del("/api/upload/s3/delete", {
        s3_key: newRecordUploadedFile.s3_key,
      });
      toast.success(res?.responseStatus?.message || "File deleted successfully");
      resetNewRecordState();
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Delete failed";
      toast.error(errMsg);
    } finally {
      setNewRecordDeleteLoading(false);
    }
  };

  const handleNewRecordSubmit = async () => {
    if (!newRecordUploadedFile?.s3_key) {
      setErrorMessage("Please upload a file first.");
      return;
    }

    if (!newRecordName.trim()) {
      setErrorMessage("Please enter account holder name.");
      return;
    }

    if (!newRecordAccountNumber.trim()) {
      setErrorMessage("Please enter account number.");
      return;
    }

    if (!newRecordIfscCode.trim()) {
      setErrorMessage("Please enter IFSC code.");
      return;
    }

    if (!newRecordBankName.trim()) {
      setErrorMessage("Please enter bank name.");
      return;
    }

    if (!newRecordInvestigatorName.trim()) {
      setErrorMessage("Please enter investigator officer name.");
      return;
    }

    setErrorMessage("");
    setNewRecordSubmitLoading(true);

    try {
      const res = await post("/api/mobile/set-pdf-bank-statement", {
        request_type: "success",
        s3_key: newRecordUploadedFile.s3_key,
        mobile_number: fixedMobileNumber,
        name: newRecordName.trim(),
        account_number: newRecordAccountNumber.trim(),
        ifsc_code: newRecordIfscCode.trim(),
        bank_name: newRecordBankName.trim(),
        investigator_officier_name: newRecordInvestigatorName.trim(),
      });

      toast.success(res?.responseStatus?.message || "New record created successfully");
      resetNewRecordState();
      refreshStatements();
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Submission failed";
      toast.error(errMsg);
    } finally {
      setNewRecordSubmitLoading(false);
    }
  };

  const resetNewRecordState = () => {
    setNewRecordUploadDialogOpen(false);
    setNewRecordFormDialogOpen(false);
    setNewRecordFile(null);
    setNewRecordProgress(0);
    setNewRecordUploadedFile(null);
    setNewRecordName("");
    setNewRecordAccountNumber("");
    setNewRecordIfscCode("");
    setNewRecordBankName("");
    setNewRecordInvestigatorName("");
    setErrorMessage("");
    if (newRecordFileInputRef.current) {
      newRecordFileInputRef.current.value = "";
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setStatements([]);
    setMobileNumber("");
    setFixedMobileNumber("");
  };

  return (
    <>
      {/* Main Card - Mobile Input */}
      <Card className="w-[300px] lg:w-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bank PDF Statements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              placeholder="Enter mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleProceed()}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-destructive text-sm flex items-center gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {errorMessage}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            onClick={handleProceed}
            disabled={!mobileNumber || fetchingStatements}
            loading={fetchingStatements}
            className="w-full"
          >
            View Statements
          </Button>
        </CardContent>
      </Card>

      {/* Statements Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Bank Statements
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <span>Mobile:</span>
              <span className="font-medium text-foreground">{fixedMobileNumber}</span>
              <span className="text-muted-foreground">•</span>
              <span>{statements.length} statement(s)</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {fetchingStatements ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Loading statements...</span>
                </div>
              </div>
            ) : statements.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar"
              >
                <AnimatePresence mode="popLayout">
                  {statements.map((statement) => (
                    <StatementTile
                      key={statement.id}
                      statement={statement}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      isLoading={actionLoading}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 text-muted-foreground"
              >
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No statements found</p>
                <p className="text-xs mt-1">No bank statements available for this number</p>
              </motion.div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={handleDialogClose}>
              Close
            </Button>
            <Button
              variant="secondary"
              onClick={() => setNewRecordUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              New Record
            </Button>
            <Button onClick={refreshStatements} disabled={fetchingStatements}>
              <RotateCcw className={cn("h-4 w-4", fetchingStatements && "animate-spin")} />
              Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{confirmAction} Statement</DialogTitle>
            <DialogDescription>
              {confirmAction === "approve" && "Are you sure you want to approve this statement request?"}
              {confirmAction === "reject" && "Are you sure you want to reject this statement request?"}
              {confirmAction === "delete" && "Are you sure you want to delete this statement? This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {selectedStatement && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-secondary/30 rounded-lg space-y-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedStatement.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                <span>{selectedStatement.bank_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>{selectedStatement.account_number}</span>
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
              <Label htmlFor="rejectReason">Reason for Rejection <span className="text-destructive">*</span></Label>
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
              variant={confirmAction === "delete" || confirmAction === "reject" ? "destructive" : "default"}
              onClick={executeAction}
              disabled={actionLoading || (confirmAction === "reject" && !rejectReason.trim())}
              loading={actionLoading}
            >
              {confirmAction === "approve" && "Approve"}
              {confirmAction === "reject" && "Reject"}
              {confirmAction === "delete" && "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => !open && resetUploadDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Statement
            </DialogTitle>
            {selectedStatement && (
              <DialogDescription className="space-y-1">
                <div>Upload PDF for: {selectedStatement.name}</div>
                <div className="text-xs">Account: {selectedStatement.account_number}</div>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4">
            {uploadedFile ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    File uploaded successfully!
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium truncate">{uploadedFile.original_filename}</span>
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

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitUpload}
                    disabled={submitLoading || deleteUploadLoading}
                    loading={submitLoading}
                    className="flex-1"
                  >
                    Submit Statement
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteUploadedFile}
                    disabled={submitLoading || deleteUploadLoading}
                    loading={deleteUploadLoading}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
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
                        <span className="truncate max-w-[200px]">{file.name}</span>
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

                {/* Error Message */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-destructive text-sm flex items-center gap-1.5"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                      {errorMessage}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  loading={uploading}
                  className="w-full"
                >
                  <Upload className="h-4 w-4" />
                  Upload to S3
                </Button>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUploadDialog} disabled={uploading || submitLoading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Record Upload Dialog */}
      <Dialog open={newRecordUploadDialogOpen} onOpenChange={(open) => !open && resetNewRecordState()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Statement
            </DialogTitle>
            <DialogDescription>
              Upload PDF for mobile: {fixedMobileNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => newRecordFileInputRef.current?.click()}
            >
              <Input
                ref={newRecordFileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleNewRecordFileChange}
                className="hidden"
              />
              {newRecordFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="truncate max-w-[200px]">{newRecordFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewRecordFile(null);
                      if (newRecordFileInputRef.current) newRecordFileInputRef.current.value = "";
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
              {newRecordUploading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{newRecordProgress}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${newRecordProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-destructive text-sm flex items-center gap-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              onClick={handleNewRecordUpload}
              disabled={!newRecordFile || newRecordUploading}
              loading={newRecordUploading}
              className="w-full"
            >
              <Upload className="h-4 w-4" />
              Upload to S3
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetNewRecordState} disabled={newRecordUploading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Record Form Dialog */}
      <Dialog open={newRecordFormDialogOpen} onOpenChange={(open) => !open && resetNewRecordState()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Enter Statement Details
            </DialogTitle>
            <DialogDescription>
              Fill in the details for mobile: {fixedMobileNumber}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Uploaded File Info */}
            {newRecordUploadedFile && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                  <CheckCircle className="h-4 w-4" />
                  File uploaded: {newRecordUploadedFile.original_filename}
                </div>
              </div>
            )}

            {/* Form Inputs */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="newRecordName">Account Holder Name</Label>
                <Input
                  id="newRecordName"
                  placeholder="Enter account holder name"
                  value={newRecordName}
                  onChange={(e) => setNewRecordName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newRecordAccountNumber">Account Number</Label>
                <Input
                  id="newRecordAccountNumber"
                  placeholder="Enter account number"
                  value={newRecordAccountNumber}
                  onChange={(e) => setNewRecordAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newRecordIfscCode">IFSC Code</Label>
                <Input
                  id="newRecordIfscCode"
                  placeholder="Enter IFSC code"
                  value={newRecordIfscCode}
                  onChange={(e) => setNewRecordIfscCode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newRecordBankName">Bank Name</Label>
                <Input
                  id="newRecordBankName"
                  placeholder="Enter bank name"
                  value={newRecordBankName}
                  onChange={(e) => setNewRecordBankName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newRecordInvestigatorName">Investigator Officer Name</Label>
                <Input
                  id="newRecordInvestigatorName"
                  placeholder="Enter investigator officer name"
                  value={newRecordInvestigatorName}
                  onChange={(e) => setNewRecordInvestigatorName(e.target.value)}
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-destructive text-sm flex items-center gap-1.5"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleNewRecordDeleteFile}
              disabled={newRecordSubmitLoading || newRecordDeleteLoading}
              loading={newRecordDeleteLoading}
            >
              <Trash2 className="h-4 w-4" />
              Delete File
            </Button>
            <Button
              onClick={handleNewRecordSubmit}
              disabled={newRecordSubmitLoading || newRecordDeleteLoading}
              loading={newRecordSubmitLoading}
            >
              Submit Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
