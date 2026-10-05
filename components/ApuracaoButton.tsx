"use client";

import Link from "next/link";

const className = "inline-flex items-center gap-2 rounded-full border border-red-600 bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-red-600 sm:text-xs";

function Mark() {
  return (
    <>
      <span className="rec-dot h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" aria-hidden />
      APURAÇÃO EM TEMPO REAL
    </>
  );
}

export function ApuracaoButton() {
  return (
    <Link href="/apuracao" className={`${className} hover:bg-red-50`}>
      <Mark />
    </Link>
  );
}

export function ApuracaoBadge() {
  return (
    <span className={className}>
      <Mark />
    </span>
  );
}
