import pool from '../config/db.js';
import { sendDigitalTagEmail } from '../utils/brevoEmailService.js';

// ==========================================
// USER CONTROLLERS
// ==========================================

/**
 * User submits a new physical tag print or digital email QR request
 */
export async function createOrder(req, res) {
  try {
    const userId = req.user.user_id;
    const {
      recipientName,
      contactNumber,
      shippingAddress,
      deliveryType = 'digital_email',
      targetEmail,
      tagType = 'keychain',
      selectedSize = 'standard',
      customDimensions,
      quantity = 1,
      gcashRefNumber,
      notes
    } = req.body;

    // Validation
    if (!recipientName || !contactNumber) {
      return res.status(400).json({
        message: 'Recipient name and contact number are required.'
      });
    }

    const chosenDeliveryType = deliveryType === 'physical_shipping' ? 'physical_shipping' : 'digital_email';
    const emailToUse = (targetEmail || req.user.email || '').trim();

    if (chosenDeliveryType === 'digital_email' && !emailToUse) {
      return res.status(400).json({
        message: 'A valid email address is required for digital delivery.'
      });
    }

    // Shipping address fallback for digital orders
    const addressToUse = (shippingAddress && shippingAddress.trim())
      ? shippingAddress.trim()
      : chosenDeliveryType === 'digital_email'
        ? `Digital Delivery Inbox: ${emailToUse}`
        : '';

    if (chosenDeliveryType === 'physical_shipping' && !addressToUse) {
      return res.status(400).json({
        message: 'Complete shipping address is required for physical delivery.'
      });
    }

    const validTagTypes = ['keychain', 'wallet_card', 'bundle'];
    const chosenType = validTagTypes.includes(tagType) ? tagType : 'keychain';

    const qty = parseInt(quantity, 10) || 1;
    if (qty < 1 || qty > 20) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 20.' });
    }

    // Handle receipt upload from multer / Cloudinary
    let receiptUrl = null;
    if (req.file) {
      receiptUrl = req.file.path || req.file.secure_url || `/uploads/receipts/${req.file.filename}`;
    } else if (req.body.gcashReceiptUrl) {
      receiptUrl = req.body.gcashReceiptUrl.trim();
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

    const cleanRef = gcashRefNumber ? gcashRefNumber.trim() : null;
    const cleanNotes = notes ? notes.trim() : null;
    const cleanCustomDims = customDimensions ? customDimensions.trim() : null;

    const [insertRes] = await pool.query(
      `INSERT INTO tag_orders (
        user_id, delivery_type, target_email, recipient_name, contact_number, 
        shipping_address, tag_type, selected_size, custom_dimensions, quantity, 
        order_status, payment_status, gcash_receipt_url, gcash_ref_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'submitted', ?, ?, ?)`,
      [
        userId,
        chosenDeliveryType,
        emailToUse,
        recipientName.trim(),
        contactNumber.trim(),
        addressToUse,
        chosenType,
        selectedSize || 'standard',
        cleanCustomDims,
        qty,
        receiptUrl,
        cleanRef,
        cleanNotes
      ]
    );

    return res.status(201).json({
      message: chosenDeliveryType === 'digital_email'
        ? 'Digital ResQTag delivery request submitted! Our team will verify your GCash receipt and dispatch your QR templates via email.'
        : 'Physical ResQTag order request submitted successfully!',
      orderId: insertRes.insertId,
      deliveryType: chosenDeliveryType,
      targetEmail: emailToUse,
      tagType: chosenType,
      selectedSize: selectedSize || 'standard',
      status: 'pending',
      paymentStatus: 'submitted'
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

    const [orders] = await pool.query(
      `SELECT 
         order_id, delivery_type, target_email, recipient_name, contact_number, 
         shipping_address, tag_type, selected_size, custom_dimensions, quantity, 
         order_status, payment_status, gcash_receipt_url, gcash_ref_number, 
         admin_rejection_reason, notes, created_at, updated_at
       FROM tag_orders
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ orders: orders || [] });
  } catch (error) {
    console.error('getMyOrders error:', error);
    return res.status(500).json({ message: 'Failed to fetch your tag orders.', error: error.message });
  }
}

/**
 * User resubmits payment receipt for a rejected order
 */
export async function resubmitPayment(req, res) {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;
    const { gcashRefNumber } = req.body;

    const [rows] = await pool.query(
      'SELECT order_id, payment_status FROM tag_orders WHERE order_id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    let receiptUrl = null;
    if (req.file) {
      receiptUrl = req.file.path || req.file.secure_url || `/uploads/receipts/${req.file.filename}`;
    }


    if (!receiptUrl && !gcashRefNumber) {
      return res.status(400).json({ message: 'Please provide an updated receipt screenshot or reference number.' });
    }

    const updates = ['payment_status = "submitted"', 'admin_rejection_reason = NULL'];
    const params = [];

    if (receiptUrl) {
      updates.push('gcash_receipt_url = ?');
      params.push(receiptUrl);
    }
    if (gcashRefNumber) {
      updates.push('gcash_ref_number = ?');
      params.push(gcashRefNumber.trim());
    }

    params.push(id);

    await pool.query(
      `UPDATE tag_orders SET ${updates.join(', ')} WHERE order_id = ?`,
      params
    );

    return res.json({
      message: 'GCash payment receipt resubmitted successfully for admin verification.',
      orderId: id,
      paymentStatus: 'submitted'
    });
  } catch (error) {
    console.error('resubmitPayment error:', error);
    return res.status(500).json({ message: 'Failed to resubmit payment.', error: error.message });
  }
}

/**
 * User cancels their own order (only if still pending)
 */
export async function cancelOrder(req, res) {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT order_id, order_status FROM tag_orders WHERE order_id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = rows[0];

    if (order.order_status !== 'pending') {
      return res.status(400).json({
        message: `Order cannot be cancelled because it is already "${order.order_status}". Only pending orders can be cancelled.`
      });
    }

    await pool.query(
      'UPDATE tag_orders SET order_status = "cancelled" WHERE order_id = ?',
      [id]
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
 * Admin retrieves all tag print & digital orders with filtering and pagination
 */
export async function getAdminOrders(req, res) {
  try {
    const {
      status,
      paymentStatus,
      deliveryType,
      search,
      dateFilter,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses = [];
    let queryParams = [];

    if (status && status !== 'all') {
      whereClauses.push('o.order_status = ?');
      queryParams.push(status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      whereClauses.push('o.payment_status = ?');
      queryParams.push(paymentStatus);
    }

    if (deliveryType && deliveryType !== 'all') {
      whereClauses.push('o.delivery_type = ?');
      queryParams.push(deliveryType);
    }

    if (search && search.trim()) {
      whereClauses.push('(o.recipient_name LIKE ? OR u.email LIKE ? OR o.target_email LIKE ? OR o.contact_number LIKE ? OR o.gcash_ref_number LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
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
    const [orders] = await pool.query(
      `SELECT 
         o.order_id, 
         o.user_id, 
         o.delivery_type,
         o.target_email,
         o.recipient_name, 
         o.contact_number, 
         o.shipping_address, 
         o.tag_type, 
         o.selected_size,
         o.custom_dimensions,
         o.quantity, 
         o.order_status, 
         o.payment_status,
         o.gcash_receipt_url,
         o.gcash_ref_number,
         o.admin_rejection_reason,
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

    // Order counts by status & payment for metrics
    const [statusCounts] = await pool.query(`
      SELECT 
        SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END) as processingCount,
        SUM(CASE WHEN order_status = 'printed' THEN 1 ELSE 0 END) as printedCount,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as deliveredCount,
        SUM(CASE WHEN payment_status = 'submitted' THEN 1 ELSE 0 END) as submittedPaymentCount
      FROM tag_orders
    `);

    return res.json({
      orders,
      counts: statusCounts[0] || {
        pendingCount: 0,
        processingCount: 0,
        printedCount: 0,
        deliveredCount: 0,
        submittedPaymentCount: 0
      },
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
 * Admin confirms payment & automatically sends QR kit via Brevo email
 */
export async function confirmPaymentAndSendEmail(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
         o.*, 
         u.first_name, 
         u.last_name, 
         u.email as user_email,
         q.qr_token
       FROM tag_orders o
       JOIN users u ON o.user_id = u.user_id
       LEFT JOIN qr_tags q ON o.user_id = q.user_id
       WHERE o.order_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = rows[0];

    if (!order.qr_token) {
      return res.status(400).json({ message: 'User does not have an active QR token generated.' });
    }

    const destinationEmail = order.target_email || order.user_email;
    const recipientName = order.recipient_name || `${order.first_name} ${order.last_name}`.trim();

    // 1. Dispatch Brevo Email
    let emailResult = null;
    try {
      emailResult = await sendDigitalTagEmail({
        recipientEmail: destinationEmail,
        recipientName,
        qrToken: order.qr_token,
        tagType: order.tag_type,
        selectedSize: order.selected_size,
        customDimensions: order.custom_dimensions,
        orderId: order.order_id
      });
    } catch (emailErr) {
      console.error('Brevo email dispatch failed:', emailErr);
      return res.status(500).json({
        message: `Payment confirmed, but failed to send email via Brevo: ${emailErr.message}`
      });
    }

    // 2. Update Database Order Status
    const newOrderStatus = order.delivery_type === 'digital_email' ? 'delivered' : 'processing';

    await pool.query(
      `UPDATE tag_orders 
       SET payment_status = 'verified', 
           order_status = ?,
           admin_rejection_reason = NULL
       WHERE order_id = ?`,
      [newOrderStatus, id]
    );

    return res.json({
      message: `Payment verified for Order #${id}! QR kit has been delivered to ${destinationEmail}.`,
      paymentStatus: 'verified',
      orderStatus: newOrderStatus,
      emailResult
    });
  } catch (error) {
    console.error('confirmPaymentAndSendEmail error:', error);
    return res.status(500).json({ message: 'Failed to verify payment and dispatch email.', error: error.message });
  }
}

/**
 * Admin rejects payment receipt
 */
export async function rejectPayment(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const rejectionReason = (reason && reason.trim())
      ? reason.trim()
      : 'Payment receipt could not be verified. Please check reference number and upload a clearer screenshot.';

    const [result] = await pool.query(
      `UPDATE tag_orders 
       SET payment_status = 'rejected', 
           admin_rejection_reason = ?
       WHERE order_id = ?`,
      [rejectionReason, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.json({
      message: `Payment for Order #${id} marked as rejected. User notified of rejection reason.`,
      paymentStatus: 'rejected',
      adminRejectionReason: rejectionReason
    });
  } catch (error) {
    console.error('rejectPayment error:', error);
    return res.status(500).json({ message: 'Failed to reject payment.', error: error.message });
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

    const [orderRows] = await pool.query(
      `SELECT 
         o.order_id, 
         o.delivery_type,
         o.target_email,
         o.recipient_name, 
         o.contact_number, 
         o.shipping_address, 
         o.tag_type, 
         o.selected_size,
         o.custom_dimensions,
         o.quantity, 
         o.order_status, 
         o.payment_status,
         o.gcash_receipt_url,
         o.gcash_ref_number,
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

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orderRows[0];

    // Fetch basic emergency summary for print verification
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
