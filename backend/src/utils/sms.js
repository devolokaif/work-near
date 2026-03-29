async function sendSMS(phone, message) {
  console.log("🔥 OTP DEBUG");
  console.log(`SMS to ${phone}: ${message}`);
}

module.exports = { sendSMS };