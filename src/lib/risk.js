export function riskBand(score) {
  if (score < 25) return 'good'
  if (score < 50) return 'warning'
  if (score < 75) return 'serious'
  return 'critical'
}
