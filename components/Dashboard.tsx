import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { NetflixTitle, ContentType } from '../types';

interface DashboardProps {
  data: NetflixTitle[];
}

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {

  const metrics = useMemo(() => {
    const totalTitles = data.length;
    const moviesCount = data.filter(d => d.type === ContentType.Movie).length;
    const showsCount = data.filter(d => d.type === ContentType.TVShow).length;

    // Genre Distribution
    const genreCounts: Record<string, number> = {};
    data.forEach(item => {
      const genres = item.listed_in.split(',').map(g => g.trim());
      genres.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });
    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7) // Top 7
      .map(([name, count]) => ({ name, count }));

    // Release Year Distribution
    const yearCounts: Record<number, number> = {};
    data.forEach(item => {
        yearCounts[item.release_year] = (yearCounts[item.release_year] || 0) + 1;
    });
    const releaseYearDist = Object.entries(yearCounts)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, count]) => ({ year: Number(year), count }));

    // Rating Distribution
    const ratingCounts: Record<string, number> = {};
    data.forEach(item => {
        if(item.rating) {
            ratingCounts[item.rating] = (ratingCounts[item.rating] || 0) + 1;
        }
    });
    const ratingDist = Object.entries(ratingCounts)
      .map(([rating, count]) => ({ rating, count }));

    return { totalTitles, moviesCount, showsCount, topGenres, releaseYearDist, ratingDist };
  }, [data]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-medium">Total Titles</h3>
          <p className="text-3xl font-bold text-white mt-2">{metrics.totalTitles}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-medium">Movies</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">{metrics.moviesCount}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-medium">TV Shows</h3>
          <p className="text-3xl font-bold text-blue-500 mt-2">{metrics.showsCount}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Genres */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-96">
            <h3 className="text-lg font-semibold mb-4 text-zinc-100">Top Genres</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topGenres} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" />
                    <YAxis dataKey="name" type="category" width={120} stroke="#71717a" tick={{fontSize: 12}} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} 
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#e50914" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* Rating Distribution */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-96">
            <h3 className="text-lg font-semibold mb-4 text-zinc-100">Rating Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={metrics.ratingDist}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {metrics.ratingDist.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                        itemStyle={{ color: '#fff' }} 
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-8">
        {/* Releases Over Time */}
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800 h-80">
             <h3 className="text-lg font-semibold mb-4 text-zinc-100">Content Releases by Year</h3>
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.releaseYearDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="year" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
             </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};