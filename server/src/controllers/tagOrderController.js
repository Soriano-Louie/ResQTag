import pool from '../config/db.js';
import { sendTagOrderEmail, sendDigitalTagEmail } from '../utils/brevoEmailService.js';
import {
  isValidEmail,
  ORDER_EMAIL_MAX_LENGTH
} from '../utils/emailValidation.js';

// ==========================================
// PHYSICAL TAG PACKAGES
// ==========================================
// Every physical order is a fixed combo package that ALWAYS includes BOTH the
// square keychain (code 'square_fob_30x30', 3.0 × 3.0 cm) and the standard
// CR80 wallet card (code 'standard_cr80_card', 8.56 × 5.4 cm) — no other sizes
// are offered for physical tags. `sets` is how many keychain+card pairs one
// purchase unit contains and `pricePeso` is that unit's price. `quantity` on an
// order is the TOTAL number of tag sets (= package.sets × bundle multiplier),
// so a Family of 5 × 2 stores quantity = 10.
const PHYSICAL_PACKAGES = {
  physical_combo: { label: 'Single Combo', pricePeso: 100, sets: 1 },
  physical_family_3: { label: 'Family of 3', pricePeso: 210, sets: 3 },
  physical_family_5: { label: 'Family of 5', pricePeso: 350, sets: 5 },
  physical_family_10: { label: 'Family of 10', pricePeso: 700, sets: 10 }
};

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
      paymentMethod = 'gcash',
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

    // Whitelist-format check: this address is later used to send the digital
    // tag kit, so reject any payload that is not a clean, storeable email.
    if (emailToUse && !isValidEmail(emailToUse, ORDER_EMAIL_MAX_LENGTH)) {
      return res.status(400).json({
        message: 'Please provide a valid email address for QR delivery.'
      });
    }

    // Cash on Delivery is only offered for physical tag shipments
    const isCashOnDelivery = chosenDeliveryType === 'physical_shipping' && paymentMethod === 'cod';
    const chosenPaymentMethod = isCashOnDelivery ? 'cod' : 'gcash';

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

    // Physical orders are fixed combo packages: always tag_type='bundle' and
    // selected_size must be a known package key (see PHYSICAL_PACKAGES above).
    // Digital orders keep the existing free tag-type selection.
    let physicalPackage = null;
    if (chosenDeliveryType === 'physical_shipping') {
      physicalPackage = PHYSICAL_PACKAGES[selectedSize];
      if (!physicalPackage) {
        return res.status(400).json({
          message: 'Please select a valid physical package (combo or family bundle).'
        });
      }
    }

    const chosenType = chosenDeliveryType === 'physical_shipping'
      ? 'bundle' // Combo: keychain + wallet card are always both included
      : (validTagTypes.includes(tagType) ? tagType : 'keychain');

    const qty = parseInt(quantity, 10) || 1;
    if (qty < 1 || qty > 20) {
      return res.status(400).json({ message: 'Quantity must be between 1 and 20.' });
    }

    // For bundles (family of 3/5/10) the total quantity must be an exact
    // multiple of the package size, which lets us derive the bundle multiplier
    // and total price without trusting any client-computed amount.
    if (physicalPackage && qty % physicalPackage.sets !== 0) {
      return res.status(400).json({
        message: `Quantity must be a whole multiple of ${physicalPackage.sets} for the ${physicalPackage.label} package.`
      });
    }

    const physicalTotalPeso = physicalPackage
      ? physicalPackage.pricePeso * (qty / physicalPackage.sets)
      : null;

    // Handle receipt upload from multer / Cloudinary
    let receiptUrl = null;
    if (!isCashOnDelivery) {
      if (req.file) {
        receiptUrl = req.file.path || req.file.secure_url || `/uploads/receipts/${req.file.filename}`;
      } else if (req.body.gcashReceiptUrl) {
        receiptUrl = req.body.gcashReceiptUrl.trim();
      }
    }

    if (chosenPaymentMethod === 'gcash' && !receiptUrl) {
      return res.status(400).json({
        message: 'A GCash payment receipt is required to verify your payment.'
      });
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

    const cleanRef = chosenPaymentMethod === 'gcash' && gcashRefNumber ? gcashRefNumber.trim() : null;
    const cleanNotes = notes ? notes.trim() : null;
    const cleanCustomDims = customDimensions ? customDimensions.trim() : null;
    const initialPaymentStatus = isCashOnDelivery ? 'unpaid' : 'submitted';

    const [insertRes] = await pool.query(
      `INSERT INTO tag_orders (
        user_id, delivery_type, payment_method, target_email, recipient_name, contact_number, 
        shipping_address, tag_type, selected_size, custom_dimensions, quantity, 
        order_status, payment_status, gcash_receipt_url, gcash_ref_number, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [
        userId,
        chosenDeliveryType,
        chosenPaymentMethod,
        emailToUse,
        recipientName.trim(),
        contactNumber.trim(),
        addressToUse,
        chosenType,
        selectedSize || 'standard',
        cleanCustomDims,
        qty,
        initialPaymentStatus,
        receiptUrl,
        cleanRef,
        cleanNotes
      ]
    );

    return res.status(201).json({
      message: chosenDeliveryType === 'digital_email'
        ? 'Digital ResQTag delivery request submitted! Our team will verify your GCash receipt and dispatch your QR templates via email.'
        : isCashOnDelivery
          ? `Physical ResQTag order placed with Cash on Delivery! ${physicalPackage.label} · ${qty} tag set${qty === 1 ? '' : 's'} · ₱${physicalTotalPeso}. Please prepare the exact amount for our courier on the delivery date.`
          : `Physical ResQTag order (${physicalPackage.label} · ${qty} tag set${qty === 1 ? '' : 's'} · ₱${physicalTotalPeso}) placed successfully! Our team will verify your payment and start production.`,
      orderId: insertRes.insertId,
      deliveryType: chosenDeliveryType,
      paymentMethod: chosenPaymentMethod,
      targetEmail: emailToUse,
      tagType: chosenType,
      selectedSize: selectedSize || 'standard',
      packageLabel: physicalPackage ? physicalPackage.label : null,
      totalPeso: physicalTotalPeso,
      status: 'pending',
      paymentStatus: initialPaymentStatus
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
         order_id, delivery_type, payment_method, target_email, recipient_name, contact_number, 
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
      'SELECT order_id, payment_status, payment_method FROM tag_orders WHERE order_id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    if (rows[0].payment_method === 'cod') {
      return res.status(400).json({
        message: 'This order is Cash on Delivery, so no receipt is required. Payment is collected by our courier on delivery.'
      });
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
      paymentMethod,
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

    if (paymentMethod && paymentMethod !== 'all') {
      whereClauses.push('o.payment_method = ?');
      queryParams.push(paymentMethod);
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
         o.payment_method,
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
        SUM(CASE WHEN payment_status = 'submitted' THEN 1 ELSE 0 END) as submittedPaymentCount,
        SUM(CASE WHEN payment_method = 'cod' AND payment_status = 'unpaid' THEN 1 ELSE 0 END) as codPendingCount
      FROM tag_orders
    `);

    return res.json({
      orders,
      counts: statusCounts[0] || {
        pendingCount: 0,
        processingCount: 0,
        printedCount: 0,
        deliveredCount: 0,
        submittedPaymentCount: 0,
        codPendingCount: 0
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
      emailResult = await sendTagOrderEmail({
        recipientEmail: destinationEmail,
        recipientName,
        qrToken: order.qr_token,
        tagType: order.tag_type,
        selectedSize: order.selected_size,
        customDimensions: order.custom_dimensions,
        orderId: order.order_id,
        deliveryType: order.delivery_type,
        paymentMethod: order.payment_method,
        shippingAddress: order.shipping_address,
        contactNumber: order.contact_number
      });
    } catch (emailErr) {
      console.error('Brevo email dispatch failed:', emailErr);
      return res.status(500).json({
        message: `Payment confirmed, but failed to send email via Brevo: ${emailErr.message}`
      });
    }

    // 2. Update Database Order Status
    // COD is settled at the courier handover, so approving the order only releases it to production
    const isCod = order.payment_method === 'cod';
    const newOrderStatus = order.delivery_type === 'digital_email' ? 'delivered' : 'processing';
    const newPaymentStatus = isCod ? 'unpaid' : 'verified';

    await pool.query(
      `UPDATE tag_orders 
       SET payment_status = ?, 
           order_status = ?,
           admin_rejection_reason = NULL
       WHERE order_id = ?`,
      [newPaymentStatus, newOrderStatus, id]
    );

    const messageText = order.delivery_type === 'digital_email'
      ? `Payment verified for Order #${id}! QR kit has been delivered to ${destinationEmail}.`
      : isCod
        ? `Cash on Delivery Order #${id} approved! Physical tag moved to production and dispatch notice sent to ${destinationEmail}.`
        : `Payment verified for Order #${id}! Physical tag status updated to processing and notification sent to ${destinationEmail}.`;

    return res.json({
      message: messageText,
      paymentStatus: newPaymentStatus,
      orderStatus: newOrderStatus,
      emailResult
    });
  } catch (error) {
    console.error('confirmPaymentAndSendEmail error:', error);
    return res.status(500).json({ message: 'Failed to verify payment and dispatch email.', error: error.message });
  }
}

/**
 * Admin confirms the courier collected the cash for a Cash on Delivery order
 */
export async function collectCodPayment(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT order_id, payment_method, order_status FROM tag_orders WHERE order_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = rows[0];

    if (order.payment_method !== 'cod') {
      return res.status(400).json({ message: 'Only Cash on Delivery orders can be settled this way.' });
    }

    if (order.order_status === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be settled.' });
    }

    // Cash is only handed over at courier handover, so the order must have been
    // approved (processing) and produced/printed (printed) first. Without this
    // guard the button could settle a brand-new pending order, mark it delivered
    // and skip the dispatch notification email entirely.
    if (order.order_status !== 'printed') {
      return res.status(400).json({
        message: `Order #${id} must be approved and marked as Printed before the Cash on Delivery payment can be recorded.`
      });
    }

    await pool.query(
      `UPDATE tag_orders 
       SET payment_status = 'verified', 
           order_status = 'delivered',
           admin_rejection_reason = NULL
       WHERE order_id = ?`,
      [id]
    );

    return res.json({
      message: `Cash on Delivery payment collected for Order #${id}! Order marked as delivered.`,
      paymentStatus: 'verified',
      orderStatus: 'delivered'
    });
  } catch (error) {
    console.error('collectCodPayment error:', error);
    return res.status(500).json({ message: 'Failed to record the Cash on Delivery payment.', error: error.message });
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
         o.payment_method,
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
