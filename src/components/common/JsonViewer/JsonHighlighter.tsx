import React from 'react'

interface JsonHighlighterProps {
  content: string
  searchQuery?: string
  showLineNumbers?: boolean
}

// Tokenizes a line of JSON for syntax highlighting
function highlightJsonLine(line: string, searchQuery?: string): React.ReactNode[] {
  // Regex to match JSON components:
  // 1. Keys: "something":
  // 2. Strings: "something"
  // 3. Numbers: 123 or -123.45
  // 4. Booleans: true | false
  // 5. Null: null
  // 6. Symbols: { } [ ] , :
  const tokenRegex = /("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"\s*:)|("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([{}[\],:])|([^"0-9a-zA-Z\s{}[\],:]+)/g

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const highlightMatch = (text: string, className: string, key: string) => {
    if (!searchQuery || !searchQuery.trim()) {
      return (
        <span key={key} className={className}>
          {text}
        </span>
      )
    }

    // If there is a search query, highlight matching sub-strings
    const q = searchQuery.toLowerCase()
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))
    return (
      <span key={key} className={className}>
        {parts.map((part, pIdx) => {
          if (part.toLowerCase() === q) {
            return (
              <mark
                key={pIdx}
                className="bg-yellow-400/30 text-yellow-200 border-b border-yellow-400 font-bold px-0.5 rounded"
              >
                {part}
              </mark>
            )
          }
          return part
        })}
      </span>
    )
  }

  while ((match = tokenRegex.exec(line)) !== null) {
    // Intervening whitespace / plain text
    if (match.index > lastIndex) {
      const plain = line.substring(lastIndex, match.index)
      nodes.push(highlightMatch(plain, 'text-foreground', `plain-${lastIndex}`))
    }

    const [fullMatch, isKey, isString, isNumber, isBool, isNull, isSymbol] = match
    const k = `token-${match.index}`

    if (isKey) {
      // Key with colon
      const colonIdx = fullMatch.lastIndexOf(':')
      const keyName = fullMatch.substring(0, colonIdx)
      nodes.push(highlightMatch(keyName, 'text-sky-700 dark:text-sky-400 font-semibold', `${k}-key`))
      nodes.push(<span key={`${k}-colon`} className="text-muted-foreground">:</span>)
    } else if (isString) {
      nodes.push(highlightMatch(fullMatch, 'text-emerald-700 dark:text-emerald-400', k))
    } else if (isNumber) {
      nodes.push(highlightMatch(fullMatch, 'text-amber-700 dark:text-amber-400 font-mono', k))
    } else if (isBool) {
      nodes.push(highlightMatch(fullMatch, 'text-purple-700 dark:text-purple-400 font-bold', k))
    } else if (isNull) {
      nodes.push(highlightMatch(fullMatch, 'text-rose-700 dark:text-rose-400 italic', k))
    } else if (isSymbol) {
      nodes.push(<span key={k} className="text-muted-foreground">{fullMatch}</span>)
    } else {
      nodes.push(highlightMatch(fullMatch, 'text-foreground', k))
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < line.length) {
    const remaining = line.substring(lastIndex)
    nodes.push(highlightMatch(remaining, 'text-foreground', `plain-${lastIndex}`))
  }

  return nodes
}

export const JsonHighlighter: React.FC<JsonHighlighterProps> = ({
  content,
  searchQuery,
  showLineNumbers = true,
}) => {
  const lines = React.useMemo(() => content.split('\n'), [content])

  return (
    <div className="font-mono text-xs leading-relaxed select-text">
      {lines.map((line, idx) => (
        <div key={idx} className="flex hover:bg-muted/15 px-2 py-0.5 rounded group">
          {showLineNumbers && (
            <span className="w-9 pr-3 text-right text-[11px] text-muted-foreground/40 select-none group-hover:text-muted-foreground font-mono flex-shrink-0">
              {idx + 1}
            </span>
          )}
          <span className="whitespace-pre flex-1 break-all overflow-x-auto">
            {highlightJsonLine(line, searchQuery)}
          </span>
        </div>
      ))}
    </div>
  )
}
