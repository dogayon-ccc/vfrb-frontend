// Philippine mobile numbers: 09XXXXXXXXX or +639XXXXXXXXX; spaces, dashes, dots and brackets are ignored. Mirrors App\Rules\PhMobile.
export const PH_PHONE_HINT = '09XX XXX XXXX or +63 9XX XXX XXXX';
export const compactPhone = (v) => String(v ?? '').replace(/[\s\-().]/g, '');
export const isPhMobile = (v) => /^(09\d{9}|\+639\d{9})$/.test(compactPhone(v));
export const phPhoneError = (v, { required = false } = {}) =>
  !compactPhone(v) ? (required ? 'Enter a contact number.' : '') : isPhMobile(v) ? '' : `Use a PH mobile number: ${PH_PHONE_HINT}.`;
