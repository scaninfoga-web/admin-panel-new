import { Loader } from "@/components/custom/custom-loader";
import Users from "@/components/pages/users/Users";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <Users />
    </Suspense>
  );
}
