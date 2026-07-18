const MAX_INK = 100;
const REGEN_INTERVAL_SECONDS = 18;

/**
 * Returns an atomic quota update suitable for inclusion in a D1 batch.
 * If the regenerated balance is insufficient, the user_ink CHECK constraint
 * fails and D1 rolls back the entire batch, including content inserts.
 */
export function prepareInkConsumption(
  db: D1Database,
  userId: string,
  amount: number,
  nowSeconds: number,
): D1PreparedStatement {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_INK) {
    throw new Error('INK_INSUFFICIENT');
  }

  return db.prepare(
    `INSERT INTO user_ink (user_id, ink, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(user_id) DO UPDATE SET
       ink = MIN(
         ${MAX_INK},
         user_ink.ink + MAX(
           0,
           CAST((excluded.updated_at - user_ink.updated_at) / ${REGEN_INTERVAL_SECONDS} AS INTEGER)
         )
       ) - ?4,
       updated_at = user_ink.updated_at + MAX(
         0,
         CAST((excluded.updated_at - user_ink.updated_at) / ${REGEN_INTERVAL_SECONDS} AS INTEGER)
       ) * ${REGEN_INTERVAL_SECONDS}
     RETURNING ink, updated_at`
  ).bind(userId, MAX_INK - amount, nowSeconds, amount);
}

export function isInsufficientInkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('INK_INSUFFICIENT') ||
    (message.includes('CHECK constraint failed') && message.includes('ink'));
}
