"use client";

import React, { useState, useRef } from "react";
import { del, post, postWithProgress } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  ExternalLink,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { isValidIndianMobileNumber } from "@/lib/utils";
import { toast } from "sonner";

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

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function ExcelDataS3() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [numberValue, setNumberValue] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<
    UploadResponse["responseData"] | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState<boolean>(false);

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
        setUploadStatus("idle");
        setErrorMessage("");
      } else {
        setErrorMessage("Please select a valid Excel file (.xlsx, .xls, .csv)");
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
    formData.append("folder", "excel-data");

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
    if (!numberValue) {
      setErrorMessage("Please enter a mobile number.");
      return;
    }

    if (!uploadedFile?.s3_key) {
      setErrorMessage("Please upload a file first.");
      return;
    }

    const { result, fixedNumber } = isValidIndianMobileNumber(numberValue);
    if (!result) {
      setErrorMessage("Please enter a valid Indian mobile number.");
      return;
    }
    setSubmitLoading(true);
    let errMsg = "";
    try {
      const res = await post("/api/mobile/set-excel-data", {
        s3_key: uploadedFile?.s3_key || "",
        mobile_number: fixedNumber,
        force_update: forceUpdate,
      });

      toast.success(
        res?.responseStatus?.message ||
          `Uploaded successfully for ${fixedNumber}`
      );
      resetUpload();
    } catch (error: any) {
      errMsg = error?.response?.data?.responseStatus?.message || "";
      toast.error(`Upload succeeded. But ${errMsg}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (s3Key: string) => {
    if (!s3Key) {
      setErrorMessage("Please upload a file first.");
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await del("/api/upload/s3/delete", {
        s3_key: s3Key,
      });
      toast.success(res?.responseStatus?.message || `Deleted successfully`);
      resetUpload();
    } catch (error: any) {
      let errMsg = error?.response?.data?.responseStatus?.message || "";
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
    setNumberValue("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setForceUpdate(false);
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          S3 Excel Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
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

            {/* Number Input */}
            <div className="space-y-2">
              <Label htmlFor="number">Mobile Number</Label>
              <Input
                id="number"
                placeholder="Enter mobile number"
                value={numberValue}
                onChange={(e) => setNumberValue(e.target.value)}
              />
            </div>

            {/* Force Update Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="forceUpdate" className="cursor-pointer">
                Force Update
              </Label>
              <Switch
                id="forceUpdate"
                checked={forceUpdate}
                onCheckedChange={setForceUpdate}
              />
            </div>

            {errorMessage && (
              <p className="text-destructive text-sm">{errorMessage}</p>
            )}

            {/* Submit Button */}
            <Button
              onClick={() => handleSubmit(uploadedFile)}
              disabled={submitLoading || !numberValue}
              loading={submitLoading}
              className="w-full"
            >
              Submit
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
                onClick={() => handleDelete(uploadedFile.s3_key)}
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
            {/* File Input */}
            <div className="space-y-2">
              <Label htmlFor="file">Excel File</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
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
                    <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to select Excel file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      .xlsx, .xls, .csv supported
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
      </CardContent>
    </Card>
  );
}
