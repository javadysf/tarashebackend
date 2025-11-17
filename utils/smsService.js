const axios = require('axios');

class SMSService {
  constructor() {
    this.registerBodyId = process.env.SMS_REGISTER_BODYID || '389104'; // برای ثبت نام
    this.passwordResetBodyId = process.env.SMS_PASSWORD_RESET_BODYID || '390389'; // برای بازیابی رمز عبور
    this.apiUrl = process.env.SMS_API_URL || 'https://console.melipayamak.com/api/send/shared/7e5cf14be5734ff39c1739e8fae5c841';
  }

  /**
   * Generate a random 6-digit verification code
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send SMS verification code for registration
   * @param {string} phoneNumber - Phone number to send SMS to (e.g., 09123456789)
   * @param {string} code - Verification code to send
   * @returns {Promise<{success: boolean, recId?: string, error?: string}>}
   */
  async sendVerificationCode(phoneNumber, code) {
    return this.sendSMS(phoneNumber, [code], this.registerBodyId);
  }

  /**
   * Send SMS verification code for password reset
   * @param {string} phoneNumber - Phone number to send SMS to (e.g., 09123456789)
   * @param {string} code - Verification code to send
   * @returns {Promise<{success: boolean, recId?: string, error?: string}>}
   */
  async sendPasswordResetCode(phoneNumber, code) {
    return this.sendSMS(phoneNumber, [code], this.passwordResetBodyId);
  }

  /**
   * Internal method to send SMS using Melipayamak API
   * @param {string} phoneNumber - Phone number to send SMS to
   * @param {Array} args - Arguments for template variables
   * @param {string} bodyId - Template body ID
   * @returns {Promise<{success: boolean, recId?: string, error?: string}>}
   */
  async sendSMS(phoneNumber, args, bodyId) {
    try {
      console.log('=== SMS Configuration Check ===');
      console.log('API URL:', this.apiUrl);
      console.log('BodyId:', bodyId);
      console.log('Phone:', phoneNumber);
      console.log('Args:', args);
      console.log('===============================');
      
      const data = {
        bodyId: parseInt(bodyId),
        to: phoneNumber,
        args: args
      };

      console.log('SMS Request data:', JSON.stringify(data));
      
      const response = await axios.post(this.apiUrl, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });

      console.log('SMS Response status:', response.status);
      console.log('SMS Response data:', response.data);

      const result = response.data;
      
      // Check if successful (recId exists and is positive)
      if (result.recId && result.recId > 0) {
        console.log('SMS sent successfully, recId:', result.recId);
        return {
          success: true,
          recId: result.recId.toString()
        };
      }

      // Handle error - Melipayamak API returns different error formats
      let errorMessage = 'خطا در ارسال پیامک';
      
      if (result.status) {
        errorMessage = result.status;
      } else if (result.message) {
        errorMessage = result.message;
      } else if (result.error) {
        errorMessage = result.error;
      } else if (typeof result === 'string') {
        errorMessage = result;
      }
      
      console.error('SMS error:', errorMessage);
      console.error('Full response:', JSON.stringify(result, null, 2));

      return {
        success: false,
        error: errorMessage,
        errorCode: 'SMS_ERROR',
        response: result
      };
    } catch (error) {
      console.error('SMS Service Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      // Extract error message from different possible locations
      let errorMessage = 'خطا در ارتباط با سرویس پیامک';
      
      if (error.response?.data) {
        const data = error.response.data;
        if (data.status) {
          errorMessage = data.status;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode: error.code || 'NETWORK_ERROR',
        httpStatus: error.response?.status
      };
    }
  }
}

module.exports = new SMSService();