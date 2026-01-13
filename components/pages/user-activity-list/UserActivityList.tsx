"use client"
import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

import { formatDate } from "@/lib/utils";
import { CustomTable } from "@/components/custom/custom-table";
import Pagination from "@/components/custom/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity, Download, RefreshCw, Eye } from "lucide-react";

import { get } from "@/lib/api";
import { UserActivitiesFilters, type ActivityFilterState } from "@/components/custom/user-activities-filter";
import { Modal } from "@/components/custom/modal";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

interface UserActivity {
  id: number;
  email: string;
  api_called: string;
  activity_time: string;
  request_payload: any;
  ip_address: string;
  device: string;
  browser: string;
  latitude: string;
  longitude: string;
  status: "success" | "failed";
  error_message: string | null;
  user: number;
}

const UserActivityList: React.FC = () => {
  const [tableData, setTableData] = useState<UserActivity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ActivityFilterState>({});
  const [modelOpen, setModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const seeFullErrorMessage = (val: any) => {
    setErrorMsg(val)
    setModalOpen(true)
  }


  const columns = [
    {
      title: "ID",
      dataIndex: "id" as keyof UserActivity,
    },
    {
      title: "Email",
      dataIndex: "email" as keyof UserActivity,
    },
    {
      title: "API Called",
      dataIndex: "api_called" as keyof UserActivity,
      render: (val: string) => (
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {val}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status" as keyof UserActivity,
      render: (val: string) => (
        <Badge 
          variant={val === 'success' ? 'default' : 'destructive'}
          className="capitalize"
        >
          {val}
        </Badge>
      ),
    },
    {
      title: "Activity Time",
      dataIndex: "activity_time" as keyof UserActivity,
      render: (val: string) => formatDate(val),
    },
    {
      title: "IP Address",
      dataIndex: "ip_address" as keyof UserActivity,
      render: (val: string) => val || '-',
    },
    {
      title: "Device",
      dataIndex: "device" as keyof UserActivity,
      render: (val: string) => val || '-',
    },
    {
      title: "Browser",
      dataIndex: "browser" as keyof UserActivity,
      render: (val: string) => val || '-',
    },
    {
      title: "Error Message",
      dataIndex: "error_message" as keyof UserActivity,
      render: (val: string | null) => (
        val ? (
          <div>
          <span className="text-destructive text-sm inline-block">
            {JSON.stringify(val).substring(0, 30) + "..."}
          </span>
          <Button variant="outline" onClick = {() => seeFullErrorMessage(val)}> View </Button>
          </div>
        ) : '-'
      ),
    },
  ];

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('page_size', pageSize.toString());
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    return params.toString();
  }, [currentPage, pageSize, filters]);

  const [successCount, setSuccessCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  const populateData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = buildQueryParams();
      const res = await get(`/api/admin/get-all-user-activities?${queryParams}`);
      const activities = res?.responseData?.result || [];

      const count = res?.responseData?.paginationDetails?.count || 0;
      setSuccessCount(res?.responseData?.success_count)
      setFailedCount(res?.responseData?.failed_count)
      setTableData(activities);
      setTotalRecords(count);
    } catch (error) {
      console.error('Error fetching user activities:', error);
      toast.error("Error fetching user activities");
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    populateData();
  }, [populateData]);

  const handlePageSizeChange = (size: number) => {
    setCurrentPage(1);
    setPageSize(size);
  };

  const handleFiltersChange = (newFilters: ActivityFilterState) => {
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    populateData();
  };

  const handleClearFilters = () => {
    setFilters({ ordering: '-activity_time' });
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    populateData();
    toast.success("Data refreshed successfully");
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };


//   const { successCount, failedCount } = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">User Activities</h1>
            <p className="text-muted-foreground">Monitor and analyze user API activities</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Search Filters */}
      <UserActivitiesFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Results Summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{totalRecords}</span> activities found
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Success: {successCount}
                </Badge>
                <Badge variant="destructive">
                  Failed: {failedCount}
                </Badge>
              </div>
            </div>
            {Object.values(filters).some(v => v && v !== '-activity_time') && (
              <div className="text-sm text-muted-foreground">
                Filters active
              </div>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(totalRecords / pageSize)}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <CustomTable 
          columns={columns} 
          dataSource={tableData} 
          loading={loading}
          scroll={{ x: true }}
        />
        
        <div className="p-4 border-t">
          <Pagination
            currentPage={currentPage}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[5, 10, 20, 50, 100]}
          />
        </div>
      </Card>

      <Modal open={modelOpen} onClose={() => setModalOpen(false)} showFooter={false}>
        {JSON.stringify(errorMsg)}
      </Modal>
    </div>
  );
};

export default UserActivityList;