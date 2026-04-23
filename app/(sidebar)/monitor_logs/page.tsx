import { Loader } from "@/components/custom/custom-loader";
import MonitorLogs from "@/components/pages/monitor_logs/MonitorLogs";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <MonitorLogs />
    </Suspense>
  );
}
