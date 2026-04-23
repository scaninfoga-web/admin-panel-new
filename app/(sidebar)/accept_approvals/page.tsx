import { Loader } from "@/components/custom/custom-loader";
import AcceptApprovals from "@/components/pages/accept_approvals/AcceptApprovals";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <AcceptApprovals />
    </Suspense>
  );
}
