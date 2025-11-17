const axios = require('axios');
const logger = require('./logger');

class PaymentGateway {
  constructor() {
    this.gateway = process.env.PAYMENT_GATEWAY || 'zarinpal';
    this.merchantId = process.env.ZARINPAL_MERCHANT_ID;
    this.sandbox = process.env.ZARINPAL_SANDBOX === 'true';
    this.baseUrl = this.sandbox 
      ? 'https://sandbox.zarinpal.com/pg/v4/payment'
      : 'https://api.zarinpal.com/pg/v4/payment';
  }

  /**
   * Create payment request
   * @param {Object} orderData - Order information
   * @param {string} orderData.orderId - Order ID
   * @param {number} orderData.amount - Amount in Toman
   * @param {string} orderData.description - Payment description
   * @param {string} orderData.callbackUrl - Callback URL after payment
   * @param {Object} orderData.metadata - Additional metadata
   * @returns {Promise<Object>} Payment request result
   */
  async createPaymentRequest(orderData) {
    try {
      const { orderId, amount, description, callbackUrl, metadata } = orderData;

      if (!this.merchantId) {
        throw new Error('Payment gateway merchant ID is not configured');
      }

      const requestData = {
        merchant_id: this.merchantId,
        amount: amount, // Amount in Toman
        description: description || `پرداخت سفارش ${orderId}`,
        callback_url: callbackUrl,
        metadata: {
          order_id: orderId,
          ...metadata
        }
      };

      logger.info('Creating payment request', { orderId, amount, gateway: this.gateway });

      const response = await axios.post(`${this.baseUrl}/request.json`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.data && response.data.data.code === 100) {
        const authority = response.data.data.authority;
        const paymentUrl = this.sandbox
          ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
          : `https://www.zarinpal.com/pg/StartPay/${authority}`;

        logger.info('Payment request created successfully', { orderId, authority });

        return {
          success: true,
          authority,
          paymentUrl,
          gateway: this.gateway
        };
      } else {
        const errorMessage = response.data.errors?.message || 'Payment request failed';
        logger.error('Payment request failed', { 
          orderId, 
          error: errorMessage,
          response: response.data 
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      logger.error('Payment request error', { 
        error: error.message,
        orderId: orderData.orderId 
      });
      throw error;
    }
  }

  /**
   * Verify payment
   * @param {string} authority - Payment authority from callback
   * @param {number} amount - Original amount in Toman
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(authority, amount) {
    try {
      if (!this.merchantId) {
        throw new Error('Payment gateway merchant ID is not configured');
      }

      const requestData = {
        merchant_id: this.merchantId,
        authority,
        amount
      };

      logger.info('Verifying payment', { authority, amount, gateway: this.gateway });

      const response = await axios.post(`${this.baseUrl}/verify.json`, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.data && response.data.data.code === 100) {
        logger.info('Payment verified successfully', { 
          authority,
          refId: response.data.data.ref_id 
        });

        return {
          success: true,
          refId: response.data.data.ref_id,
          cardHash: response.data.data.card_hash,
          cardPan: response.data.data.card_pan,
          fee: response.data.data.fee,
          feeType: response.data.data.fee_type
        };
      } else {
        const errorCode = response.data.data?.code;
        const errorMessage = this.getErrorMessage(errorCode) || 'Payment verification failed';
        
        logger.error('Payment verification failed', { 
          authority,
          errorCode,
          error: errorMessage,
          response: response.data 
        });
        
        return {
          success: false,
          errorCode,
          errorMessage
        };
      }
    } catch (error) {
      logger.error('Payment verification error', { 
        error: error.message,
        authority 
      });
      throw error;
    }
  }

  /**
   * Get error message by code
   * @param {number} code - Error code
   * @returns {string} Error message
   */
  getErrorMessage(code) {
    const errorMessages = {
      '-9': 'خطای اعتبار سنجی',
      '-10': 'IP یا مرچنت کد پذیرنده صحیح نیست',
      '-11': 'مرچنت کد پذیرنده فعال نیست',
      '-12': 'تلاش بیش از حد در یک بازه زمانی کوتاه',
      '-15': 'ترمینال شما به حالت تعلیق در آمده است',
      '-16': 'سطح تایید پذیرنده پایین تر از سطح نقره ای است',
      '101': 'عملیات پرداخت موفق بوده و قبلا PaymentVerification تراکنش انجام شده است'
    };

    return errorMessages[code] || null;
  }

  /**
   * Refund payment (if supported by gateway)
   * @param {string} refId - Reference ID from successful payment
   * @param {number} amount - Amount to refund in Toman
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(refId, amount) {
    // Note: Zarinpal doesn't support direct refund via API
    // This would need to be done manually through their panel
    logger.warn('Refund not supported via API', { refId, amount });
    throw new Error('Refund must be processed manually through payment gateway panel');
  }
}

module.exports = new PaymentGateway();

