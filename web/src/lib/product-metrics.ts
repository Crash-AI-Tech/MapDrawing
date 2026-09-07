export function activityStatement(db: D1Database, userId: string, event: 'visit' | 'create') {
  return db.prepare("INSERT OR IGNORE INTO product_activity (user_id, day, event) VALUES (?, date('now'), ?)").bind(userId, event);
}
