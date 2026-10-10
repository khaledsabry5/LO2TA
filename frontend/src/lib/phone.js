export const EGYPT_PHONE_REGEX = /^\+201[0125][0-9]{8}$/
export const STAFF_PASSWORD_REGEX = /^[a-zA-Z0-9]{4}$/

/**
 * Ensures the phone input begins with +20 and formats user typing gracefully.
 */
export function handleEgyptianPhoneChange(value) {
  if (!value) return '+20'
  let clean = value.replace(/[^\d+]/g, '')
  if (!clean.startsWith('+')) {
    if (clean.startsWith('0020')) clean = '+' + clean.slice(2)
    else if (clean.startsWith('20')) clean = '+' + clean
    else if (clean.startsWith('01')) clean = '+20' + clean.slice(1)
    else if (clean.startsWith('1')) clean = '+20' + clean
    else clean = '+20' + clean
  } else if (!clean.startsWith('+20')) {
    clean = '+20' + clean.replace(/^\+/, '')
  }
  // Enforce max length of +20 + 10 digits = 13 chars
  return clean.slice(0, 13)
}

/**
 * Validates Egyptian phone format: +201[0125]xxxxxxxx
 */
export function isValidEgyptianPhone(phone) {
  return EGYPT_PHONE_REGEX.test(phone)
}

/**
 * Validates that full name contains at least two names (first and family name).
 */
export function isValidTwoNames(name) {
  if (!name) return false
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 && parts.every((p) => p.length >= 1)
}
