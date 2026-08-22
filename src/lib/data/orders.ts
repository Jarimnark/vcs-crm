// Data access for purchase orders (02 §7). One record per PO. Logging an
// order is deliberately small — it also resets the follow-up clock, which
// is what the engineer actually wants, so the incentive aligns (Flow E).
import 'server-only'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { purchaseOrders, type OrderStatus } from '@/db/schema'
import type { AppSession } from '@/lib/session'

export interface OrderDto {
  id: number
  projectId: number
  poNumber: string
  poDate: string
  sourceQuotationId: number | null
  amount: string
  currency: string
  status: OrderStatus
  isVoid: boolean
}

function toDto(row: typeof purchaseOrders.$inferSelect): OrderDto {
  return {
    id: row.id,
    projectId: row.projectId,
    poNumber: row.poNumber,
    poDate: row.poDate,
    sourceQuotationId: row.sourceQuotationId,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    isVoid: row.isVoid,
  }
}

export async function listOrdersForProject(projectId: number): Promise<OrderDto[]> {
  const rows = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.projectId, projectId))
    .orderBy(desc(purchaseOrders.poDate), desc(purchaseOrders.id))
  return rows.map(toDto)
}

/** Actual revenue = SUM(amount) WHERE NOT is_void. Never stored (02 §5.1). */
export async function projectActualRevenue(projectId: number): Promise<string> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${purchaseOrders.amount}), 0)::numeric(15,2)` })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.projectId, projectId), eq(purchaseOrders.isVoid, false)))
  return rows[0]?.total ?? '0.00'
}

export async function createOrder(
  session: AppSession,
  input: {
    projectId: number
    poNumber: string
    poDate: string
    amount: string
    currency?: string
    sourceQuotationId?: number | null
  },
): Promise<number> {
  const rows = await db
    .insert(purchaseOrders)
    .values({
      projectId: input.projectId,
      poNumber: input.poNumber,
      poDate: input.poDate,
      amount: input.amount,
      currency: input.currency ?? 'THB',
      sourceQuotationId: input.sourceQuotationId ?? null,
      createdById: session.userId,
      updatedById: session.userId,
    })
    .returning({ id: purchaseOrders.id })
  return rows[0].id
}

/** POs get cancelled — void, do not delete (02 §7). */
export async function voidOrder(session: AppSession, orderId: number): Promise<boolean> {
  const rows = await db
    .update(purchaseOrders)
    .set({ isVoid: true, updatedById: session.userId, updatedAt: new Date() })
    .where(eq(purchaseOrders.id, orderId))
    .returning({ id: purchaseOrders.id })
  return rows.length > 0
}

export async function setOrderStatus(
  session: AppSession,
  orderId: number,
  status: OrderStatus,
): Promise<boolean> {
  const rows = await db
    .update(purchaseOrders)
    .set({ status, updatedById: session.userId, updatedAt: new Date() })
    .where(and(eq(purchaseOrders.id, orderId), eq(purchaseOrders.isVoid, false)))
    .returning({ id: purchaseOrders.id })
  return rows.length > 0
}
