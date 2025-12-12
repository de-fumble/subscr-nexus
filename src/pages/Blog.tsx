import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, User } from "lucide-react";

const Blog = () => {
  const posts = [
    {
      title: "5 Ways to Reduce Subscription Churn",
      excerpt: "Learn proven strategies to keep your subscribers engaged and reduce churn rates.",
      author: "Recurra Team",
      date: "December 10, 2024",
      category: "Best Practices",
    },
    {
      title: "Understanding MRR and ARR Metrics",
      excerpt: "A comprehensive guide to tracking and optimizing your recurring revenue metrics.",
      author: "Recurra Team",
      date: "December 5, 2024",
      category: "Analytics",
    },
    {
      title: "Setting Up Automated Billing for Schools",
      excerpt: "How educational institutions can streamline fee collection with automated billing.",
      author: "Recurra Team",
      date: "November 28, 2024",
      category: "Use Cases",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-accent font-semibold text-sm uppercase tracking-wider font-mono">Blog</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold text-foreground font-mono">
              Insights & Resources
            </h1>
            <p className="mt-6 text-lg text-muted-foreground font-mono">
              Tips, guides, and best practices for managing your subscription business.
            </p>
          </div>

          {/* Blog Posts */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {posts.map((post, index) => (
              <Card key={index} className="p-6 hover:border-accent/30 transition-all hover:-translate-y-1">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
                  {post.category}
                </span>
                <h3 className="text-lg font-semibold text-foreground mt-2 font-mono">{post.title}</h3>
                <p className="text-muted-foreground text-sm mt-2 font-mono">{post.excerpt}</p>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {post.date}
                  </span>
                </div>
                <Button variant="ghost" className="mt-4 p-0 h-auto text-accent font-mono">
                  Read More <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Blog;
