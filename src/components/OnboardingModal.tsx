import { useState, useEffect } from "react";
import { useSupabase } from "./SupabaseProvider";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Smile, Meh, Frown, X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { logger } from "../lib/utils/logger";
import { toast } from "sonner";
import type { UserMood } from "../types";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (preferences: { mood?: UserMood; blocklist?: string[] }) => void;
}

type OnboardingStep = "welcome" | "mood" | "blocklist" | "complete";

const moodOptions = [
  {
    value: "positive" as UserMood,
    icon: <Smile className="h-8 w-8" />,
    label: "Positive",
    description: "Focus on uplifting and optimistic news",
    example: "Success stories, scientific breakthroughs, community achievements",
  },
  {
    value: "neutral" as UserMood,
    icon: <Meh className="h-8 w-8" />,
    label: "Neutral",
    description: "Balanced and factual reporting",
    example: "Policy updates, economic reports, international news",
  },
  {
    value: "negative" as UserMood,
    icon: <Frown className="h-8 w-8" />,
    label: "Negative",
    description: "Critical and investigative journalism",
    example: "Exposés, crisis coverage, accountability reporting",
  },
];

const suggestedBlocklistItems = ["advertisement", "sponsored", "clickbait", "celebrity", "sports"];

export default function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { user } = useSupabase();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [selectedMood, setSelectedMood] = useState<UserMood | null>(null);
  const [selectedBlocklist, setSelectedBlocklist] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("welcome");
      setSelectedMood(null);
      setSelectedBlocklist([]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const steps: OnboardingStep[] = ["welcome", "mood", "blocklist", "complete"];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleMoodSelect = (mood: UserMood) => {
    setSelectedMood(mood);
  };

  const handleBlocklistToggle = (item: string) => {
    setSelectedBlocklist((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const preferences = {
        mood: selectedMood || undefined,
        blocklist: selectedBlocklist.length > 0 ? selectedBlocklist : undefined,
      };

      // Call the parent's onComplete callback
      await onComplete(preferences);

      setCurrentStep("complete");

      logger.info("User onboarding completed", {
        userId: user.id,
        mood: selectedMood,
        blocklistCount: selectedBlocklist.length,
      });

      toast.success("Welcome to PulseReader! Your preferences have been set.");
    } catch (error) {
      logger.error("Failed to complete onboarding", error);
      toast.error("Failed to save your preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
    toast.info("You can set your preferences anytime from the Settings page.");
  };

  const renderWelcomeStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-4 bg-primary/10 rounded-full">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Welcome to PulseReader! 🎉</h2>
        <p className="text-muted-foreground text-lg">
          Let&apos;s personalize your news feed to match your interests and mood. This will only take a minute and you
          can change your preferences anytime.
        </p>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">What you&apos;ll get:</h3>
        <ul className="text-sm text-muted-foreground space-y-1 text-left">
          <li>• News filtered by your preferred mood</li>
          <li>• Block unwanted topics and keywords</li>
          <li>• More relevant and enjoyable reading experience</li>
        </ul>
      </div>
    </div>
  );

  const renderMoodStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your News Mood</h2>
        <p className="text-muted-foreground">Select the type of news that matches your current preference</p>
      </div>

      <div className="grid gap-4">
        {moodOptions.map((option) => {
          const isSelected = selectedMood === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleMoodSelect(option.value)}
              className={`p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                isSelected
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-full ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{option.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  <p className="text-xs text-muted-foreground mt-2 italic">Example: {option.example}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">You can change this anytime from your settings</div>
    </div>
  );

  const renderBlocklistStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Block Unwanted Content</h2>
        <p className="text-muted-foreground">Select topics you&apos;d like to hide from your feed</p>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click on topics you want to block. These will be filtered out case-insensitively from article titles and
          content.
        </p>

        <div className="flex flex-wrap gap-2">
          {suggestedBlocklistItems.map((item) => {
            const isSelected = selectedBlocklist.includes(item);
            return (
              <Badge
                key={item}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? "hover:bg-primary/80" : "hover:bg-muted hover:border-primary/50"
                }`}
                onClick={() => handleBlocklistToggle(item)}
              >
                {item}
                {isSelected && <X className="h-3 w-3 ml-1" />}
              </Badge>
            );
          })}
        </div>

        {selectedBlocklist.length > 0 && (
          <div className="text-sm text-muted-foreground">Selected: {selectedBlocklist.join(", ")}</div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Pro tip:</strong> You can add custom keywords anytime from the settings page or directly from the
          main feed using the quick edit feature.
        </p>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-full">
          <Smile className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">All Set! 🎉</h2>
        <p className="text-muted-foreground">Your personalized news feed is ready. Enjoy reading!</p>
      </div>

      {selectedMood && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Your preferences:</strong>
          </p>
          <div className="flex items-center justify-center space-x-2 mt-2">
            {moodOptions.find((m) => m.value === selectedMood)?.icon}
            <span>{moodOptions.find((m) => m.value === selectedMood)?.label} mood</span>
            {selectedBlocklist.length > 0 && <span>• {selectedBlocklist.length} blocked topics</span>}
          </div>
        </div>
      )}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "welcome":
        return renderWelcomeStep();
      case "mood":
        return renderMoodStep();
      case "blocklist":
        return renderBlocklistStep();
      case "complete":
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "mood":
        return selectedMood !== null;
      case "blocklist":
        return true; // Optional step
      default:
        return true;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
          }
        }}
        role="presentation"
        tabIndex={-1}
      />

      {/* Modal */}
      <div className="relative bg-background border rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Progress value={progress} className="flex-1 mr-4" />
            <h2 className="sr-only">Personalization Setup</h2>
          </div>

          {currentStep !== "complete" && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <button onClick={handleSkip} className="text-muted-foreground hover:text-foreground underline">
                Skip for now
              </button>
            </div>
          )}

          <div className="py-4">{renderCurrentStep()}</div>

          <div className="flex justify-between pt-4 border-t">
            {currentStepIndex > 0 && currentStep !== "complete" && (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            <div className="flex-1" />

            {currentStep === "complete" ? (
              <Button onClick={onClose} className="min-w-[100px]">
                Get Started
              </Button>
            ) : (
              <Button
                onClick={currentStep === "blocklist" ? handleComplete : handleNext}
                disabled={!canProceed() || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  "Saving..."
                ) : currentStep === "blocklist" ? (
                  "Complete Setup"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
