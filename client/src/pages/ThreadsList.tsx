import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Link, useRoute } from "wouter";
import { Search, MessageCircle } from "lucide-react";
import { useState } from "react";

export default function ThreadsList() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const threadsQuery = trpc.threads.list.useQuery({
    limit,
    offset: page * limit,
  });

  const filteredThreads = threadsQuery.data?.filter(
    (thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.serviceName.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Please sign in to view discussions</p>
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
            <span className="bracket-left">Discussion Threads</span>
          </h1>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search threads or services..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-10 bg-input border-neon/30 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Threads Grid */}
      <div className="container py-12">
        {threadsQuery.isLoading ? (
          <div className="text-center text-muted-foreground py-12">
            Loading discussions...
          </div>
        ) : filteredThreads.length > 0 ? (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredThreads.map((thread) => (
                <Link key={thread.id} href={`/threads/${thread.id}`}>
                  <Card className="bg-card border-neon/30 p-6 hover:border-neon/60 transition-all cursor-pointer hover:shadow-lg hover:shadow-cyan-500/20 h-full flex flex-col">
                    <div className="mb-3">
                      <span className="error-code text-xs">[{thread.serviceName}]</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 flex-grow">
                      {thread.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {thread.description || "No description provided"}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-neon/20 text-xs text-muted-foreground">
                      <span>
                        {new Date(thread.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Discussion
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="border-neon/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button
                variant="outline"
                disabled={filteredThreads.length < limit}
                onClick={() => setPage(page + 1)}
                className="border-neon/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            No discussions found
          </div>
        )}
      </div>
    </div>
  );
}
