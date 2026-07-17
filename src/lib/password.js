export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /[0-9]/.test(v) },
  { key: 'special', label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export function passwordChecks(value) {
  return PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(value) }))
}

export function isPasswordValid(value) {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}
