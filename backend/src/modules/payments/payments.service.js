// ============================================================
// Payments Module — Razorpay Integration
// (src/modules/payments/payments.service.js)
// ============================================================

const Razorpay = require('razorpay');
const crypto = require('crypto');
const { db } = require('../../config/database');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const PLATFORM_FEE_PCT = 0.12;  // 12% platform fee
const GST_PCT = 0.18;            // 18% GST on platform fee

const paymentsService = {
  // Step 1: Create a Razorpay order
  async createOrder({ bookingId, userId }) {
    const booking = await db.query(`
      SELECT b.*, j.title, j.budget_max, u.phone as employer_phone
      FROM bookings b
      JOIN jobs j ON j.id = b.job_id
      JOIN users u ON u.id = b.employer_id
      WHERE b.id = $1 AND b.employer_id = $2 AND b.status = 'completed'
    `, [bookingId, userId]).then(r => r.rows[0]);

    if (!booking) throw new AppError('Booking not found or not completed', 404);

    const existingPayment = await db.query(
      `SELECT id, status FROM payments WHERE booking_id = $1 AND status = 'completed'`,
      [bookingId]
    ).then(r => r.rows[0]);
    if (existingPayment) throw new AppError('Payment already completed', 400);

    const amount = booking.proposed_rate || booking.budget_max;
    if (!amount) throw new AppError('No amount agreed for this booking', 400);

    const platformFee = parseFloat((amount * PLATFORM_FEE_PCT).toFixed(2));
    const gst = parseFloat((platformFee * GST_PCT).toFixed(2));
    const totalAmount = parseFloat((amount + platformFee + gst).toFixed(2));
    const workerPayout = parseFloat((amount).toFixed(2));

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),  // paise
      currency: 'INR',
      receipt: `wn_${bookingId.slice(0, 8)}`,
      notes: { booking_id: bookingId, platform: 'WorkNear' }
    });

    // Save payment record
    const payment = await db.query(`
      INSERT INTO payments (
        booking_id, payer_id, payee_id, amount, platform_fee, gst,
        worker_payout, gateway, gateway_order_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'razorpay', $8, 'pending')
      RETURNING id, gateway_order_id, amount
    `, [
      bookingId, userId, booking.worker_id,
      totalAmount, platformFee, gst, workerPayout, order.id
    ]).then(r => r.rows[0]);

    return {
      payment_id: payment.id,
      order_id: order.id,
      amount: totalAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      breakdown: {
        base_amount: amount,
        platform_fee: platformFee,
        gst,
        total: totalAmount
      }
    };
  },

  // Step 2: Verify Razorpay payment signature
  async verifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, userId }) {
    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      logger.warn(`Invalid payment signature for order ${razorpay_order_id}`);
      throw new AppError('Invalid payment signature', 400);
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Update payment status
      const payment = await client.query(`
        UPDATE payments
        SET status = 'completed', gateway_payment_id = $1, gateway_signature = $2, updated_at = NOW()
        WHERE gateway_order_id = $3 AND payer_id = $4
        RETURNING *
      `, [razorpay_payment_id, razorpay_signature, razorpay_order_id, userId]).then(r => r.rows[0]);

      if (!payment) throw new AppError('Payment record not found', 404);

      // Credit worker wallet
      await client.query(`
        UPDATE wallets SET balance = balance + $1, updated_at = NOW()
        WHERE user_id = $2
      `, [payment.worker_payout, payment.payee_id]);

      // Log wallet transaction
      await client.query(`
        INSERT INTO wallet_transactions (wallet_id, amount, type, reference, note)
        SELECT id, $1, 'credit', $2, 'Job payment received'
        FROM wallets WHERE user_id = $3
      `, [payment.worker_payout, payment.id, payment.payee_id]);

      // Update user stats
      await client.query(
        'UPDATE users SET total_spent = total_spent + $1 WHERE id = $2',
        [payment.amount, payment.payer_id]
      );
      await client.query(
        'UPDATE users SET total_earnings = total_earnings + $1 WHERE id = $2',
        [payment.worker_payout, payment.payee_id]
      );

      await client.query('COMMIT');
      logger.info(`Payment completed: ${payment.id}, Worker credited: ₹${payment.worker_payout}`);

      return { success: true, payment_id: payment.id, message: 'Payment successful' };
    } catch (err) {
      await client.query('ROLLBACK');
      // Mark payment as failed
      await db.query(
        `UPDATE payments SET status = 'failed', failure_reason = $1 WHERE gateway_order_id = $2`,
        [err.message, razorpay_order_id]
      ).catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },

  // Razorpay webhook (for server-to-server confirmation)
  async handleWebhook(body, signature) {
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');

    if (expectedSig !== signature) throw new AppError('Invalid webhook signature', 400);

    const { event, payload } = body;
    logger.info(`Razorpay webhook: ${event}`);

    if (event === 'payment.captured') {
      const { order_id } = payload.payment.entity;
      await db.query(
        `UPDATE payments SET status = 'completed' WHERE gateway_order_id = $1 AND status = 'processing'`,
        [order_id]
      );
    }
  },

  // Request a payout (worker withdraws to bank)
  async requestPayout({ userId, amount }) {
    const wallet = await db.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    ).then(r => r.rows[0]);

    if (!wallet) throw new AppError('Wallet not found', 404);
    if (wallet.balance < amount) throw new AppError('Insufficient wallet balance', 400);
    if (amount < 100) throw new AppError('Minimum payout is ₹100', 400);

    const workerProfile = await db.query(
      'SELECT upi_id, bank_account_number, bank_ifsc FROM worker_profiles WHERE user_id = $1',
      [userId]
    ).then(r => r.rows[0]);

    if (!workerProfile?.upi_id && !workerProfile?.bank_account_number) {
      throw new AppError('Please add bank/UPI details before withdrawing', 400);
    }

    // Deduct from wallet
    await db.query(
      'UPDATE wallets SET balance = balance - $1, locked = locked + $1 WHERE user_id = $2',
      [amount, userId]
    );

    // In production: initiate Razorpay payout via their Payout API
    // For now, log the payout request
    logger.info(`Payout request: User ${userId}, Amount: ₹${amount}`);

    return {
      message: 'Payout request submitted. Funds will be credited within 24 hours.',
      amount,
      upi_id: workerProfile.upi_id
    };
  },

  async getPaymentHistory({ userId, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const payments = await db.query(`
      SELECT p.*, 
        payer.full_name as payer_name,
        payee.full_name as payee_name,
        b.id as booking_id,
        j.title as job_title
      FROM payments p
      JOIN users payer ON payer.id = p.payer_id
      JOIN users payee ON payee.id = p.payee_id
      JOIN bookings b ON b.id = p.booking_id
      JOIN jobs j ON j.id = b.job_id
      WHERE p.payer_id = $1 OR p.payee_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]).then(r => r.rows);

    return payments;
  }
};

module.exports = paymentsService;

/* ─────────────────────────────────────────────────────────── */
