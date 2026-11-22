function accountEmail(user) {
  if (!user || String(user.uid || '').trim().toLowerCase() === 'anonymous' || user.isAnonymous === true) {
    throw new Error('Chưa đăng nhập Samsung. Đăng nhập trong Chrome rồi chạy lại; chưa gửi thông tin checkout.');
  }
  for (const value of [user.email, user.displayUid, user.uid]) {
    if (typeof value !== 'string') continue;
    const email = value.trim();
    if (!email.includes('*') && /^[A-Za-z0-9.!#$%&'+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email)) return email;
  }
  throw new Error('API tài khoản hiện tại không trả email hợp lệ. Dừng checkout để tránh dùng nhầm email.');
}
module.exports = { accountEmail };
