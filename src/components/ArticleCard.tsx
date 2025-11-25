import { Badge } from "./ui/badge";
import { ExternalLink, MoreHorizontal } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { useState } from "react";
import type { ArticleDto } from "../types";

interface ArticleCardProps {
  article: ArticleDto;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

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
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
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

  // Sort topics alphabetically for consistent display
  const sortedTopics = [...article.topics].sort((a, b) => a.name.localeCompare(b.name));

  // Show 3 tags initially, expand to show all when clicked
  const initialTagCount = 3;
  const visibleTopics = tagsExpanded ? sortedTopics : sortedTopics.slice(0, initialTagCount);
  const hasMoreTopics = sortedTopics.length > initialTagCount;

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
      className="flex flex-col border rounded-lg p-4 md:p-6 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-full"
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

      {/* Description - flexible to grow and fill space */}
      <div className="flex-grow">
        {article.description && (
          <p
            className="text-muted-foreground leading-relaxed text-sm md:text-base"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        )}
      </div>

      {/* Bottom section - always at bottom */}
      <div className="mt-4">
        {/* Source and Sentiment line */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{article.source.name}</span>
          {article.sentiment && (
            <Badge variant="secondary" className={getSentimentColor(article.sentiment)}>
              {article.sentiment}
            </Badge>
          )}
        </div>

        {/* Tags/Topics line */}
        {sortedTopics.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 mb-2">
            {visibleTopics.map((topic) => (
              <Badge key={topic.id} variant="outline" className="text-xs">
                {topic.name}
              </Badge>
            ))}

            {hasMoreTopics && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setTagsExpanded(!tagsExpanded);
                }}
                className="inline-flex items-center justify-center px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={tagsExpanded ? "Show fewer tags" : `Show ${sortedTopics.length - initialTagCount} more tags`}
                aria-expanded={tagsExpanded}
              >
                <MoreHorizontal className="h-3 w-3" />
                {!tagsExpanded && <span className="ml-1">+{sortedTopics.length - initialTagCount}</span>}
              </button>
            )}
          </div>
        )}

        {/* Publication date line */}
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">{formatDate(article.publicationDate)}</span>
        </div>
      </div>
    </a>
  );
}
