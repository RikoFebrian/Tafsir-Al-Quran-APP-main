"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { fetchSurah, type SurahData } from "@/services/QuranAPI"
import { SearchManager, type FormattedSearchResult } from "@/services/search-manager"
import Header from "@/components/header"
import NavigationButtons from "@/components/NavigationButtons"
import AyatCard from "@/components/AyatCard"
import AyatPagination from "@/components/AyatPagination"
import Footer from "@/components/Footer"
import UnifiedSearchBar from "@/components/UnifiedSearchBar"
import SearchResultsModal from "@/components/SearchResultsModal"
import { Button } from "@/components/ui/button"
import { Home, ChevronLeft } from "lucide-react"

export default function App() {
  const { surahNumber } = useParams<{ surahNumber: string }>()
  const navigate = useNavigate()
  const [tafsirData, setTafsirData] = useState<SurahData | null>(null)
  const [currentAyat, setCurrentAyat] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState<string>("")
  const [recognitionAvailable, setRecognitionAvailable] = useState(false)
  const [searchResults, setSearchResults] = useState<FormattedSearchResult[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const searchManager = useMemo(() => SearchManager.getInstance(), [])

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setRecognitionAvailable(!!SpeechRecognition)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const num = surahNumber ? Number.parseInt(surahNumber) : 1
        const data = await fetchSurah(num)
        setTafsirData(data)

        const globalSearchTerm = sessionStorage.getItem("globalSearchTerm")
        const targetAyat = sessionStorage.getItem("targetAyat")

        if (globalSearchTerm) {
          await performGlobalSearch(globalSearchTerm)
          sessionStorage.removeItem("globalSearchTerm")
        } else if (targetAyat) {
          const ayatNum = Number.parseInt(targetAyat)
          if (ayatNum >= 1 && ayatNum <= data.verses.length) {
            setCurrentAyat(ayatNum)
          }
          sessionStorage.removeItem("targetAyat")
        } else {
          setCurrentAyat(1)
        }
      } catch (err) {
        console.error(err)
        setError("Gagal memuat data dari API")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [surahNumber])

  const performGlobalSearch = useCallback(
    async (term: string) => {
      if (!term.trim()) {
        alert("Masukkan kata kunci pencarian")
        return
      }

      setIsSearching(true)
      try {
        const results = await searchManager.searchGlobal(term)
        setSearchResults(results)
        setShowSearchResults(true)
        setSearchText(term)

        if (results.length === 0) {
          alert("Tidak ada hasil yang ditemukan di seluruh Al-Qur'an")
        }
      } catch (error) {
        console.error("Global search error:", error)
        alert("❌ Terjadi kesalahan saat mencari")
      } finally {
        setIsSearching(false)
      }
    },
    [searchManager],
  )

  const performSearch = useCallback(
    async (term: string) => {
      if (!tafsirData || !term.trim()) {
        alert("Masukkan kata kunci pencarian")
        return
      }

      setIsSearching(true)
      try {
        const results = await searchManager.searchLocal(term, tafsirData)
        setSearchResults(results)
        setShowSearchResults(true)
        setSearchText(term)

        if (results.length === 0) {
          alert(`Tidak ada hasil yang ditemukan di Surah ${tafsirData.name.short}`)
        }
      } catch (error) {
        console.error("Search error:", error)
        alert("❌ Terjadi kesalahan saat mencari")
      } finally {
        setIsSearching(false)
      }
    },
    [tafsirData, searchManager],
  )

  const handleSelectSearchResult = (surahNum: number, ayatId: number) => {
    if (surahNum !== tafsirData?.number) {
      navigate(`/surah/${surahNum}`)
      sessionStorage.setItem("targetAyat", ayatId.toString())
    } else {
      setCurrentAyat(ayatId)
    }
  }

  const currentTafsir = tafsirData?.verses.find((ayat) => ayat.id === currentAyat)

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto mb-6"></div>
          <p className="text-muted-foreground text-lg">Memuat data...</p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-6">
            <Home className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-xl font-serif font-semibold text-destructive mb-4">{error}</p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    )

  if (!tafsirData) return <div>Tidak ada data.</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="gap-2 hover:bg-primary/10 hover:border-primary transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Daftar Surah
          </Button>
        </div>

        <Header name={tafsirData?.name.long} transliteration={tafsirData?.name.transliteration.id} />

        <UnifiedSearchBar
          searchText={searchText}
          setSearchText={setSearchText}
          onSearch={performSearch}
          recognitionAvailable={recognitionAvailable}
        />

        <SearchResultsModal
          isOpen={showSearchResults}
          onClose={() => setShowSearchResults(false)}
          results={searchResults}
          searchTerm={searchText}
          onSelectResult={handleSelectSearchResult}
        />

        <NavigationButtons
          current={currentAyat}
          total={tafsirData.verses.length}
          onPrev={() => setCurrentAyat((c) => Math.max(1, c - 1))}
          onNext={() => setCurrentAyat((c) => Math.min(tafsirData.verses.length, c + 1))}
        />

        {currentTafsir && tafsirData && (
          <AyatCard
            {...currentTafsir}
            name={tafsirData?.name.short}
            transliteration={tafsirData?.name.transliteration.id}
            translation={tafsirData?.name.translation.id}
            searchTerm={searchText}
          />
        )}

        <AyatPagination total={tafsirData.verses.length} current={currentAyat} onSelect={setCurrentAyat} />

        <Footer name={tafsirData?.name.short} transliteration={tafsirData?.name.transliteration.id} />
      </div>
    </div>
  )
}
