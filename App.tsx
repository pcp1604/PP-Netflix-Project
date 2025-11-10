import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, BarChart2, Film, Star, Info, ThumbsUp, ThumbsDown, Minus, 
  Loader2, Play, X, Clock, Check, Trash2, RefreshCw, MessageSquare, 
  Sparkles, Users, ChevronRight, Bell, Send, BrainCircuit, Zap, History 
} from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { parseCSV } from './utils/csvParser';
import { RAW_CSV_DATA } from './data/netflixData';
import { getRecommendations, getSentimentAnalysis, chatWithAi, getMatchExplanation } from './services/geminiService';
import { Recommendation, SentimentAnalysisResult, NetflixTitle, ChatMessage } from './types';

// --- Helper Components for Netflix UI ---

const MovieModal = ({ 
  movie, 
  onClose, 
  onPlay, 
  onToggleWatchLater, 
  isSaved 
}: { 
  movie: NetflixTitle | Recommendation, 
  onClose: () => void, 
  onPlay: (term: string, url?: string) => void,
  onToggleWatchLater: (m: any) => void,
  isSaved: boolean
}) => {
  const [aiReason, setAiReason] = useState<string>("");
  const [loadingReason, setLoadingReason] = useState(false);

  useEffect(() => {
    const fetchReason = async () => {
      setLoadingReason(true);
      const reason = await getMatchExplanation(movie.title, "Cinematic, Story-rich, High Production Value");
      setAiReason(reason);
      setLoadingReason(false);
    };
    fetchReason();
  }, [movie.title]);

  // Robust poster fallback
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = `https://placehold.co/1280x720/222/red?text=${encodeURIComponent(movie.title)}`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-4xl bg-[#141414] rounded-xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col max-h-[90vh]">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-zinc-800 text-white p-2 rounded-full transition-colors"
        >
            <X className="w-6 h-6" />
        </button>
        
        <div className="relative h-64 sm:h-96 bg-zinc-900">
            {/* Fallback Hero Image */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent z-10"></div>
            <img 
              src={(movie as Recommendation).posterUrl || `https://placehold.co/1280x720/222/red?text=${encodeURIComponent(movie.title)}`}
              className="w-full h-full object-cover opacity-80"
              alt={movie.title}
              onError={handleImageError}
            />
            <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
              <h2 className="text-4xl font-bold text-white mb-2 shadow-lg">{movie.title}</h2>
              <div className="flex items-center gap-4 text-sm font-medium text-zinc-300">
                <span className="text-green-500 font-bold">98% Match</span>
                <span>{(movie as any).release_year || (movie as any).year}</span>
                <span className="border border-zinc-600 px-2 py-0.5 rounded text-xs">HD</span>
              </div>
            </div>
        </div>

        <div className="p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              
              {/* AI Feature: Explain My Match */}
              <div className="bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 p-4 rounded-lg relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 opacity-10">
                    <BrainCircuit className="w-24 h-24 text-red-500" />
                 </div>
                 <h3 className="text-red-500 font-semibold text-sm flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" /> AI Match Intelligence
                 </h3>
                 {loadingReason ? (
                    <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4"></div>
                 ) : (
                    <p className="text-zinc-300 text-sm leading-relaxed">{aiReason}</p>
                 )}
              </div>

              <p className="text-zinc-300 text-lg leading-relaxed">
                {(movie as any).description || (movie as any).reason || "No description available for this title."}
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => onPlay(movie.title, (movie as Recommendation).trailerUrl)}
                  className="flex-1 bg-white text-black py-3 rounded font-bold hover:bg-zinc-200 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" /> Play Trailer
                </button>
                <button 
                  onClick={() => onToggleWatchLater(movie)}
                  className="flex-1 bg-zinc-800 text-white py-3 rounded font-bold hover:bg-zinc-700 transition flex items-center justify-center gap-2"
                >
                  {isSaved ? <Check className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  {isSaved ? 'Saved' : 'Watch Later'}
                </button>
              </div>
            </div>

            <div className="text-sm text-zinc-400 space-y-4">
              <div>
                <span className="block text-zinc-500 mb-1">Genre:</span>
                <span className="text-white">{(movie as any).listed_in || (movie as any).genre}</span>
              </div>
              <div>
                 <span className="block text-zinc-500 mb-1">Cast:</span>
                 <span className="text-white line-clamp-3">{(movie as any).cast || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'discovery' | 'watchLater' | 'insights'>('home');
  
  // Data
  const [netflixData, setNetflixData] = useState<NetflixTitle[]>([]);
  const [heroMovie, setHeroMovie] = useState<NetflixTitle | null>(null);
  
  // Search / Discovery State
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedTitle, setSearchedTitle] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Features State
  const [playingTrailer, setPlayingTrailer] = useState<string | null>(null);
  const [watchLater, setWatchLater] = useState<Recommendation[]>([]);
  
  // UI State
  const [selectedMovie, setSelectedMovie] = useState<NetflixTitle | Recommendation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm CinemAI 🎬. Tell me your mood or a movie you love, and I'll find your next binge!", timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Parse Data on Load and Load History
  useEffect(() => {
    const data = parseCSV(RAW_CSV_DATA);
    setNetflixData(data);
    // Pick a random popular movie for Hero
    const heroCandidates = data.filter(d => d.release_year > 2018 && d.type === 'Movie');
    if (heroCandidates.length > 0) {
       setHeroMovie(heroCandidates[Math.floor(Math.random() * heroCandidates.length)]);
    }

    const savedHistory = localStorage.getItem('netflix_search_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse search history");
      }
    }
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatOpen]);


  // --- Handlers ---

  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 8);
    setSearchHistory(newHistory);
    localStorage.setItem('netflix_search_history', JSON.stringify(newHistory));
  };

  const removeFromHistory = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== term);
    setSearchHistory(newHistory);
    localStorage.setItem('netflix_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('netflix_search_history');
  };

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = overrideQuery || searchQuery;
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearchedTitle(query);
    setRecommendations([]);
    setSentiment(null);
    setShowHistory(false);
    
    if (!overrideQuery) addToHistory(query);

    // If overriding, also update input
    if (overrideQuery) setSearchQuery(overrideQuery);

    try {
      const [recs, sent] = await Promise.all([
        getRecommendations(query),
        getSentimentAnalysis(query) 
      ]);

      if (recs.length === 0) {
        setError("No recommendations found. Try a different title or mood.");
      } else {
        setRecommendations(recs);
        setSentiment(sent);
      }
    } catch (err) {
      setError("Something went wrong connecting to the AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!searchedTitle) return;
    setLoading(true);
    setError(null);
    try {
        const currentTitles = recommendations.map(r => r.title);
        const newRecs = await getRecommendations(searchedTitle, currentTitles);
        if (newRecs.length === 0) setError("Could not find more similar titles.");
        else setRecommendations(newRecs);
    } catch (err) { setError("Failed to refresh."); } 
    finally { setLoading(false); }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatTyping(true);

    const response = await chatWithAi([...chatHistory, userMsg], userMsg.text);
    
    setChatHistory(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
    setIsChatTyping(false);
  };

  const handleAiMood = async (mood: string) => {
     setActiveTab('discovery');
     // Trigger search immediately with the mood
     handleSearch(undefined, mood);
  };

  const handlePlayTrailer = async (term: string, url?: string) => {
      if (url) {
          setPlayingTrailer(url);
      } else {
          const rec = recommendations.find(r => r.title === term);
          if (rec && rec.trailerUrl) {
              setPlayingTrailer(rec.trailerUrl);
          } else {
              // Ultimate fallback if no URL is found
              setPlayingTrailer("https://www.youtube.com/watch?v=dQw4w9WgXcQ"); 
          }
      }
  };

  // More robust youtube ID extraction
  const getYoutubeEmbedId = (url: string) => {
    if (!url) return null;
    // Handles: youtu.be, youtube.com/watch?v=, youtube.com/embed/, youtube.com/v/
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const toggleWatchLater = (movie: any) => {
    const title = movie.title;
    setWatchLater(prev => {
      const exists = prev.some(item => item.title === title);
      if (exists) return prev.filter(item => item.title !== title);
      
      const newRec: Recommendation = {
          title: movie.title,
          type: movie.type || 'Movie',
          similarityScore: (movie as any).similarityScore || 100,
          reason: (movie as any).reason || (movie as any).description || 'Added from list',
          year: (movie as any).year || (movie as any).release_year?.toString(),
          genre: (movie as any).genre || (movie as any).listed_in,
          posterUrl: (movie as any).posterUrl,
          trailerUrl: (movie as any).trailerUrl
      };
      return [...prev, newRec];
    });
  };

  const isSaved = (title: string) => watchLater.some(item => item.title === title);

  // Helper for fallback images
  const handlePosterError = (e: React.SyntheticEvent<HTMLImageElement, Event>, title: string) => {
      e.currentTarget.src = `https://placehold.co/400x600/18181b/404040?text=${encodeURIComponent(title)}`;
  };


  // --- Sub-Views ---

  const renderContentRow = (title: string, data: NetflixTitle[]) => (
    <div className="mb-8 animate-fade-in-up">
        <h3 className="text-xl font-bold text-white mb-4 px-8 md:px-12 flex items-center gap-2 group cursor-pointer hover:text-red-500 transition-colors">
            {title} <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </h3>
        <div className="relative">
            <div className="flex overflow-x-auto gap-4 px-8 md:px-12 pb-4 scrollbar-hide snap-x">
                {data.map((item, idx) => (
                    <div 
                        key={idx} 
                        className="flex-none w-40 md:w-56 snap-start relative group cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10"
                        onClick={() => setSelectedMovie(item)}
                    >
                        <div className="aspect-[2/3] rounded-md overflow-hidden bg-zinc-800">
                            <img 
                                src={`https://placehold.co/400x600/222/999?text=${encodeURIComponent(item.title)}`}
                                alt={item.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                             <p className="text-xs font-bold text-white truncate">{item.title}</p>
                             <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-green-400">96% Match</span>
                                <button className="bg-white text-black rounded-full p-1">
                                    <Play className="w-2 h-2 fill-current" />
                                </button>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  const quickPrompts = [
    { label: "Mind-bending Sci-Fi", icon: "🤯" },
    { label: "Dark Korean Thrillers", icon: "🌑" },
    { label: "Feel-good 90s Comedies", icon: "😊" },
    { label: "Cyberpunk Anime", icon: "🤖" },
    { label: "Underdog Sports Stories", icon: "🏆" },
  ];

  return (
    <div className="min-h-screen bg-[#141414] text-gray-100 font-sans selection:bg-red-900 selection:text-white pb-20">
      
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 bg-gradient-to-b from-black/90 via-black/70 to-transparent backdrop-blur-sm`}>
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl md:text-3xl font-bold text-red-600 tracking-tighter cursor-pointer" onClick={() => setActiveTab('home')}>NETFLIX <span className="font-light text-white text-sm opacity-80 ml-1 border-l border-white/30 pl-2">2.0</span></h1>
            <div className="hidden md:flex space-x-6 text-sm font-medium">
              <button onClick={() => setActiveTab('home')} className={`${activeTab === 'home' ? 'text-white font-bold' : 'text-gray-300 hover:text-white'} transition-colors`}>Home</button>
              <button onClick={() => setActiveTab('discovery')} className={`${activeTab === 'discovery' ? 'text-white font-bold' : 'text-gray-300 hover:text-white'} transition-colors`}>AI Discovery</button>
              <button onClick={() => setActiveTab('watchLater')} className={`${activeTab === 'watchLater' ? 'text-white font-bold' : 'text-gray-300 hover:text-white'} transition-colors`}>My List</button>
              <button onClick={() => setActiveTab('insights')} className={`${activeTab === 'insights' ? 'text-white font-bold' : 'text-gray-300 hover:text-white'} transition-colors`}>Insights</button>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="text-white hover:text-gray-300" onClick={() => { setActiveTab('discovery'); setTimeout(() => searchInputRef.current?.focus(), 100); }}><Search className="w-5 h-5" /></button>
             <button className="text-white hover:text-gray-300 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-600 rounded-full"></span>
             </button>
             <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded cursor-pointer flex items-center justify-center font-bold text-xs shadow-lg shadow-purple-900/20">AI</div>
          </div>
        </div>
      </nav>

      {/* Global UI Elements */}
      {playingTrailer && (
          <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-fade-in">
               <button 
                  onClick={() => setPlayingTrailer(null)}
                  className="absolute top-8 right-8 z-20 text-white hover:text-gray-400 transition-colors"
              >
                  <X className="w-10 h-10" />
              </button>
              <div className="w-full h-full max-w-7xl max-h-[80vh] aspect-video relative">
                 {getYoutubeEmbedId(playingTrailer) ? (
                    <iframe 
                        className="w-full h-full rounded-lg shadow-2xl"
                        src={`https://www.youtube.com/embed/${getYoutubeEmbedId(playingTrailer)}?autoplay=1&controls=1`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                    ></iframe>
                 ) : (
                     <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-900 text-zinc-400">
                        <Info className="w-12 h-12 mb-4" />
                        <p className="text-xl">Video not available</p>
                        <p className="text-sm mt-2">The AI could not find a valid playable link for this title.</p>
                     </div>
                 )}
              </div>
          </div>
      )}

      {selectedMovie && (
          <MovieModal 
              movie={selectedMovie} 
              onClose={() => setSelectedMovie(null)} 
              onPlay={handlePlayTrailer}
              onToggleWatchLater={toggleWatchLater}
              isSaved={isSaved(selectedMovie.title)}
          />
      )}

      {/* --- HOME TAB --- */}
      {activeTab === 'home' && (
        <>
          {/* Hero Section */}
          {heroMovie && (
              <div className="relative w-full h-[85vh] mb-8 group">
                  <div className="absolute inset-0">
                      <img 
                        src={`https://placehold.co/1920x1080/111/333?text=${encodeURIComponent(heroMovie.title)}`} 
                        className="w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-110" 
                        alt="Hero Background"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent"></div>
                  </div>
                  
                  <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 pb-24 md:w-1/2 z-10 space-y-6 animate-fade-in-up">
                      <div className="flex items-center gap-2 text-red-500 font-bold tracking-widest text-sm uppercase mb-2 bg-black/40 backdrop-blur-md w-fit px-3 py-1 rounded-full border border-red-500/30">
                          <Film className="w-4 h-4" /> Featured by AI
                      </div>
                      <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow-2xl leading-none">{heroMovie.title}</h1>
                      <div className="flex items-center gap-4 text-zinc-300 text-sm font-medium">
                          <span className="text-green-400 font-bold flex items-center gap-1"><Zap className="w-4 h-4 fill-current" /> 99% Match</span>
                          <span>{heroMovie.release_year}</span>
                          <span className="bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">4K Ultra HD</span>
                      </div>
                      <p className="text-lg text-zinc-100 line-clamp-3 drop-shadow-md max-w-xl leading-relaxed">
                          {heroMovie.description}
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                          <button 
                            onClick={() => handlePlayTrailer(heroMovie.title)}
                            className="bg-white text-black px-8 py-3 rounded font-bold hover:bg-zinc-200 transition flex items-center gap-2 transform hover:scale-105 duration-200"
                          >
                              <Play className="w-5 h-5 fill-current" /> Play
                          </button>
                          <button 
                            onClick={() => setSelectedMovie(heroMovie)}
                            className="bg-zinc-600/80 backdrop-blur-sm text-white px-8 py-3 rounded font-bold hover:bg-zinc-500/80 transition flex items-center gap-2 transform hover:scale-105 duration-200"
                          >
                              <Info className="w-5 h-5" /> More Info
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* AI Mood Scanner */}
          <div className="px-4 md:px-12 mb-12">
               <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-white/5 rounded-xl p-6 md:p-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <BrainCircuit className="w-6 h-6 text-purple-400" /> 
                            What's your vibe today?
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {['Chill & Relaxed', 'Adventurous', 'Dark & Gritty', 'Mind-Bending', 'Heart-Warming', 'Need a Laugh'].map(mood => (
                                <button 
                                    key={mood}
                                    onClick={() => handleAiMood(mood)}
                                    className="px-5 py-2.5 rounded-full bg-zinc-800/50 hover:bg-white text-zinc-300 hover:text-black border border-zinc-700 hover:border-white transition-all duration-300 font-medium"
                                >
                                    {mood}
                                </button>
                            ))}
                        </div>
                    </div>
               </div>
          </div>

          {/* Content Rows */}
          {renderContentRow("Trending Now", netflixData.slice(0, 10))}
          {renderContentRow("AI Recommended For You", netflixData.slice(10, 20))}
          {renderContentRow("New Releases", netflixData.filter(m => m.release_year === 2021))}
          {renderContentRow("Action & Adventure", netflixData.filter(m => m.listed_in.includes("Action")))}
        </>
      )}

      {/* --- DISCOVERY / SEARCH TAB --- */}
      {activeTab === 'discovery' && (
         <div className="pt-32 px-4 md:px-12 min-h-screen bg-gradient-to-b from-[#141414] to-black">
             <div className="max-w-7xl mx-auto">
                 
                 {/* Header & Search */}
                 <div className="text-center mb-16 animate-fade-in relative z-20">
                    <h2 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        AI Command Center
                    </h2>
                    <p className="text-zinc-400 mb-8">Powered by Gemini 2.5 • Discover movies by mood, plot, or vague memory.</p>
                    
                    <div className="max-w-3xl mx-auto relative">
                        <form onSubmit={(e) => handleSearch(e)} className="relative group z-30">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative flex items-center">
                                <Search className="absolute left-4 text-zinc-400 w-6 h-6 group-focus-within:text-white transition-colors" />
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  onFocus={() => setShowHistory(true)}
                                  placeholder="Describe your perfect movie..."
                                  className="w-full bg-[#18181b] text-white border border-zinc-700/50 rounded-lg py-5 pl-14 pr-32 focus:outline-none focus:ring-1 focus:ring-white/20 placeholder-zinc-500 text-lg shadow-2xl transition-all"
                                />
                                {searchQuery && (
                                  <button 
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-32 text-zinc-500 hover:text-white p-2"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                )}
                                <button 
                                    type="submit"
                                    disabled={loading || !searchQuery}
                                    className="absolute right-2 bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-md font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Generate'}
                                </button>
                            </div>
                        </form>

                        {/* Search History Dropdown */}
                        {showHistory && searchHistory.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#18181b] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-40 animate-fade-in">
                                <div className="flex justify-between items-center px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
                                    <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><History className="w-3 h-3" /> Recent Searches</span>
                                    <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-400">Clear All</button>
                                </div>
                                <ul>
                                    {searchHistory.map((term, idx) => (
                                        <li 
                                          key={idx} 
                                          className="group flex items-center justify-between px-4 py-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/50 last:border-none"
                                          onClick={() => handleSearch(undefined, term)}
                                        >
                                            <span className="text-zinc-300 group-hover:text-white flex items-center gap-3">
                                               <Search className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
                                               {term}
                                            </span>
                                            <button 
                                                onClick={(e) => removeFromHistory(e, term)}
                                                className="text-zinc-600 hover:text-zinc-400 p-1 rounded-full hover:bg-zinc-700"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Quick Chips */}
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        {quickPrompts.map((prompt, idx) => (
                             <button 
                                key={idx}
                                onClick={() => handleSearch(undefined, prompt.label)}
                                className="group relative px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-red-600 hover:bg-zinc-800 transition-all duration-300"
                             >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{prompt.icon}</span>
                                    <span className="text-sm font-medium text-zinc-400 group-hover:text-white">{prompt.label}</span>
                                </div>
                             </button>
                        ))}
                    </div>
                 </div>

                 {error && (
                    <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg text-center mb-12">
                        {error}
                    </div>
                 )}

                 {loading && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
                         {[1,2,3,4].map(i => (
                             <div key={i} className="aspect-[2/3] bg-zinc-900 rounded-lg"></div>
                         ))}
                     </div>
                 )}

                 {(!loading && recommendations.length > 0) && (
                    <div className="animate-fade-in-up">
                        {/* AI Intelligence Brief Panel */}
                        {sentiment && (
                            <div className="mb-12 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-3">
                                <div className="p-8 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col justify-center">
                                    <h3 className="text-red-500 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4" /> Analysis Complete
                                    </h3>
                                    <h2 className="text-2xl font-bold text-white mb-4">Global Sentiment</h2>
                                    <p className="text-zinc-400 italic text-lg leading-relaxed">"{sentiment.summary}"</p>
                                </div>
                                <div className="p-8 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-zinc-800">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-green-400 font-bold">Positive</span>
                                                <span className="text-white">{sentiment.positivePercent}%</span>
                                            </div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500" style={{width: `${sentiment.positivePercent}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-zinc-400 font-bold">Neutral</span>
                                                <span className="text-white">{sentiment.neutralPercent}%</span>
                                            </div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-zinc-500" style={{width: `${sentiment.neutralPercent}%`}}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-red-400 font-bold">Negative</span>
                                                <span className="text-white">{sentiment.negativePercent}%</span>
                                            </div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500" style={{width: `${sentiment.negativePercent}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-8 bg-black/20">
                                    <h4 className="text-zinc-500 text-xs font-bold uppercase mb-4">Review Snippets</h4>
                                    <div className="space-y-3">
                                        {sentiment.sampleReviews.slice(0, 2).map((r, i) => (
                                            <div key={i} className="text-sm text-zinc-300 pl-3 border-l-2 border-zinc-700">
                                                "{r.text.slice(0, 60)}..."
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-end mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-yellow-500" /> Top Recommendations
                            </h3>
                            <button onClick={handleRefresh} className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                                <RefreshCw className="w-4 h-4" /> Regenerate
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {recommendations.map((rec, idx) => (
                                <div key={idx} className="group relative bg-zinc-900 rounded-lg overflow-hidden hover:scale-[1.02] hover:ring-2 hover:ring-red-600/50 transition-all duration-300 shadow-xl">
                                    <div className="aspect-[2/3] relative cursor-pointer" onClick={() => setSelectedMovie(rec)}>
                                        <img 
                                            src={rec.posterUrl || `https://placehold.co/400x600/18181b/404040?text=${encodeURIComponent(rec.title)}`}
                                            alt={rec.title}
                                            className="w-full h-full object-cover transition-opacity duration-300"
                                            onError={(e) => handlePosterError(e, rec.title)}
                                        />
                                        
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                            <p className="text-green-400 text-xs font-bold mb-2 flex items-center gap-1">
                                                <Zap className="w-3 h-3 fill-current" /> {rec.similarityScore}% Match
                                            </p>
                                            <p className="text-white text-sm font-medium leading-snug mb-4 line-clamp-3">
                                                "{rec.reason}"
                                            </p>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handlePlayTrailer(rec.title, rec.trailerUrl); }}
                                                className="w-full bg-white text-black py-2 rounded font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200"
                                            >
                                                <Play className="w-3 h-3 fill-current" /> Trailer
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                                        <h4 className="font-bold text-white text-sm truncate">{rec.title}</h4>
                                        <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
                                            <span>{rec.year}</span>
                                            <span>{rec.type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
             </div>
         </div>
      )}

      {/* --- WATCH LIST TAB --- */}
      {activeTab === 'watchLater' && (
          <div className="pt-32 px-4 md:px-12 min-h-screen">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3"><Clock className="w-8 h-8" /> My List</h2>
              {watchLater.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-zinc-500 border-2 border-dashed border-zinc-800 rounded-xl">
                      <Clock className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg">Your list is empty.</p>
                      <button onClick={() => setActiveTab('discovery')} className="mt-4 text-red-500 hover:text-red-400 font-medium">Find something to watch</button>
                  </div>
              ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {watchLater.map((item, idx) => (
                          <div key={idx} className="relative group cursor-pointer" onClick={() => setSelectedMovie(item)}>
                              <div className="aspect-[2/3] rounded bg-zinc-800 overflow-hidden border border-transparent hover:border-zinc-600 transition-all">
                                  <img 
                                      src={item.posterUrl || `https://placehold.co/400x600/18181b/404040?text=${encodeURIComponent(item.title)}`} 
                                      className="w-full h-full object-cover" 
                                      alt={item.title} 
                                      onError={(e) => handlePosterError(e, item.title)}
                                  />
                              </div>
                              <button 
                                  onClick={(e) => { e.stopPropagation(); toggleWatchLater(item); }}
                                  className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all"
                              >
                                  <X className="w-4 h-4" />
                              </button>
                              <p className="mt-2 text-sm font-medium truncate text-zinc-300 group-hover:text-white">{item.title}</p>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* --- INSIGHTS TAB --- */}
      {activeTab === 'insights' && (
          <div className="pt-32 px-4 md:px-12 min-h-screen">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3"><BarChart2 className="w-8 h-8" /> Content Insights</h2>
              <Dashboard data={netflixData} />
          </div>
      )}


      {/* FLOATING AI ASSISTANT */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
          {isChatOpen && (
              <div className="bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl w-80 sm:w-96 h-[500px] mb-4 flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right">
                  <div className="bg-gradient-to-r from-red-900 to-black p-4 flex justify-between items-center border-b border-zinc-800">
                      <h3 className="font-bold text-white flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5" /> CinemAI
                      </h3>
                      <button onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141414]">
                      {chatHistory.map((msg, i) => (
                          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                                  msg.role === 'user' 
                                  ? 'bg-red-600 text-white rounded-br-none' 
                                  : 'bg-zinc-800 text-zinc-200 rounded-bl-none border border-zinc-700'
                              }`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      {isChatTyping && (
                          <div className="flex justify-start">
                              <div className="bg-zinc-800 p-3 rounded-lg rounded-bl-none border border-zinc-700 flex gap-1">
                                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></span>
                                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-75"></span>
                                  <span className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-150"></span>
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleChatSubmit} className="p-3 bg-[#1a1a1a] border-t border-zinc-800 flex gap-2">
                      <input 
                          type="text" 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask for a recommendation..."
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                      />
                      <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isChatTyping}
                        className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 disabled:opacity-50"
                      >
                          <Send className="w-4 h-4" />
                      </button>
                  </form>
              </div>
          )}
          <button 
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center group"
          >
             {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 group-hover:animate-pulse" />}
          </button>
      </div>

    </div>
  );
};

export default App;