export function parseAmountToCents(amount) {
  if (typeof amount !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(amount)) {
    throw new TypeError('Enter an amount with no more than two decimal places.')
  }

  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

export function centsToAmount(cents) {
  if (typeof cents !== 'bigint') {
    throw new TypeError('Money amounts must be represented as integer cents.')
  }

  const isNegative = cents < 0n
  const absoluteCents = isNegative ? -cents : cents
  const whole = (absoluteCents / 100n).toString()
  const fraction = (absoluteCents % 100n).toString().padStart(2, '0')

  return `${isNegative ? '-' : ''}${whole}.${fraction}`
}

export function formatMoney(cents) {
  const amount = centsToAmount(cents)
  const isNegative = amount.startsWith('-')
  const unsignedAmount = isNegative ? amount.slice(1) : amount
  const [whole, fraction] = unsignedAmount.split('.')
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return `RM ${isNegative ? '-' : ''}${groupedWhole}.${fraction}`
}
