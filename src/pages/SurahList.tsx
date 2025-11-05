"use client"

import { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { fetchSurahList, type SurahListItem } from "@/services/QuranAPI"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, BookOpen, Sparkles, Mic, MicOff, Loader2 } from "lucide-react"
import { parseSurahAndAyat } from "@/utils/surah-parser"

export default function SurahList() {
  const [surahList, setSurahList] = useState<SurahListItem[]>([])
  const [filteredList, setFilteredList] = useState<SurahListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [detectedMode, setDetectedMode] = useState<string>("")
  const recognitionRef = useRef<any>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadSurahList = async () => {
      try {
        const data = await fetchSurahList()
        setSurahList(data)
        setFilteredList(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadSurahList()
  }, [])

  useEffect(() => {
    if (searchTerm === "") {
      setFilteredList(surahList)
    } else {
      const filtered = surahList.filter((surah) => {
        const term = searchTerm.toLowerCase()
        return (
          surah.name.transliteration.id.toLowerCase().includes(term) ||
          surah.name.translation.id.toLowerCase().includes(term) ||
          surah.number.toString().includes(term)
        )
      })
      setFilteredList(filtered)
    }
  }, [searchTerm, surahList])

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

        sessionStorage.setItem("targetAyat", ayatNumber.toString())
        navigate(`/surah/${surahNumber}`)
        setSearchTerm("")
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
        setSearchTerm("")
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
        setSearchTerm("")
        setIsSearching(false)
        return
      }

      sessionStorage.setItem("globalSearchTerm", term)
      navigate(`/surah/1`)
      setSearchTerm("")
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
      setSearchTerm(transcript)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground text-lg">Memuat daftar surah...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-5xl sm:text-6xl font-serif font-bold text-foreground">القرآن الكريم</h1>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif text-primary mb-3">Daftar Surah Al-Qur'an</h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Jelajahi 114 Surah dengan Tafsir Mendalam & Pencarian Ayat Cerdas
          </p>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="h-1 w-12 bg-primary rounded-full"></div>
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="h-1 w-12 bg-primary rounded-full"></div>
          </div>
        </header>

        <div className="mb-12 max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              performSearch(searchTerm)
            }}
            className="space-y-3"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative bg-card rounded-lg border border-border p-1 flex gap-2">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cari ayat, surah, arti, tafsir (misal: Al-fatihah:7, 2:255, atau kata kunci)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-3 bg-transparent border-0 text-base focus:outline-none focus:ring-0 flex-1"
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
                <Button type="submit" variant="secondary" disabled={isSearching} className="px-4">
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
              </div>
            </div>

            {isListening && (
              <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-2 bg-primary/10 p-4 rounded-lg border-2 border-primary">
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
              <div className="text-center animate-in fade-in bg-green-500/10 p-3 rounded-md border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">{detectedMode}</p>
              </div>
            )}
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredList.map((surah) => (
            <Card
              key={surah.number}
              className="cursor-pointer group overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/50 hover:-translate-y-1"
              onClick={() => navigate(`/surah/${surah.number}`)}
            >
              <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-serif font-bold text-lg group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      {surah.number}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-serif group-hover:text-primary transition-colors duration-300">
                        {surah.name.transliteration.id}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{surah.name.translation.id}</p>
                    </div>
                  </div>
                  <div className="text-3xl font-Amiri text-primary/60 group-hover:text-primary transition-colors">
                    {surah.name.short}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4 text-primary/60" />
                    <span className="font-medium">{surah.numberOfVerses} Ayat</span>
                  </span>
                  <span className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-xs font-medium">
                    {surah.revelation.id}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredList.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <Search className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
            <p className="text-muted-foreground text-lg font-medium">Tidak ada surah yang cocok</p>
            <p className="text-muted-foreground text-sm mt-2">Coba cari dengan nama atau nomor surah lain</p>
          </div>
        )}

        <footer className="text-center pt-12 border-t border-border/50">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              Gunakan pencarian di atas untuk mencari ayat, surah, tafsir, dan arti di seluruh Al-Qur'an
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
