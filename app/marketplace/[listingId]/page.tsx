"use client";

import { use } from "react";
import ListingDetail from "@/components/marketplace/ListingDetail";

export default function PublicListingDetailPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = use(params);

  return (
    <ListingDetail
      listingId={listingId}
      backHref="/dashboard/marketplace"
      backLabel="Back to Marketplace"
      hireHref={(id) => `/dashboard/marketplace/tasks/create?listingId=${id}`}
      ctaStyle="fixed"
    />
  );
}
