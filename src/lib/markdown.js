// Minimal, intentionally non-general markdown-ish renderer for authored
// training content only. Not a parser — do not feed it untrusted input.
export function renderContentBlocks(md) {
  return md.split(/\n{2,}/).map((block, i) => {
    const line = block.trim()
    if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3), key: i }
    if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2), key: i }
    if (line.split('\n').every((l) => l.trim().startsWith('- ') || l.trim() === ''))
      return { type: 'ul', items: line.split('\n').filter(Boolean).map((l) => l.trim().slice(2)), key: i }
    if (/^\d+\.\s/.test(line))
      return { type: 'ol', items: line.split('\n').filter(Boolean).map((l) => l.replace(/^\d+\.\s/, '')), key: i }
    return { type: 'p', text: line, key: i }
  })
}

// Splits "text with **bold** spans" into an array of strings and
// { bold: string } markers, for a caller to map into <strong> elements.
export function splitBold(text) {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) => (i % 2 === 1 ? { bold: part } : part))
}
