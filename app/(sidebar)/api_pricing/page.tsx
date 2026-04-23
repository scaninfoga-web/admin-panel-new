import { Loader } from "@/components/custom/custom-loader";
import ApiPricing from "@/components/pages/api_pricing/ApiPricing";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <ApiPricing />
    </Suspense>
  );
}
