"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  CreditCard,
  Hash,
  UserCheck,
  Clock,
  BadgeCheck,
  XCircle,
  CheckCircle,
  FileText,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BankStatement, StatementStatus, StatusConfig } from "@/types/bank-statement";

// Status configuration
const STATUS_CONFIGS: Record<StatementStatus, StatusConfig> = {
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

// Format date utility
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Animation variants
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

interface StatementCardProps {
  statement: BankStatement;
}

export function StatementCard({ statement }: StatementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIGS[statement.status];

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="group relative p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
            statusConfig.className
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse",
              statusConfig.dotColor
            )}
          />
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
              <p className="text-foreground truncate font-mono text-xs">
                {statement.account_number}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">IFSC Code</span>
              <p className="text-foreground truncate font-mono text-xs">
                {statement.ifsc_code}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile & Investigator */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Mobile</span>
              <p className="text-foreground truncate">{statement.mobile_number}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground">Investigator</span>
              <p className="text-foreground truncate text-xs">
                {statement.investigator_officier_name}
              </p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Created: {formatDate(statement.created_at)}</span>
        </div>

        {/* Status History Toggle */}
        {statement.status_history && statement.status_history.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  expanded && "rotate-180"
                )}
              />
              {expanded ? "Hide" : "Show"} History ({statement.status_history.length})
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-2">
                    {statement.status_history.map((history, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-secondary/30 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs capitalize">
                            {history.action}
                          </Badge>
                          <span className="text-muted-foreground">
                            {formatDate(history.timestamp)}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{history.user_email}</p>
                        {history.details && Object.keys(history.details).length > 0 && (
                          <div className="text-muted-foreground/70 text-[10px]">
                            {history.details.reason && (
                              <span className="text-red-400">
                                Reason: {String(history.details.reason)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
