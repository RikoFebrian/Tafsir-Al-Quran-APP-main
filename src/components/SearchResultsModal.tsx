"use client"

import { useState, useEffect } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { highlightText, renderHighlightedText } from "@/utils/highlightText"
import type { Ayat } from "@/services/QuranAPI"

interface SearchResult {
  ayat: Ayat
  surahNumber: number
  surahName: string
  matchCount: number
  matchType: "arab" | "latin" | "terjemahan" | "tafsir"
  searchLanguage: "arab" | "indonesia"
}

interface SearchResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: SearchResult[]
  searchTerm: string
  onSelectResult: (surahNumber: number, ayatId: number) => void
}

export default function SearchResultsModal({
  isOpen,
  onClose,
  results,
  searchTerm,
  onSelectResult,
}: SearchResultsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex(0)
  }, [results])

  if (!isOpen || results.length === 0) return null

  const currentResult = results[currentIndex]

  const handleNext = () => {
    if (currentIndex < results.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSelectResult = () => {
    onSelectResult(currentResult.surahNumber, currentResult.ayat.id)
    onClose()
  }

  const getMatchMessage = () => {
    if (currentResult.searchLanguage === "arab") {
      return `Kata ditemukan ${currentResult.matchCount} kali di ayat ini`
    } else {
      return `Kata ditemukan ${currentResult.matchCount} kali di terjemahan/tafsir`
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-background border-b p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Hasil Pencarian</h2>
            <p className="text-sm text-muted-foreground">
              Ditemukan {results.length} hasil untuk "{searchTerm}"
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="sticky top-0 bg-accent/50 p-4 rounded-none flex items-center justify-between border-b z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Result: {currentIndex + 1}</span>
            <span className="text-sm text-muted-foreground">of {results.length}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIndex === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIndex === results.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Result Details */}
          <div className="space-y-4">
            {/* Surah Info */}
            <div className="border-b pb-4">
              <p className="text-sm text-muted-foreground mb-2">Surah</p>
              <p className="text-lg font-semibold">{currentResult.surahName}</p>
              <p className="text-sm text-muted-foreground">Ayat {currentResult.ayat.id}</p>
            </div>

            {/* Arabic Text */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Teks Arab</p>
              <div className="bg-accent/30 p-4 rounded-lg text-right text-xl leading-relaxed font-serif">
                {renderHighlightedText(highlightText(currentResult.ayat.arab, searchTerm))}
              </div>
            </div>

            {/* Latin Text */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Transliterasi</p>
              <div className="bg-accent/30 p-4 rounded-lg text-sm leading-relaxed">
                {renderHighlightedText(highlightText(currentResult.ayat.latin, searchTerm))}
              </div>
            </div>

            {/* Translation */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Terjemahan</p>
              <div className="bg-accent/30 p-4 rounded-lg text-sm leading-relaxed">
                {renderHighlightedText(highlightText(currentResult.ayat.terjemahan, searchTerm))}
              </div>
            </div>

            {/* Tafsir Preview */}
            {currentResult.ayat.tafsir && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tafsir</p>
                <div className="bg-accent/30 p-4 rounded-lg text-sm leading-relaxed">
                  {renderHighlightedText(highlightText(currentResult.ayat.tafsir, searchTerm))}
                </div>
              </div>
            )}
          </div>

          {/* Match Count */}
          <div className="bg-primary/10 p-3 rounded-lg text-sm">
            <p className="text-primary font-medium">{getMatchMessage()}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-background border-t p-4 flex gap-2 justify-end flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button onClick={handleSelectResult} className="gap-2">
            Buka Ayat
          </Button>
        </div>
      </div>
    </div>
  )
}
