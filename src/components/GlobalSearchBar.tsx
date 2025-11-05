"use client"

import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Search, Loader2 } from "lucide-react"
import { parseSurahAndAyat } from "@/utils/surah-parser"
import type { SurahListItem } from "@/services/QuranAPI"

interface GlobalSearchBarProps {
  surahList: SurahListItem[]
}

export default function GlobalSearchBar({ surahList }: GlobalSearchBarProps) {
  const [searchText, setSearchText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [detectedMode, setDetectedMode] = useState<string>("")
  const [isSearching, setIsSearching] = useState(false)
  const recognitionRef = useRef<any>(null)
  const navigate = useNavigate()

  const detectInputType = (text: string): boolean => {
    const wordCount = text.trim().split(/\s+/).length
    const hasArabicDiacritics = /[\u064B-\u065F]/.test(text)
    const hasLongPhrase = wordCount > 5
    const hasArabicText = /[\u0600-\u06FF]/.test(text)

    return (hasLongPhrase && hasArabicText) || hasArabicDiacritics
  }

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {
        console.log("Recognition already stopped")
      }
      recognitionRef.current = null
    }
    setIsListening(false)
    setDetectedMode("")
  }

  const performSearch = async (term: string) => {
    if (!term.trim()) {
      alert("⚠️ Masukkan kata kunci pencarian")
      return
    }

    setIsSearching(true)

    try {
      const parsedResult = parseSurahAndAyat(term)

      if (parsedResult) {
        const { surahNumber, ayatNumber } = parsedResult

        if (surahNumber < 1 || surahNumber > 114) {
          alert("❌ Nomor Surah harus antara 1-114")
          setIsSearching(false)
          return
        }

        if (ayatNumber < 1 || ayatNumber > 286) {
          alert("❌ Nomor Ayat harus antara 1-286")
          setIsSearching(false)
          return
        }

        // Navigate to the Surah and set target Ayat
        sessionStorage.setItem("targetAyat", ayatNumber.toString())
        navigate(`/surah/${surahNumber}`)
        setSearchText("")
        setIsSearching(false)
        return
      }

      const verseNumberMatch = term.match(/^(\d+)[:\s]+(\d+)$/)
      const singleVerseMatch = term.match(/^(\d+)$/)

      if (verseNumberMatch) {
        const surahNum = Number.parseInt(verseNumberMatch[1])
        const ayatNum = Number.parseInt(verseNumberMatch[2])

        if (surahNum < 1 || surahNum > 114) {
          alert("❌ Nomor Surah harus antara 1-114")
          setIsSearching(false)
          return
        }

        if (ayatNum < 1 || ayatNum > 286) {
          alert("❌ Nomor Ayat harus antara 1-286")
          setIsSearching(false)
          return
        }

        sessionStorage.setItem("targetAyat", ayatNum.toString())
        navigate(`/surah/${surahNum}`)
        setSearchText("")
        setIsSearching(false)
        return
      }

      if (singleVerseMatch) {
        const ayatNum = Number.parseInt(singleVerseMatch[1])

        if (ayatNum < 1 || ayatNum > 286) {
          alert("❌ Nomor Ayat harus antara 1-286")
          setIsSearching(false)
          return
        }

        sessionStorage.setItem("targetAyat", ayatNum.toString())
        navigate(`/surah/1`)
        setSearchText("")
        setIsSearching(false)
        return
      }

      // The search will be performed in the Surah page
      sessionStorage.setItem("globalSearchTerm", term)
      navigate(`/surah/1`)
      setSearchText("")
    } catch (error) {
      console.error("Search error:", error)
      alert("❌ Terjadi kesalahan saat mencari")
    } finally {
      setIsSearching(false)
    }
  }

  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("❌ Browser Anda tidak mendukung Speech Recognition.\nCoba gunakan Chrome/Edge.")
      return
    }

    stopRecognition()

    setIsListening(true)
    setDetectedMode("🎤 Mendengarkan...")

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.lang = "ar-SA"

    let hasResult = false

    recognition.onstart = () => {
      console.log("✅ Speech recognition started with Arabic")
      setDetectedMode("🎤 Sedang mendengarkan dalam bahasa Arab...")
    }

    recognition.onresult = (event: any) => {
      hasResult = true
      const transcript = event.results[0][0].transcript

      console.log(`🎧 Hasil: "${transcript}"`)
      setSearchText(transcript)

      const isRecitation = detectInputType(transcript)

      if (isRecitation) {
        setDetectedMode("🎵 Terdeteksi: Lantunan Ayat")
      } else {
        setDetectedMode("🔍 Terdeteksi: Kata Kunci")
      }

      setTimeout(() => {
        performSearch(transcript)
        setDetectedMode("")
        setIsListening(false)
      }, 1000)
    }

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error)
      alert("❌ Pencarian suara gagal. Coba lagi.")
      stopRecognition()
    }

    recognition.onend = () => {
      console.log("🛑 Speech recognition ended")
      setIsListening(false)
    }

    try {
      recognition.start()
    } catch (e) {
      console.error("Failed to start recognition:", e)
      alert("❌ Gagal memulai speech recognition.")
      stopRecognition()
    }
  }

  const handleVoiceClick = () => {
    if (isListening) {
      stopRecognition()
      return
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          startVoiceRecognition()
        })
        .catch((err) => {
          console.error("Microphone access denied:", err)
          alert("❌ Akses mikrofon ditolak.")
        })
    } else {
      startVoiceRecognition()
    }
  }

  return (
    <div className="space-y-3">
      {/* Main Global Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          performSearch(searchText)
        }}
        className="flex gap-2 max-w-4xl mx-auto"
      >
        <Input
          type="text"
          placeholder="Cari ayat, arti, tafsir di seluruh Al-Qur'an (misal: Al-fatihah:7, 2:255, atau kata kunci)..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1"
          dir="auto"
          disabled={isSearching}
        />
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          onClick={handleVoiceClick}
          className="px-3"
          disabled={isSearching}
          title="Klik untuk mulai berbicara"
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button type="submit" variant="secondary" disabled={isSearching}>
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Mencari...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Cari
            </>
          )}
        </Button>
      </form>

      {/* Help Text */}


      {/* Status Messages */}
      {isListening && (
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-2 bg-primary/10 p-4 rounded-lg border-2 border-primary max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-primary font-medium">{detectedMode}</p>
          </div>
          <p className="text-xs text-muted-foreground">Ucapkan dalam bahasa Arab atau bacakan ayat Al-Qur'an</p>
          <Button variant="outline" size="sm" onClick={stopRecognition} className="mt-2 bg-transparent">
            Batal
          </Button>
        </div>
      )}

      {detectedMode && !isListening && (
        <div className="text-center animate-in fade-in bg-green-500/10 p-3 rounded-md border border-green-500/20 max-w-4xl mx-auto">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">{detectedMode}</p>
        </div>
      )}
    </div>
  )
}
