import pool from '../config/db.js';

// ==========================================
// USER CONTROLLERS
// ==========================================

/**
 * User submits a new physical tag print order / request
 */
export async function createOrder(req, res) {
  try {
    const userId = req.user.user_id;
    const { recipientName, contactNumber, shippingAddress, tagType, quantity, notes } = req.body;

    // Validation
    if (!recipientName || !contactNumber || !shippingAddress) {
      return res.status(400).json({ 
        message: 'Recipient name, contact number, and shipping address are required.' 
      });
    }

    const validTagTypes = ['keychain', 'wallet_card', 'bundle'];
    const chosenType = validTagTypes.includes(tagType) ? tagType : 'keychain';

    const qty = parseInt(quantity, 10) || 1;
    if (qty < 1 || qty > 20) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 20.' });
    }

    // Verify user has an active QR tag
    const [qrRows] = await pool.query(
      'SELECT qr_id, qr_token, status FROM qr_tags WHERE user_id = ?',
      [userId]
    );

    if (qrRows.length === 0) {
      return res.status(400).json({ 
        message: 'No QR Tag registered for this account. Please refresh your dashboard.' 
      });
    }

    let result;
    try {
      const [insertRes] = await pool.query(
        `INSERT INTO tag_orders (user_id, recipient_name, contact_number, shipping_address, tag_type, quantity, order_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [userId, recipientName.trim(), contactNumber.trim(), shippingAddress.trim(), chosenType, qty, notes ? notes.trim() : null]
      );
      result = insertRes;
    } catch (dbErr) {
      // Self-healing: if tag_type column is missing on older table, add column and retry
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.message?.includes('tag_type')) {
        await pool.query(`
          ALTER TABLE tag_orders 
          ADD COLUMN tag_type ENUM('keychain', 'wallet_card', 'bundle') DEFAULT 'keychain' AFTER shipping_address;
        `);
        const [retryRes] = await pool.query(
          `INSERT INTO tag_orders (user_id, recipient_name, contact_number, shipping_address, tag_type, quantity, order_status, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [userId, recipientName.trim(), contactNumber.trim(), shippingAddress.trim(), chosenType, qty, notes ? notes.trim() : null]
        );
        result = retryRes;
      } else {
        throw dbErr;
      }
    }

    return res.status(201).json({
      message: 'Physical ResQTag order request submitted successfully!',
      orderId: result.insertId,
      status: 'pending',
      tagType: chosenType
    });
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({ message: 'Failed to submit tag order request.', error: error.message });
  }
}

/**
 * User views their order history and live status
 */
export async function getMyOrders(req, res) {
  try {
    const userId = req.user.user_id;

    let orders;
    try {
      const [rows] = await pool.query(
        `SELECT order_id, recipient_name, contact_number, shipping_address, tag_type, quantity, order_status, notes, created_at, updated_at
         FROM tag_orders
         WHERE user_id = ?
         ORDER BY created_at DESC`,
        [userId]
      );
      orders = rows;
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.message?.includes('tag_type')) {
        await pool.query(`
          ALTER TABLE tag_orders 
          ADD COLUMN tag_type ENUM('keychain', 'wallet_card', 'bundle') DEFAULT 'keychain' AFTER shipping_address;
        `);
        const [rows] = await pool.query(
          `SELECT order_id, recipient_name, contact_number, shipping_address, tag_type, quantity, order_status, notes, created_at, updated_at
           FROM tag_orders
           WHERE user_id = ?
           ORDER BY created_at DESC`,
          [userId]
        );
        orders = rows;
      } else {
        throw dbErr;
      }
    }

    return res.json({ orders: orders || [] });
  } catch (error) {
    console.error('getMyOrders error:', error);
    return res.status(500).json({ message: 'Failed to fetch your tag orders.', error: error.message });
  }
}

/**
 * User cancels their own order (only if still pending)
 */
export async function cancelOrder(req, res) {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    // Fetch the order and verify it belongs to this user
    const [rows] = await pool.query(
      'SELECT order_id, order_status FROM tag_orders WHERE order_id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = rows[0];

    // Only allow cancellation if still pending
    if (order.order_status !== 'pending') {
      return res.status(400).json({
        message: `Order cannot be cancelled because it is already "${order.order_status}". Only pending orders can be cancelled.`
      });
    }

    await pool.query(
      'UPDATE tag_orders SET order_status = ? WHERE order_id = ?',
      ['cancelled', id]
    );

    return res.json({
      message: `Order #${id} has been cancelled.`,
      orderStatus: 'cancelled'
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    return res.status(500).json({ message: 'Failed to cancel order.', error: error.message });
  }
}

// ==========================================
// ADMIN CONTROLLERS
// ==========================================

/**
 * Admin retrieves all tag print orders with filtering and pagination
 */
export async function getAdminOrders(req, res) {
  try {
    const { status, search, dateFilter, startDate, endDate, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereClauses.push('o.order_status = ?');
      queryParams.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(o.recipient_name LIKE ? OR u.email LIKE ? OR o.contact_number LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Date Presets
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'today') {
        whereClauses.push('DATE(o.created_at) = CURDATE()');
      } else if (dateFilter === 'yesterday') {
        whereClauses.push('DATE(o.created_at) = CURDATE() - INTERVAL 1 DAY');
      } else if (dateFilter === 'last_7_days') {
        whereClauses.push('o.created_at >= NOW() - INTERVAL 7 DAY');
      } else if (dateFilter === 'last_30_days') {
        whereClauses.push('o.created_at >= NOW() - INTERVAL 30 DAY');
      } else if (dateFilter === 'this_month') {
        whereClauses.push('o.created_at >= DATE_FORMAT(NOW(), "%Y-%m-01 00:00:00")');
      }
    }

    // Custom Start / End Dates (YYYY-MM-DD)
    if (startDate && startDate.trim()) {
      whereClauses.push('o.created_at >= ?');
      queryParams.push(`${startDate.trim()} 00:00:00`);
    }

    if (endDate && endDate.trim()) {
      whereClauses.push('o.created_at <= ?');
      queryParams.push(`${endDate.trim()} 23:59:59`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM tag_orders o
       JOIN users u ON o.user_id = u.user_id
       ${whereSql}`,
      queryParams
    );

    const totalOrders = countResult[0].total;

    // Data query
    let orders;
    try {
      const [rows] = await pool.query(
        `SELECT 
           o.order_id, 
           o.user_id, 
           o.recipient_name, 
           o.contact_number, 
           o.shipping_address, 
           o.tag_type, 
           o.quantity, 
           o.order_status, 
           o.notes, 
           o.created_at, 
           o.updated_at,
           u.first_name, 
           u.last_name, 
           u.email,
           q.qr_token,
           q.status as qr_status
         FROM tag_orders o
         JOIN users u ON o.user_id = u.user_id
         LEFT JOIN qr_tags q ON o.user_id = q.user_id
         ${whereSql}
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`,
        [...queryParams, limitNum, offset]
      );
      orders = rows;
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.message?.includes('tag_type')) {
        await pool.query(`
          ALTER TABLE tag_orders 
          ADD COLUMN tag_type ENUM('keychain', 'wallet_card', 'bundle') DEFAULT 'keychain' AFTER shipping_address;
        `);
        const [rows] = await pool.query(
          `SELECT 
             o.order_id, 
             o.user_id, 
             o.recipient_name, 
             o.contact_number, 
             o.shipping_address, 
             o.tag_type, 
             o.quantity, 
             o.order_status, 
             o.notes, 
             o.created_at, 
             o.updated_at,
             u.first_name, 
             u.last_name, 
             u.email,
             q.qr_token,
             q.status as qr_status
           FROM tag_orders o
           JOIN users u ON o.user_id = u.user_id
           LEFT JOIN qr_tags q ON o.user_id = q.user_id
           ${whereSql}
           ORDER BY o.created_at DESC
           LIMIT ? OFFSET ?`,
          [...queryParams, limitNum, offset]
        );
        orders = rows;
      } else {
        throw dbErr;
      }
    }

    // Order counts by status for metrics
    const [statusCounts] = await pool.query(`
      SELECT 
        SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END) as processingCount,
        SUM(CASE WHEN order_status = 'printed' THEN 1 ELSE 0 END) as printedCount,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as deliveredCount
      FROM tag_orders
    `);

    return res.json({
      orders,
      counts: statusCounts[0] || { pendingCount: 0, processingCount: 0, printedCount: 0, deliveredCount: 0 },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalOrders,
        totalPages: Math.ceil(totalOrders / limitNum)
      }
    });
  } catch (error) {
    console.error('getAdminOrders error:', error);
    return res.status(500).json({ message: 'Failed to fetch tag orders for admin.', error: error.message });
  }
}

/**
 * Admin bulk-updates status for multiple orders at once
 */
export async function batchUpdateOrderStatus(req, res) {
  try {
    const { orderIds, status } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ message: 'orderIds must be a non-empty array.' });
    }

    const cleanIds = orderIds
      .map(id => parseInt(id, 10))
      .filter(id => !isNaN(id) && id > 0);

    if (cleanIds.length === 0) {
      return res.status(400).json({ message: 'Valid integer order IDs are required.' });
    }

    const validStatuses = ['pending', 'processing', 'printed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const placeholders = cleanIds.map(() => '?').join(', ');
    const [result] = await pool.query(
      `UPDATE tag_orders SET order_status = ? WHERE order_id IN (${placeholders})`,
      [status, ...cleanIds]
    );

    return res.json({
      message: `${result.affectedRows} order(s) updated to "${status}".`,
      affectedRows: result.affectedRows,
      orderStatus: status
    });
  } catch (error) {
    console.error('batchUpdateOrderStatus error:', error);
    return res.status(500).json({ message: 'Failed to batch update order statuses.', error: error.message });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'printed', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [result] = await pool.query(
      'UPDATE tag_orders SET order_status = ? WHERE order_id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Tag order not found.' });
    }

    return res.json({
      message: `Order #${id} status updated to ${status}.`,
      orderStatus: status
    });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return res.status(500).json({ message: 'Failed to update order status.', error: error.message });
  }
}

/**
 * Admin retrieves full customer & QR print payload for manufacturing physical tag
 */
export async function getOrderPrintData(req, res) {
  try {
    const { id } = req.params;

    let orderRows;
    try {
      const [rows] = await pool.query(
        `SELECT 
           o.order_id, 
           o.recipient_name, 
           o.contact_number, 
           o.shipping_address, 
           o.tag_type, 
           o.quantity, 
           o.order_status, 
           o.created_at,
           u.user_id,
           u.first_name, 
           u.middle_name, 
           u.last_name, 
           u.email,
           q.qr_token,
           q.status as qr_status
         FROM tag_orders o
         JOIN users u ON o.user_id = u.user_id
         LEFT JOIN qr_tags q ON o.user_id = q.user_id
         WHERE o.order_id = ?`,
        [id]
      );
      orderRows = rows;
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.message?.includes('tag_type')) {
        await pool.query(`
          ALTER TABLE tag_orders 
          ADD COLUMN tag_type ENUM('keychain', 'wallet_card', 'bundle') DEFAULT 'keychain' AFTER shipping_address;
        `);
        const [rows] = await pool.query(
          `SELECT 
             o.order_id, 
             o.recipient_name, 
             o.contact_number, 
             o.shipping_address, 
             o.tag_type, 
             o.quantity, 
             o.order_status, 
             o.created_at,
             u.user_id,
             u.first_name, 
             u.middle_name, 
             u.last_name, 
             u.email,
             q.qr_token,
             q.status as qr_status
           FROM tag_orders o
           JOIN users u ON o.user_id = u.user_id
           LEFT JOIN qr_tags q ON o.user_id = q.user_id
           WHERE o.order_id = ?`,
          [id]
        );
        orderRows = rows;
      } else {
        throw dbErr;
      }
    }

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderRows[0];

    // Also fetch basic emergency summary for print verification
    const [profileRows] = await pool.query(
      'SELECT blood_type, allergies, emergency_notes FROM emergency_profiles WHERE user_id = ?',
      [order.user_id]
    );

    return res.json({
      order,
      profile: profileRows[0] || {}
    });
  } catch (error) {
    console.error('getOrderPrintData error:', error);
    return res.status(500).json({ message: 'Failed to fetch print data.', error: error.message });
  }
}
