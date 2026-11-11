const { z } = require('zod');
const RESERVED = ['messages', 'notifications', 'explore', 'reels', 'create', 'post', 'tag', 'api', 'uploads', 'saved', 'accounts', 'settings', 'legal', 'login', 'admin'];
const COMMON = new Set(['password', 'password1', '12345678', '123456789', '1234567890', 'qwerty123', 'iloveyou', 'abc12345', 'password123', '11111111', 'qwertyuiop', 'admin123', 'welcome1', 'letmein1', 'passw0rd', '00000000', 'instagram', 'instagram1']);

const username = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9._]{3,30}$/, 'Usernames can only use letters, numbers, periods and underscores (3-30 characters).')
  .refine((u) => !RESERVED.includes(u), "This username isn't available.");
const password = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password is too long (max 72 characters).')
  .refine((p) => !COMMON.has(p.toLowerCase()), 'That password is too common. Please choose a stronger one.');
const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);

const birthday = z.object({ year: z.coerce.number().int(), month: z.coerce.number().int().min(1).max(12), day: z.coerce.number().int().min(1).max(31) })
  .superRefine((b, ctx) => {
    const d = new Date(Date.UTC(b.year, b.month - 1, b.day));
    if (d.getUTCMonth() !== b.month - 1 || b.year < 1900 || d > new Date()) return ctx.addIssue({ code: 'custom', message: 'Enter a valid birthday.' });
    const now = new Date();
    let age = now.getUTCFullYear() - b.year;
    if (now.getUTCMonth() + 1 < b.month || (now.getUTCMonth() + 1 === b.month && now.getUTCDate() < b.day)) age--;
    if (age < 13) ctx.addIssue({ code: 'custom', message: 'You must be at least 13 years old to sign up.' });
  });

const signup = z.object({ email, password, username, birthday, fullName: z.string().trim().max(60).default('') });
// Sends the first validation message back in a consistent shape
const fail = (res, error) => { const i = error.issues[0]; return res.status(400).json({ msg: i.message, field: i.path[0] || undefined }); };
module.exports = { z, RESERVED, username, password, email, signup, fail };
