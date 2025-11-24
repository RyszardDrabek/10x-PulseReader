import { Badge } from "./ui/badge";
import { ExternalLink } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import type { ArticleDto } from "../types";

interface ArticleCardProps {
  article: ArticleDto;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "neutral":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "negative":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "1 day ago";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncateDescription = (description: string | null, maxLength = 200) => {
    if (!description) return "";
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + "...";
  };

  const sanitizedTitle = DOMPurify.sanitize(article.title);
  const sanitizedDescription = DOMPurify.sanitize(truncateDescription(article.description));

  // Clean and validate the link - strip any CDATA tags that might have been missed
  const cleanLink = article.link ? article.link.replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : "#";

  // Ensure link is a valid URL, otherwise use "#" to prevent navigation errors
  let href = cleanLink;
  try {
    // Try to create a URL object to validate
    new URL(cleanLink);
  } catch {
    // If invalid URL, use "#" to prevent navigation
    href = "#";
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block border rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      aria-label={`Open article: ${article.title}. Published by ${article.source.name} on ${formatDate(article.publicationDate)}.`}
      data-testid="article-card"
    >
      <div className="flex items-start justify-between mb-3">
        <h3
          className="text-base md:text-lg font-semibold text-foreground hover:text-primary flex-1 mr-2"
          dangerouslySetInnerHTML={{ __html: sanitizedTitle }}
        />
        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>

      {article.description && (
        <p
          className="text-muted-foreground mb-4 leading-relaxed text-sm md:text-base"
          dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
        />
      )}

      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">{article.source.name}</span>

          {article.sentiment && (
            <Badge variant="secondary" className={getSentimentColor(article.sentiment)}>
              {article.sentiment}
            </Badge>
          )}

          {article.topics.map((topic) => (
            <Badge key={topic.id} variant="outline" className="text-xs">
              {topic.name}
            </Badge>
          ))}
        </div>

        <span className="text-xs text-muted-foreground md:text-right">{formatDate(article.publicationDate)}</span>
      </div>
    </a>
  );
}
