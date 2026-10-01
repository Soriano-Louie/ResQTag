export async function attachRecipients(db, orders) {
  if (!orders.length) return;
  const [rows] = await db.query(`SELECT order_id, member_id, first_name, last_name, qr_token, copies FROM tag_order_recipients WHERE order_id IN (${orders.map(() => '?').join(',')}) ORDER BY recipient_id`, orders.map(o => o.order_id));
  for (const order of orders) order.recipients = rows.filter(r => r.order_id === order.order_id);
}
