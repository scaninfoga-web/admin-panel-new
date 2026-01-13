"use client";
import { CustomTable } from "@/components/custom/custom-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { get, post } from "@/lib/api";
import { Globe2, Loader2, RefreshCw, Search } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ApiPricing {
  api_name: string;
  previousprice: number;
  currentprice: number;
}

export default function API_Pricing() {
  const [tableData, setTableData] = useState<ApiPricing[]>([]);
  const [filteredData, setFilteredData] = useState<ApiPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingApi, setUpdatingApi] = useState<string | null>(null);

  const handleSearch = useCallback(
    (searchTerm: string) => {
      if (!searchTerm) {
        setFilteredData(tableData);
        return;
      }
      const filteredData = tableData.filter(
        (item) =>
          item.api_name.toLowerCase().includes(searchTerm) ||
          item.currentprice.toString().includes(searchTerm)
      );
      setFilteredData(filteredData);
    },
    [tableData]
  );

  const updatePricing = useCallback(
    async (apiName: string, newPrice: number) => {
      try {
        setUpdatingApi(apiName);
        await post("/api/mobile/set-api-price", {
          api_name: apiName,
          price: newPrice,
        });
        await populateData();
      } catch (error) {
        toast.error("Failed to update pricing");
        console.error(error);
      } finally {
        setUpdatingApi(null);
      }
    },
    []
  );

  const populateData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await get("/api/mobile/get-all-api-pricing");
      setTableData(res?.responseData || []);
      setFilteredData(res?.responseData || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  const columns = [
    {
      title: "API Name",
      dataIndex: "api_name" as keyof ApiPricing,
      width: 700,
    },
    {
      title: "Previous Price",
      dataIndex: "previousprice" as keyof ApiPricing,
      width: 150,
      render: (val: number) => (
        <span className="font-mono text-sm bg-muted px-3 py-1.5 rounded-lg">
          {val}
        </span>
      ),
    },
    {
      title: "Current Price",
      dataIndex: "currentprice" as keyof ApiPricing,
      width: 150,
      render: (val: number) => (
        <span className="font-mono text-sm px-3 py-1.5 rounded-lg border border-slate-700 text-yellow-500">
          {val}
        </span>
      ),
    },
    {
      title: "New Price",
      dataIndex: "currentprice" as keyof ApiPricing,
      width: 180,
      render: (val: number, record: ApiPricing) => {
        const isUpdating = updatingApi === record.api_name;
        return (
          <div className="flex items-center gap-2">
            {isUpdating && (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
            )}
            <Input
              type="number"
              defaultValue={val}
              disabled={isUpdating}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const newPrice = Number(e.currentTarget.value);
                  if (newPrice !== val) {
                    updatePricing(record.api_name, newPrice);
                  }
                }
              }}
              onBlur={(e) => {
                const newPrice = Number(e.target.value);
                if (newPrice !== val && !isUpdating) {
                  updatePricing(record.api_name, newPrice);
                }
              }}
              className="w-full h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        );
      },
    },
  ];

  const handleRefresh = useCallback(() => {
    populateData();
  }, [populateData]);

  useEffect(() => {
    populateData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary/10">
            <Globe2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">API Pricing</h1>
            <p className="text-muted-foreground">
              Monitor and Manage API pricing
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
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center relative">
        <Search className="h-4 w-4 mr-2 absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search api details..."
          className="pl-8 h-10"
          onChange={(e) => {
            handleSearch(e.target.value.trim().toLowerCase());
          }}
        />
      </div>

      <div className="p-2">
        <CustomTable
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          scroll={{ x: 1000, y: 590 }}
        />
      </div>
    </div>
  );
}
