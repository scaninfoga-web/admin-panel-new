import { Loader } from "@/components/custom/custom-loader";
import TransactionDetail from "@/components/pages/transactions/TransactionDetail";
import { Suspense } from "react";

export default function Page({ params }: { params: { txn_id: string } }) {
  return (
    <Suspense fallback={<Loader />}>
      <TransactionDetail txnId={params.txn_id} />
    </Suspense>
  );
}
