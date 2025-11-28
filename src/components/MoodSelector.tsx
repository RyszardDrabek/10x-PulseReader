import { useState } from "react";
import { Button } from "./ui/button";
import { Smile, Meh, Frown } from "lucide-react";
import type { UserMood } from "../types";

interface MoodOption {
  value: UserMood;
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface MoodSelectorProps {
  currentMood: UserMood | null;
  onMoodChange: (mood: UserMood | null) => void;
  disabled?: boolean;
  className?: string;
}

const moodOptions: MoodOption[] = [
  {
    value: "positive",
    icon: <Smile className="h-6 w-6" />,
    label: "Positive",
    description: "Show me uplifting and positive news",
  },
  {
    value: "neutral",
    icon: <Meh className="h-6 w-6" />,
    label: "Neutral",
    description: "Show me balanced and factual news",
  },
  {
    value: "negative",
    icon: <Frown className="h-6 w-6" />,
    label: "Negative",
    description: "Show me critical and investigative news",
  },
];

export default function MoodSelector({
  currentMood,
  onMoodChange,
  disabled = false,
  className = "",
}: MoodSelectorProps) {
  const [hoveredMood, setHoveredMood] = useState<UserMood | null>(null);

  const handleMoodSelect = (mood: UserMood) => {
    if (disabled) return;

    // Toggle: if clicking the same mood, deselect it
    if (currentMood === mood) {
      onMoodChange(null);
    } else {
      onMoodChange(mood);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <h3 className="text-lg font-medium" id="mood-selector-heading">
          Choose Your Mood
        </h3>
        <p className="text-sm text-muted-foreground">
          Select the type of news that matches your current mood. You can change this anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="mood-selector-heading">
        {moodOptions.map((option) => {
          const isSelected = currentMood === option.value;
          const isHovered = hoveredMood === option.value;

          return (
            <Button
              key={option.value}
              variant={isSelected ? "default" : "outline"}
              className={`h-auto p-4 flex flex-col items-center space-y-2 transition-all duration-200 ${
                isSelected ? "ring-2 ring-primary ring-offset-2" : isHovered ? "border-primary/50 bg-primary/5" : ""
              } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
              onClick={() => handleMoodSelect(option.value)}
              onMouseEnter={() => setHoveredMood(option.value)}
              onMouseLeave={() => setHoveredMood(null)}
              disabled={disabled}
              role="radio"
              aria-checked={isSelected}
              aria-describedby={`${option.value}-description`}
              data-testid={`mood-${option.value}`}
            >
              <div className={`transition-colors duration-200 ${isSelected ? "text-primary-foreground" : ""}`}>
                {option.icon}
              </div>
              <span className="font-medium text-sm">{option.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="text-center">
        {currentMood && (
          <p className="text-sm text-muted-foreground" id={`${currentMood}-description`}>
            {moodOptions.find((opt) => opt.value === currentMood)?.description}
          </p>
        )}
        {!currentMood && (
          <p className="text-sm text-muted-foreground">No mood selected - you&apos;ll see articles of all sentiments</p>
        )}
      </div>
    </div>
  );
}
