"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Share2,
  BarChart3,
  Zap,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { DashboardPreview } from "@/components/dashboard-preview";

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleGetStarted = async () => {
    if (!isLoaded) return;

    try {
      setIsNavigating(true);
      if (isSignedIn) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/sign-in";
      }
    } catch (error) {
      console.error("Navigation error:", error);
      window.location.href = isSignedIn ? "/dashboard" : "/sign-in";
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 md:pt-24 lg:pt-32 pb-16 md:pb-24 overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Transform Your Content Across
              <span className="text-primary relative ml-3">
                All Platforms
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-primary/30"
                  viewBox="0 0 100 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0,20 C25,10 75,10 100,20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                </svg>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Instantly repurpose your content for social media, emails, and
              more with AI. Save hours of work with one-click optimizations for
              each platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gap-2 text-base py-6"
                onClick={handleGetStarted}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                disabled={isNavigating || !isLoaded}
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isHovering ? "translate-x-1" : ""
                      }`}
                    />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2 text-base py-6"
                onClick={() => scrollToSection("how-it-works")}
              >
                See How It Works
              </Button>
            </div>
          </div>

        <div className="relative mx-auto max-w-5xl rounded-xl shadow-2xl shadow-primary/20 border overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 h-20 bottom-0 top-auto" />
                <Image
                    src="/dashboard-preview.png"
                    alt="Dashboard Preview Image"
                    width={1920}
                    height={1080}
                    className="object-cover w-full h-auto z-0"
                    quality={100}
                    priority
                />
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50" id="features">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need To Maximize Your Reach
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="h-8 w-8 text-primary" />}
              title="AI-Powered Repurposing"
              description="Instantly transform your long-form content into platform-specific formats with our advanced AI technology."
            />
            <FeatureCard
              icon={<Share2 className="h-8 w-8 text-primary" />}
              title="Multi-Platform Support"
              description="Optimize for Twitter, LinkedIn, Instagram, Facebook, Email newsletters and more in seconds."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="Time-Saving Workflows"
              description="What used to take hours now takes minutes. Focus on strategy, not reformatting."
            />
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8 text-primary" />}
              title="Tone & Voice Control"
              description="Maintain your brand's unique voice across all platforms with customizable settings."
            />
            <div className="bg-primary/10 rounded-xl p-6 flex flex-col items-center justify-center border border-primary/20 h-full">
              <h3 className="text-xl font-semibold mb-2">Ready to start?</h3>
              <p className="text-muted-foreground text-center mb-4">
                Try our tool today and see the difference.
              </p>
              <Button
                onClick={handleGetStarted}
                disabled={isNavigating || !isLoaded}
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4" id="how-it-works">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-12">
            <Step
              number={1}
              title="Input Your Content"
              description="Paste your article, blog post, or any long-form content into our editor. You can also import directly from a URL."
            />
            <Step
              number={2}
              title="Select Your Platforms"
              description="Choose which social media platforms and formats you want to repurpose your content for."
            />
            <Step
              number={3}
              title="Generate & Customize"
              description="Our AI generates platform-optimized versions of your content. Make any adjustments needed to perfect the tone and style."
            />
            <Step
              number={4}
              title="Export & Share"
              description="Export your repurposed content directly or schedule it through your favorite social media management tools."
            />
          </div>
          <div className="mt-16 text-center">
            <Button
              size="lg"
              onClick={handleGetStarted}
              disabled={isNavigating || !isLoaded}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                "Start Now!"
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-muted/30 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <h3 className="text-xl font-bold">Contentful.AI</h3>
              <p className="text-muted-foreground">
                Maximize your media presence.
              </p>
            </div>
            <div className="flex gap-8">
              <Link
                href="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Contentful.AI. All
            rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-background rounded-xl p-6 shadow-sm border h-full">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
          {number}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
