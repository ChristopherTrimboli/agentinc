"use client";

import { use } from "react";
import ListingDetail from "@/components/marketplace/ListingDetail";

export default function DashboardListingDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = use(params);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <ListingDetail
          listingId={listingId}
          backHref="/dashboard/marketplace"
          backLabel="Back to Marketplace"
          hireHref={(id) =>
            `/dashboard/marketplace/tasks/create?listingId=${id}`
          }
          ctaStyle="inline"
        />
      </div>
    </div>
  );
}
