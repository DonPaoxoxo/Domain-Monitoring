"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const AFFECTED_PATHS = ["/dashboard", "/domains", "/incidents", "/reports", "/region-checks"];

function revalidateAll() {
  for (const path of AFFECTED_PATHS) revalidatePath(path);
}

/** Pauses or resumes monitoring for a domain; paused domains are skipped by checker nodes. */
export async function setDomainPaused(domainId: number, paused: boolean): Promise<void> {
  await prisma.domain.update({ where: { id: domainId }, data: { paused } });
  revalidateAll();
}

/** Permanently removes a domain and its check history. */
export async function removeDomain(domainId: number): Promise<void> {
  await prisma.domain.delete({ where: { id: domainId } });
  revalidateAll();
}
