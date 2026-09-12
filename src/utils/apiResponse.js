/**
 * Standard API Response Helper
 */
function sendSuccess(res, data = null, message = 'Operasi berhasil', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

module.exports = {
  sendSuccess,
};
