// New-password strength rules, shared by the customer and admin password panels. Mirrors the API rule
// (Laravel PasswordRule::min(8)->mixedCase()->numbers()->symbols(), UserController::changeOwnPassword).
export const PASSWORD_RULE_TEXT = 'Use 8+ characters with upper and lower case, a number and a symbol.';
const checks = p => [p.length >= 8, /[A-Z]/.test(p) && /[a-z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)];
export const passwordOk = p => checks(String(p ?? '')).every(Boolean);
// 1..4 for the strength meter (at least 1 so an empty bar still shows one segment).
export const passwordLevel = p => checks(String(p ?? '')).filter(Boolean).length || 1;
export const levelLabel = level => (level === 1 ? 'Weak' : level === 2 ? 'Fair' : 'Strong');
