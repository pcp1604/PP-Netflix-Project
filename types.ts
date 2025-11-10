
export enum ContentType {
  Movie = 'Movie',
  TVShow = 'TV Show'
}

export interface NetflixTitle {
  show_id: string;
  type: ContentType;
  title: string;
  director: string;
  cast: string;
  country: string;
  date_added: string;
  release_year: number;
  rating: string;
  duration: string;
  listed_in: string;
  description: string;
}

export interface Recommendation {
  title: string;
  type: string;
  similarityScore: number; // 0-100
  reason: string;
  year: string;
  genre: string;
  trailerUrl?: string;
  posterUrl?: string;
}

export interface Review {
  author: string;
  text: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export interface SentimentAnalysisResult {
  positivePercent: number;
  neutralPercent: number;
  negativePercent: number;
  summary: string;
  sampleReviews: Review[];
}

export interface DashboardMetrics {
  totalTitles: number;
  moviesCount: number;
  showsCount: number;
  topGenres: { name: string; count: number }[];
  releaseYearDist: { year: number; count: number }[];
  ratingDist: { rating: string; count: number }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
