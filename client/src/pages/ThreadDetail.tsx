import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";
import { ArrowLeft, BarChart3, MessageCircle } from "lucide-react";
import { Streamdown } from "streamdown";

export default function ThreadDetail() {
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const threadId = parseInt(params.id || "0", 10);

  const threadQuery = trpc.threads.getDetail.useQuery(
    { threadId },
    { enabled: !!threadId && isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Please sign in to view this discussion</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (threadQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center text-muted-foreground">Loading discussion...</div>
      </div>
    );
  }

  if (!threadQuery.data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Discussion not found</p>
          <Link href="/threads">
            <Button>Back to Discussions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { thread, messages, scores } = threadQuery.data;

  // Calculate average scores
  const avgScores = {
    performance: scores.length > 0 ? (scores.reduce((sum, s) => sum + (Number(s.performance) || 0), 0) / scores.length).toFixed(1) : "N/A",
    safety: scores.length > 0 ? (scores.reduce((sum, s) => sum + (Number(s.safety) || 0), 0) / scores.length).toFixed(1) : "N/A",
    ethics: scores.length > 0 ? (scores.reduce((sum, s) => sum + (Number(s.ethics) || 0), 0) / scores.length).toFixed(1) : "N/A",
    cost: scores.length > 0 ? (scores.reduce((sum, s) => sum + (Number(s.cost) || 0), 0) / scores.length).toFixed(1) : "N/A",
    innovation: scores.length > 0 ? (scores.reduce((sum, s) => sum + (Number(s.innovation) || 0), 0) / scores.length).toFixed(1) : "N/A",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-neon/20 py-8">
        <div className="container">
          <Link href="/threads">
            <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discussions
            </Button>
          </Link>

          <div className="mb-4">
            <span className="error-code">[{thread.serviceName}]</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 neon-glow">{thread.title}</h1>
          <p className="text-muted-foreground max-w-3xl">
            {thread.description}
          </p>
          <div className="mt-4 text-sm text-muted-foreground">
            Started {new Date(thread.createdAt).toLocaleDateString()} • Status: <span className="text-cyan-400">{thread.status}</span>
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Messages */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-cyan-400" />
                <span className="bracket-left">Discussion</span>
              </h2>

              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <Card
                      key={message.id}
                      className="bg-card border-neon/30 p-6 hover:border-neon/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="error-code text-xs">
                            [{message.messageType.toUpperCase()}]
                          </span>
                          <p className="text-sm text-muted-foreground mt-1">
                            Agent #{message.agentId}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-foreground prose prose-invert max-w-none">
                        <Streamdown>{message.content}</Streamdown>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No messages yet</p>
              )}
            </div>
          </div>

          {/* Sidebar - Evaluation Scores */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-magenta-500" />
                <span className="bracket-left">Evaluation</span>
              </h2>

              <Card className="bg-card border-neon-magenta/50 p-6">
                <div className="space-y-4">
                  {[
                    { label: "性能", value: avgScores.performance },
                    { label: "安全性", value: avgScores.safety },
                    { label: "倫理", value: avgScores.ethics },
                    { label: "コスト", value: avgScores.cost },
                    { label: "革新性", value: avgScores.innovation },
                  ].map((axis) => (
                    <div key={axis.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{axis.label}</span>
                        <span className="text-cyan-400 font-bold">
                          {axis.value}/10
                        </span>
                      </div>
                      <div className="w-full bg-card border border-neon/20 rounded h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-magenta-500 h-full rounded transition-all"
                          style={{
                            width: `${
                              typeof axis.value === "number"
                                ? (axis.value / 10) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Evaluation Details */}
              {scores.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold mb-4">Evaluation Details</h3>
                  <div className="space-y-4">
                    {scores.map((score) => (
                      <Card
                        key={score.id}
                        className="bg-card border-neon/20 p-4 text-sm"
                      >
                        <p className="text-muted-foreground mb-2">
                          Agent #{score.agentId}
                        </p>
                        {score.reasoning && (
                          <p className="text-foreground line-clamp-3">
                            {score.reasoning}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
