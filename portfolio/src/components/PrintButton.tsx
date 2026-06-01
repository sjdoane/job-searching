"use client";

import { DownloadIcon } from "@/components/icons";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <DownloadIcon className="h-4 w-4" />
      Save as PDF
    </button>
  );
}
