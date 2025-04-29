export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          clerk_id: string
          email: string
          created_at: string
          updated_at: string
          subscription_tier: string
        }
        Insert: {
          id?: string
          clerk_id: string
          email: string
          created_at?: string
          updated_at?: string
          subscription_tier?: string
        }
        Update: {
          id?: string
          clerk_id?: string
          email?: string
          created_at?: string
          updated_at?: string
          subscription_tier?: string
        }
      }
      generations: {
        Row: {
          id: string
          user_id: string
          created_at: string
          platform: string
          character_count: number
          title: string | null
          content_snippet: string | null
          content: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          platform: string
          character_count: number
          title?: string | null
          content_snippet?: string | null
          content?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          platform?: string
          character_count?: number
          title?: string | null
          content_snippet?: string | null
          content?: string | null
        }
      }
      subscription_tiers: {
        Row: {
          id: string
          name: string
          daily_generation_limit: number
          platform_limit: number
          max_character_count: number
          price_monthly: number
          price_yearly: number
          is_default: boolean
        }
        Insert: {
          id?: string
          name: string
          daily_generation_limit: number
          platform_limit: number
          max_character_count: number
          price_monthly: number
          price_yearly: number
          is_default?: boolean
        }
        Update: {
          id?: string
          name?: string
          daily_generation_limit?: number
          platform_limit?: number
          max_character_count?: number
          price_monthly?: number
          price_yearly?: number
          is_default?: boolean
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          stripe_subscription_id: string | null
          status: 'active' | 'canceled' | 'past_due' | 'trialing'
          current_period_end: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: string
          stripe_subscription_id?: string | null
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          stripe_subscription_id?: string | null
          status?: 'active' | 'canceled' | 'past_due' | 'trialing'
          current_period_end?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
