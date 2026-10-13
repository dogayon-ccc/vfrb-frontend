// Philippine mobile numbers: 09XXXXXXXXX or +639XXXXXXXXX; spaces, dashes, dots and brackets are ignored. Mirrors App\Rules\PhMobile.
export const PH_PHONE_HINT = '09XX XXX XXXX or +63 9XX XXX XXXX';
export const compactPhone = (v) => String(v ?? '').replace(/[\s\-().]/g, '');
export const isPhMobile = (v) => /^(09\d{9}|\+639\d{9})$/.test(compactPhone(v));
export const phPhoneError = (v, { required = false } = {}) =>
  !compactPhone(v) ? (required ? 'Enter a contact number.' : '') : isPhMobile(v) ? '' : `Use a PH mobile number: ${PH_PHONE_HINT}.`;

// "0917 123 4567" / "+63 917 123 4567" for display; anything that is not a PH mobile number is shown as stored.
export const formatPhMobile = (v) => {
  const c = compactPhone(v);
  if (/^09\d{9}$/.test(c)) return `${c.slice(0, 4)} ${c.slice(4, 7)} ${c.slice(7)}`;
  if (/^\+639\d{9}$/.test(c)) return `+63 ${c.slice(3, 6)} ${c.slice(6, 9)} ${c.slice(9)}`;
  return String(v ?? '');
};

// No SMS gateway exists: nothing is ever sent. The line says only what is true about the number on the account.
export const SMS_NOT_ACTIVE = 'Text alerts are not active yet; your number is saved.';
export const smsStatusLine = (stored, { noNumber = 'Text alerts are not active yet. Add a mobile number to have it ready.' } = {}) =>
  isPhMobile(stored) ? SMS_NOT_ACTIVE : noNumber;
