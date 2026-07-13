"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

export function ApprovalCountBadge() {
  const db = useFirestore();

  const pendingCountQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "certificates"),
      where("status", "==", "Pending")
    );
  }, [db]);

  const { data: pendingCerts } = useCollection(pendingCountQuery);
  const count = pendingCerts?.length ?? 0;

  if (count === 0) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
    >
      {count}
    </Badge>
  );
}
