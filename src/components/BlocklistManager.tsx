import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { X, Plus, AlertCircle } from "lucide-react";

interface BlocklistManagerProps {
  blocklist: string[];
  onBlocklistChange: (blocklist: string[]) => void;
  disabled?: boolean;
  maxItems?: number;
  className?: string;
}

export default function BlocklistManager({
  blocklist,
  onBlocklistChange,
  disabled = false,
  maxItems = 50,
  className = "",
}: BlocklistManagerProps) {
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear error when input changes
  useEffect(() => {
    if (error && newItem !== "") {
      setError(null);
    }
  }, [newItem, error]);

  const validateItem = (item: string): string | null => {
    const trimmed = item.trim();

    if (!trimmed) {
      return "Item cannot be empty";
    }

    if (trimmed.length > 100) {
      return "Item cannot be longer than 100 characters";
    }

    if (blocklist.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      return "This item is already in your blocklist";
    }

    // Basic XSS prevention - no HTML tags
    if (/<[^>]*>/.test(trimmed)) {
      return "HTML tags are not allowed";
    }

    return null;
  };

  const handleAddItem = () => {
    const trimmed = newItem.trim();
    const validationError = validateItem(trimmed);

    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    if (blocklist.length >= maxItems) {
      setError(`Maximum ${maxItems} items allowed`);
      return;
    }

    onBlocklistChange([...blocklist, trimmed]);
    setNewItem("");
    setError(null);
    inputRef.current?.focus();
  };

  const handleRemoveItem = (index: number) => {
    const newBlocklist = blocklist.filter((_, i) => i !== index);
    onBlocklistChange(newBlocklist);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddItem();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewItem(e.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="blocklist-input" className="text-lg font-medium">
          Blocklist
        </Label>
        <p className="text-sm text-muted-foreground">
          Add keywords or URL fragments to hide unwanted content from your feed. Filtering is case-insensitive.
        </p>
      </div>

      {/* Add new item section */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id="blocklist-input"
            ref={inputRef}
            type="text"
            placeholder="Enter keyword or URL fragment (e.g., 'politics', 'news.com')"
            value={newItem}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            aria-describedby={error ? "blocklist-error" : undefined}
            aria-invalid={!!error}
            maxLength={100}
            data-testid="blocklist-input"
          />
        </div>
        <Button
          onClick={handleAddItem}
          disabled={disabled || !newItem.trim() || blocklist.length >= maxItems}
          size="default"
          data-testid="add-blocklist-item"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" id="blocklist-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Current blocklist */}
      {blocklist.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Blocked items ({blocklist.length}/{maxItems})
            </Label>
          </div>

          <div className="flex flex-wrap gap-2" role="list" aria-label="Current blocklist items">
            {blocklist.map((item, index) => (
              <Badge
                key={`${item}-${index}`}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
                role="listitem"
              >
                <span className="truncate max-w-[200px]" title={item}>
                  {item}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  aria-label={`Remove ${item} from blocklist`}
                  data-testid={`remove-blocklist-item-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {blocklist.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No blocked items yet.</p>
          <p className="text-xs mt-1">Add keywords above to start filtering your feed.</p>
        </div>
      )}
    </div>
  );
}
