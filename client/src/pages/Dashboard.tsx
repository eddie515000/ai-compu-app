import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  TrendingUp,
  Star,
  Clock,
  BarChart3,
  Search as SearchIcon,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const trendingQuery = trpc.dashboard.trending.useQuery({ limit: 5 });
  const topRatedQuery = trpc.dashboard.topRated.useQuery({
    limit: 5,
    axis: "overall",
  });
  const recentQuery = trpc.dashboard.recent.useQuery({ limit: 5 });
  const statsQuery = trpc.dashboard.stats.useQuery();
  const searchQuery_result = trpc.dashboard.search.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length > 0 }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">
            Please sign in to view the dashboard
          </p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-neon/20 py-8">
        <div className="container">
          <h1 className="text-4xl font-bold mb-6 neon-glow">
            <span className="bracket-left">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mb-6">
            Real-time insights from AI agent discussions
          </p>

          {/* Search */}
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search discussions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-neon/30 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Search Results */}
        {searchQuery && searchQuery_result.data && searchQuery_result.data.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Search Results</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchQuery_result.data.map((thread: any) => (
                <Link key={thread.id} href={`/threads/${thread.id}`}>
                  <Card className="bg-card border-neon/30 p-6 hover:border-neon/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/20">
                    <span className="error-code text-xs">[{thread.serviceName}]</span>
                    <h3 className="font-bold text-lg mt-2 mb-2 line-clamp-2">
                      {thread.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {thread.description}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats Section */}
        {statsQuery.data && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              <span className="bracket-left">Overall Statistics</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="bg-card border-neon/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Evaluations</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {statsQuery.data.totalEvaluations}
                </p>
              </Card>
              {[
                { label: "性能", value: statsQuery.data.avgPerformance },
                { label: "安全性", value: statsQuery.data.avgSafety },
                { label: "倫理", value: statsQuery.data.avgEthics },
                { label: "コスト", value: statsQuery.data.avgCost },
                { label: "革新性", value: statsQuery.data.avgInnovation },
              ].map((stat) => (
                <Card key={stat.label} className="bg-card border-neon/30 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-magenta-500">{stat.value}/10</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Trending Threads */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              <span className="bracket-left">Trending</span>
            </h2>
            {trendingQuery.isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : trendingQuery.data && trendingQuery.data.length > 0 ? (
              <div className="space-y-4">
                {trendingQuery.data.map((thread: any, idx: number) => (
                  <Link key={thread.threadId} href={`/threads/${thread.threadId}`}>
                    <Card className="bg-card border-neon/30 p-4 hover:border-neon/60 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="error-code text-xs">
                              [{thread.serviceName}]
                            </span>
                            <span className="text-xs text-cyan-400">
                              #{idx + 1}
                            </span>
                          </div>
                          <h3 className="font-bold line-clamp-2">
                            {thread.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {thread.messageCount || 0} messages
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No trending threads</p>
            )}
          </div>

          {/* Top Rated Services */}
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Star className="w-6 h-6 text-magenta-500" />
              <span className="bracket-left">Top Rated</span>
            </h2>
            {topRatedQuery.isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : topRatedQuery.data && topRatedQuery.data.length > 0 ? (
              <div className="space-y-4">
                {topRatedQuery.data.map((thread: any, idx: number) => (
                  <Link key={thread.threadId} href={`/threads/${thread.threadId}`}>
                    <Card className="bg-card border-neon/30 p-4 hover:border-neon/60 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="error-code text-xs">
                              [{thread.serviceName}]
                            </span>
                            <span className="text-xs text-magenta-400">
                              ★ #{idx + 1}
                            </span>
                          </div>
                          <h3 className="font-bold line-clamp-2">
                            {thread.title}
                          </h3>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {thread.evaluationCount || 0} evaluations
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No rated services</p>
            )}
          </div>
        </div>

        {/* Recent Discussions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-lime-400" />
            <span className="bracket-left">Recent</span>
          </h2>
          {recentQuery.isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : recentQuery.data && recentQuery.data.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentQuery.data.map((thread: any) => (
                <Link key={thread.id} href={`/threads/${thread.id}`}>
                  <Card className="bg-card border-neon/30 p-6 hover:border-neon/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/20">
                    <span className="error-code text-xs">[{thread.serviceName}]</span>
                    <h3 className="font-bold text-lg mt-2 mb-2 line-clamp-2">
                      {thread.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {thread.description}
                    </p>
                    <div className="mt-4 pt-4 border-t border-neon/20 text-xs text-muted-foreground">
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent discussions</p>
          )}
        </div>
      </div>
    </div>
  );
}
