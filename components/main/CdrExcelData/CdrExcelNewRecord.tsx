"use client";

import React, { useState, useRef } from "react";
import { del, post, postWithProgress } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  ExternalLink,
  RotateCcw,
  Trash2,
  User,
  UserCheck,
  Phone,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { isValidIndianMobileNumber } from "@/lib/utils";

// Types
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

interface CdrExcelNewRecordProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function CdrExcelNewRecord({
  open,
  onOpenChange,
  onSuccess,
}: CdrExcelNewRecordProps) {
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse["responseData"] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [investigatorName, setInvestigatorName] = useState<string>("");

  // Loading state
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ];
      if (
        validTypes.includes(selectedFile.type) ||
        selectedFile.name.match(/\.(xlsx|xls|csv)$/i)
      ) {
        setFile(selectedFile);
        setErrorMessage("");
      } else {
        setErrorMessage("Please select a valid Excel file (.xlsx, .xls, .csv)");
        setFile(null);
      }
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "cdr-excel-data");

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
      setErrorMessage(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    // Validation
    if (!uploadedFile?.s3_key) {
      setErrorMessage("Please upload an Excel file first.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter name.");
      return;
    }

    if (!mobileNumber.trim()) {
      setErrorMessage("Please enter mobile number.");
      return;
    }

    const { result, fixedNumber } = isValidIndianMobileNumber(mobileNumber);
    if (!result) {
      setErrorMessage("Please enter a valid Indian mobile number.");
      return;
    }

    if (!investigatorName.trim()) {
      setErrorMessage("Please enter investigator officer name.");
      return;
    }

    setErrorMessage("");
    setSubmitLoading(true);

    try {
      const res = await post("/api/mobile/set-cdr-excel-data", {
        request_type: "success",
        s3_key: uploadedFile.s3_key,
        mobile_number: fixedNumber,
        name: name.trim(),
        investigator_officier_name: investigatorName.trim(),
      });

      toast.success(res?.responseStatus?.message || "New record created successfully");
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg = err?.response?.data?.responseStatus?.message || "Submission failed";
      toast.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle delete uploaded file
  const handleDelete = async () => {
    if (!uploadedFile?.s3_key) {
      toast.error("No file to delete");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await del("/api/upload/s3/delete", {
        s3_key: uploadedFile.s3_key,
      });
      toast.success(res?.responseStatus?.message || "File deleted successfully");
      setUploadedFile(null);
      setProgress(0);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { responseStatus?: { message?: string } } } };
      const errMsg = err?.response?.data?.responseStatus?.message || "Delete failed";
      toast.error(errMsg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setProgress(0);
    setUploadedFile(null);
    setName("");
    setMobileNumber("");
    setInvestigatorName("");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle dialog close
  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            New CDR Excel Record
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file and fill in the details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Upload Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Excel Upload</Label>

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
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadedFile(null);
                      setProgress(0);
                    }}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Upload Different
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    loading={deleteLoading}
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
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        <span className="truncate max-w-[300px]">{file.name}</span>
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
                      <p className="text-sm text-muted-foreground">Click to select Excel file</p>
                      <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls, .csv supported</p>
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

                <Button
                  onClick={handleUpload}
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

          {/* Form Fields */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Record Details</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <Label htmlFor="mobile" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Mobile Number
                </Label>
                <Input
                  id="mobile"
                  placeholder="Enter mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>

              {/* Investigator Officer Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="investigator" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  Investigator Officer Name
                </Label>
                <Input
                  id="investigator"
                  placeholder="Enter investigator officer name"
                  value={investigatorName}
                  onChange={(e) => setInvestigatorName(e.target.value)}
                />
              </div>
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

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="flex-1"
              disabled={submitLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitLoading || !uploadedFile}
              loading={submitLoading}
              className="flex-1"
            >
              Submit Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
