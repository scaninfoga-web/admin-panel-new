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
  ArrowLeft,
  User,
  CreditCard,
  Calendar,
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

interface Statement {
  id: number;
  name: string;
  account_number: string;
  filename: string;
  encrypted_url: string;
  s3_key: string;
  created_at: string;
  updated_at: string;
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

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function BankPdfS3() {
  // Step management
  const [step, setStep] = useState<"mobile" | "statements" | "upload">("mobile");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [fixedMobileNumber, setFixedMobileNumber] = useState<string>("");

  // Statements state
  const [statements, setStatements] = useState<Statement[]>([]);
  const [fetchingStatements, setFetchingStatements] = useState<boolean>(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [statementToDelete, setStatementToDelete] = useState<Statement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<UploadResponse["responseData"] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");

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

    try {
      const res = await post<StatementsResponse>("/api/mobile/get-pdf-bank-statement", {
        mobile_number: fixedNumber,
      });
      setStatements(res.responseData?.statements || []);
      setStep("statements");
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "Failed to fetch statements";
      toast.error(errMsg);
    } finally {
      setFetchingStatements(false);
    }
  };

  const handleDeleteClick = (statement: Statement) => {
    setStatementToDelete(statement);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!statementToDelete) return;

    setDeleteLoading(true);
    try {
      const res = await del("/api/upload/s3/delete", {
        s3_key: statementToDelete.s3_key,
      });
      toast.success(res?.responseStatus?.message || "Deleted successfully");
      setStatements((prev) => prev.filter((s) => s.id !== statementToDelete.id));
      setDeleteDialogOpen(false);
      setStatementToDelete(null);
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "";
      toast.error(`Delete failed. ${errMsg}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === "application/pdf" ||
        selectedFile.name.match(/\.pdf$/i)
      ) {
        setFile(selectedFile);
        setUploadStatus("idle");
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
    setUploadStatus("idle");
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
      setUploadStatus("success");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      setUploadStatus("error");
      setErrorMessage(
        error.response?.data?.message || "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (uploadedFile: UploadResponse["responseData"]) => {
    if (!uploadedFile?.s3_key) {
      setErrorMessage("Please upload a file first.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter the account holder name.");
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMessage("Please enter the account number.");
      return;
    }

    setErrorMessage("");
    setSubmitLoading(true);
    try {
      const res = await post("/api/mobile/set-pdf-bank-statement", {
        s3_key: uploadedFile?.s3_key || "",
        mobile_number: fixedMobileNumber,
        name: name.trim(),
        account_number: accountNumber.trim(),
      });

      toast.success(
        res?.responseStatus?.message ||
          `Uploaded successfully for ${fixedMobileNumber}`
      );
      resetUpload();
      // Refresh statements
      handleProceed();
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "";
      toast.error(`Upload succeeded. But ${errMsg}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUploadedFile = async (s3Key: string) => {
    if (!s3Key) {
      setErrorMessage("Please upload a file first.");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await del("/api/upload/s3/delete", {
        s3_key: s3Key,
      });
      toast.success(res?.responseStatus?.message || "Deleted successfully");
      resetUpload();
    } catch (error: any) {
      const errMsg = error?.response?.data?.responseStatus?.message || "";
      toast.error(`Delete failed. ${errMsg}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    setUploadedFile(null);
    setName("");
    setAccountNumber("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetAll = () => {
    resetUpload();
    setStep("mobile");
    setMobileNumber("");
    setFixedMobileNumber("");
    setStatements([]);
  };

  return (
    <>
      <Card className="w-[300px] lg:w-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step !== "mobile" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  if (step === "upload") {
                    resetUpload();
                    setStep("statements");
                  } else {
                    resetAll();
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <FileText className="h-5 w-5" />
            Bank PDF Statements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Mobile Number Input */}
          {step === "mobile" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  placeholder="Enter mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleProceed()}
                />
              </div>

              {errorMessage && (
                <p className="text-destructive text-sm">{errorMessage}</p>
              )}

              <Button
                onClick={handleProceed}
                disabled={!mobileNumber || fetchingStatements}
                loading={fetchingStatements}
                className="w-full"
              >
                Proceed
              </Button>
            </>
          )}

          {/* Step 2: Show Statements */}
          {step === "statements" && (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                Mobile: <span className="font-medium text-foreground">{fixedMobileNumber}</span>
              </div>

              {statements.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    Existing Statements ({statements.length})
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-auto custom-scrollbar">
                    {statements.map((statement) => (
                      <div
                        key={statement.id}
                        className="p-3 bg-secondary/30 rounded-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate">{statement.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CreditCard className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{statement.account_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 flex-shrink-0" />
                              <span>{formatDate(statement.created_at)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                            onClick={() => handleDeleteClick(statement)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {statement.filename}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No statements found</p>
                </div>
              )}

              <Button
                onClick={() => setStep("upload")}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New Statement
              </Button>
            </>
          )}

          {/* Step 3: Upload */}
          {step === "upload" && (
            <>
              {uploadStatus === "success" && uploadedFile ? (
                <>
                  {/* File Details */}
                  <div className="space-y-3 p-4 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2 text-primary text-sm font-medium">
                      <CheckCircle className="h-4 w-4" />
                      File uploaded successfully!
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-medium truncate">
                          {uploadedFile.original_filename}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Size:</span>
                        <span>{formatFileSize(uploadedFile.file_size)}</span>
                      </div>

                      <a
                        href={uploadedFile.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View File
                      </a>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Account Holder Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter account holder name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Account Number Input */}
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Enter account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-destructive text-sm">{errorMessage}</p>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={() => handleSubmit(uploadedFile)}
                    disabled={submitLoading || !name.trim() || !accountNumber.trim()}
                    loading={submitLoading}
                    className="w-full"
                  >
                    Submit for {fixedMobileNumber}
                  </Button>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={resetUpload}
                      variant="outline"
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Upload Another
                    </Button>
                    <Button
                      onClick={() => handleDeleteUploadedFile(uploadedFile.s3_key)}
                      disabled={deleteLoading}
                      loading={deleteLoading}
                      variant="destructive"
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete File
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-2">
                    Uploading for: <span className="font-medium text-foreground">{fixedMobileNumber}</span>
                  </div>

                  {/* File Input */}
                  <div className="space-y-2">
                    <Label htmlFor="pdf-file">Bank Statement PDF</Label>
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Input
                        ref={fileInputRef}
                        id="pdf-file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {file ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="truncate max-w-[200px]">
                              {file.name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetUpload();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="py-2">
                          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to select PDF file
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            .pdf supported
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300 bg-primary"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <p className="text-destructive text-sm">{errorMessage}</p>
                  )}

                  {/* Upload Button */}
                  <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    loading={uploading}
                    className="w-full"
                  >
                    <div className="flex">
                      <Upload className="h-4 w-4 mr-2" />
                      <p>Upload to S3</p>
                    </div>
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Statement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank statement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {statementToDelete && (
            <div className="p-3 bg-secondary/30 rounded-lg space-y-1 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {statementToDelete.name}</div>
              <div><span className="text-muted-foreground">Account:</span> {statementToDelete.account_number}</div>
              <div className="text-xs text-muted-foreground truncate">{statementToDelete.filename}</div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              loading={deleteLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
