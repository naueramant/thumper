import React, { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  Download,
  Search,
  Code2,
  FolderTree,
  FileText,
  AlertCircle,
  WrapText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JsonHighlighter } from './JsonHighlighter'
import { JsonTreeViewer } from './JsonTreeViewer'
import { tryParseJson, isXml, formatXml, formatBytes } from './utils'

export interface PayloadViewerProps {
  payload: string
  contentType?: string
  maxHeight?: string
  defaultMode?: 'formatted' | 'tree' | 'raw'
  className?: string
  showToolbar?: boolean
}

export const PayloadViewer: React.FC<PayloadViewerProps> = ({
  payload,
  contentType,
  maxHeight = 'max-h-80',
  defaultMode = 'formatted',
  className = '',
  showToolbar = true,
}) => {
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [wordWrap, setWordWrap] = useState(true)

  // Detect format & parse
  const parseResult = useMemo(() => {
    return tryParseJson(payload)
  }, [payload])

  const isXmlFormat = useMemo(() => {
    return !parseResult.isJson && (isXml(payload) || contentType?.includes('xml'))
  }, [parseResult.isJson, payload, contentType])

  const formattedXml = useMemo(() => {
    return isXmlFormat ? formatXml(payload) : null
  }, [isXmlFormat, payload])

  // Initial mode setup
  const [mode, setMode] = useState<'formatted' | 'tree' | 'raw'>(() => {
    if (!parseResult.isJson && defaultMode === 'tree') return 'raw'
    return defaultMode
  })

  // Format type tag
  const formatTag = useMemo(() => {
    if (parseResult.isJson) return { label: 'JSON', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
    if (isXmlFormat) return { label: 'XML', color: 'bg-sky-500/10 text-sky-400 border-sky-500/30' }
    return { label: 'RAW TEXT', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' }
  }, [parseResult.isJson, isXmlFormat])

  const handleCopy = () => {
    const textToCopy =
      mode === 'formatted' && parseResult.isJson
        ? parseResult.formatted
        : isXmlFormat && formattedXml
        ? formattedXml
        : payload
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const ext = parseResult.isJson ? 'json' : isXmlFormat ? 'xml' : 'txt'
    const mime = parseResult.isJson
      ? 'application/json'
      : isXmlFormat
      ? 'application/xml'
      : 'text/plain'
    const blob = new Blob(
      [mode === 'formatted' && parseResult.isJson ? parseResult.formatted : payload],
      { type: mime }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payload_${Date.now()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden flex flex-col ${className}`}>
      {/* Top Bar / Toolbar */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${formatTag.color}`}
            >
              {formatTag.label}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {formatBytes(payload.length)}
            </span>
            {parseResult.error && (
              <span
                className="flex items-center gap-1 text-[11px] text-amber-500 font-mono"
                title={parseResult.error}
              >
                <AlertCircle className="w-3 h-3" /> Syntax Notice
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* View Mode Selector */}
            <div className="flex items-center bg-muted/70 dark:bg-black/40 rounded-lg p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setMode('formatted')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  mode === 'formatted'
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Formatted code view with syntax highlighting"
              >
                <Code2 className="w-3 h-3" /> Formatted
              </button>

              {parseResult.isJson && (
                <button
                  type="button"
                  onClick={() => setMode('tree')}
                  className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                    mode === 'tree'
                      ? 'bg-primary/20 text-primary font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Collapsible tree view"
                >
                  <FolderTree className="w-3 h-3" /> Tree
                </button>
              )}

              <button
                type="button"
                onClick={() => setMode('raw')}
                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  mode === 'raw'
                    ? 'bg-primary/20 text-primary font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Raw payload view"
              >
                <FileText className="w-3 h-3" /> Raw
              </button>
            </div>

            {/* Word wrap toggle for raw/formatted */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWordWrap(!wordWrap)}
              className={`h-7 px-2 text-[11px] ${
                wordWrap ? 'text-primary' : 'text-muted-foreground'
              }`}
              title="Toggle word wrap"
            >
              <WrapText className="w-3.5 h-3.5 mr-1" /> Wrap
            </Button>

            {/* Quick Search */}
            <div className="relative w-32 sm:w-40">
              <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Find in payload..."
                className="h-7 w-full text-[11px] pl-6 pr-2 bg-background dark:bg-black/30 border border-border rounded focus:border-primary focus:outline-none font-mono"
              />
            </div>

            {/* Copy Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-[11px] bg-background hover:bg-muted"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </>
              )}
            </Button>

            {/* Download Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Content Canvas */}
      <div
        className={`p-3 bg-slate-50/70 dark:bg-black/70 overflow-auto ${maxHeight} ${
          wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
        }`}
      >
        {mode === 'tree' && parseResult.isJson ? (
          <JsonTreeViewer data={parseResult.data} searchQuery={searchQuery} />
        ) : mode === 'formatted' && parseResult.isJson ? (
          <JsonHighlighter
            content={parseResult.formatted}
            searchQuery={searchQuery}
            showLineNumbers
          />
        ) : mode === 'formatted' && isXmlFormat && formattedXml ? (
          <pre className="text-xs font-mono text-sky-300 overflow-x-auto leading-relaxed">
            {formattedXml}
          </pre>
        ) : (
          <pre className="text-xs font-mono text-foreground overflow-x-auto leading-relaxed break-all">
            {payload}
          </pre>
        )}
      </div>
    </div>
  )
}
