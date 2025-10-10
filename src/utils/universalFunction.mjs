export const generateUsername = (email) => {
  const base = email.split('@')[0];
  const randomStr = Array.from({ length: 8 }, () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
  }).join('');
  return `${base}${randomStr}`;
};
