export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  openclaw: {
    Tables: {
      compiled_skills: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string
          content_hash: string
          skill_class: string
          source_markdown: string
          compiled_script: string | null
          verified: boolean | null
          compiled_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string
          content_hash: string
          skill_class: string
          source_markdown: string
          compiled_script?: string | null
          verified?: boolean | null
          compiled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          description?: string
          content_hash?: string
          skill_class?: string
          source_markdown?: string
          compiled_script?: string | null
          verified?: boolean | null
          compiled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          id: string
          user_id: string | null
          platform: string
          token: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          platform: string
          token: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          platform?: string
          token?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_queue: {
        Row: {
          id: string
          user_id: string | null
          service: string
          event_type: string
          metadata: Json | null
          delivered: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          service: string
          event_type: string
          metadata?: Json | null
          delivered?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          service?: string
          event_type?: string
          metadata?: Json | null
          delivered?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      webhook_registrations: {
        Row: {
          id: string
          user_id: string | null
          service: string
          external_id: string | null
          webhook_secret: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          service: string
          external_id?: string | null
          webhook_secret?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          service?: string
          external_id?: string | null
          webhook_secret?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      comment_flags: {
        Row: {
          comment_id: string
          created_at: string
          details: string | null
          id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_flags_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
          vote_value: number
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
          vote_value: number
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
          vote_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          content_slug: string
          content_type: string
          created_at: string
          downvotes: number
          edited_at: string | null
          flagged_count: number
          id: string
          is_deleted: boolean
          is_edited: boolean
          parent_id: string | null
          score: number | null
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          body: string
          content_slug: string
          content_type: string
          created_at?: string
          downvotes?: number
          edited_at?: string | null
          flagged_count?: number
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          parent_id?: string | null
          score?: number | null
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          body?: string
          content_slug?: string
          content_type?: string
          created_at?: string
          downvotes?: number
          edited_at?: string | null
          flagged_count?: number
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          parent_id?: string | null
          score?: number | null
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      community_profiles: {
        Row: {
          ban_reason: string | null
          comment_count: number
          created_at: string
          display_name: string
          handle: string | null
          institution: string | null
          is_banned: boolean
          is_moderator: boolean
          reputation: number
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          comment_count?: number
          created_at?: string
          display_name: string
          handle?: string | null
          institution?: string | null
          is_banned?: boolean
          is_moderator?: boolean
          reputation?: number
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          comment_count?: number
          created_at?: string
          display_name?: string
          handle?: string | null
          institution?: string | null
          is_banned?: boolean
          is_moderator?: boolean
          reputation?: number
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compiled_data: {
        Row: {
          description: string | null
          file_name: string
          file_size_bytes: number | null
          sha256: string
          storage_path: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          sha256: string
          storage_path: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          sha256?: string
          storage_path?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cross_refs: {
        Row: {
          context: string | null
          id: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          context?: string | null
          id?: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Update: {
          context?: string | null
          id?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      derivation_sections: {
        Row: {
          color: string
          description: string | null
          id: number
          lean_section_name: string | null
          marquee_count: number | null
          number: number
          theorem_count: number | null
          title: string
        }
        Insert: {
          color: string
          description?: string | null
          id?: number
          lean_section_name?: string | null
          marquee_count?: number | null
          number: number
          theorem_count?: number | null
          title: string
        }
        Update: {
          color?: string
          description?: string | null
          id?: number
          lean_section_name?: string | null
          marquee_count?: number | null
          number?: number
          theorem_count?: number | null
          title?: string
        }
        Relationships: []
      }
      figure_tests: {
        Row: {
          figure_id: string
          sort_order: number | null
          test_slug: string
        }
        Insert: {
          figure_id: string
          sort_order?: number | null
          test_slug: string
        }
        Update: {
          figure_id?: string
          sort_order?: number | null
          test_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "figure_tests_figure_id_fkey"
            columns: ["figure_id"]
            isOneToOne: false
            referencedRelation: "figures"
            referencedColumns: ["id"]
          },
        ]
      }
      figure_theorems: {
        Row: {
          figure_id: string
          sort_order: number | null
          theorem_name: string
        }
        Insert: {
          figure_id: string
          sort_order?: number | null
          theorem_name: string
        }
        Update: {
          figure_id?: string
          sort_order?: number | null
          theorem_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "figure_theorems_figure_id_fkey"
            columns: ["figure_id"]
            isOneToOne: false
            referencedRelation: "figures"
            referencedColumns: ["id"]
          },
        ]
      }
      figure_wiki_pages: {
        Row: {
          figure_id: string
          sort_order: number | null
          wiki_slug: string
        }
        Insert: {
          figure_id: string
          sort_order?: number | null
          wiki_slug: string
        }
        Update: {
          figure_id?: string
          sort_order?: number | null
          wiki_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "figure_wiki_pages_figure_id_fkey"
            columns: ["figure_id"]
            isOneToOne: false
            referencedRelation: "figures"
            referencedColumns: ["id"]
          },
        ]
      }
      figures: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string | null
          data_sources: string[] | null
          file_size: number | null
          generation_code: string | null
          generation_command: string | null
          height: number | null
          id: string
          paper_number: number | null
          public_url: string
          slug: string
          source_script: string | null
          storage_path: string
          title: string
          updated_at: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          data_sources?: string[] | null
          file_size?: number | null
          generation_code?: string | null
          generation_command?: string | null
          height?: number | null
          id?: string
          paper_number?: number | null
          public_url: string
          slug: string
          source_script?: string | null
          storage_path: string
          title: string
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string | null
          data_sources?: string[] | null
          file_size?: number | null
          generation_code?: string | null
          generation_command?: string | null
          height?: number | null
          id?: string
          paper_number?: number | null
          public_url?: string
          slug?: string
          source_script?: string | null
          storage_path?: string
          title?: string
          updated_at?: string | null
          width?: number | null
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_id: string
          body: string
          body_html: string | null
          created_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          parent_id: string | null
          topic_id: string
          updated_at: string | null
          vote_score: number | null
        }
        Insert: {
          author_id: string
          body: string
          body_html?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          parent_id?: string | null
          topic_id: string
          updated_at?: string | null
          vote_score?: number | null
        }
        Update: {
          author_id?: string
          body?: string
          body_html?: string | null
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          parent_id?: string | null
          topic_id?: string
          updated_at?: string | null
          vote_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          body: string
          body_html: string | null
          category_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          last_activity_at: string | null
          related_slug: string | null
          related_type: string | null
          reply_count: number | null
          slug: string
          title: string
          view_count: number | null
          vote_score: number | null
        }
        Insert: {
          author_id: string
          body: string
          body_html?: string | null
          category_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          related_slug?: string | null
          related_type?: string | null
          reply_count?: number | null
          slug: string
          title: string
          view_count?: number | null
          vote_score?: number | null
        }
        Update: {
          author_id?: string
          body?: string
          body_html?: string | null
          category_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_activity_at?: string | null
          related_slug?: string | null
          related_type?: string | null
          reply_count?: number | null
          slug?: string
          title?: string
          view_count?: number | null
          vote_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "forum_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          created_at: string | null
          id: string
          target_id: string
          target_type: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          target_id: string
          target_type: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "community_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      marquee_theorems: {
        Row: {
          check_comment: string | null
          id: number
          section_id: number | null
          sort_order: number
          subsection: string | null
          theorem_id: string | null
        }
        Insert: {
          check_comment?: string | null
          id?: number
          section_id?: number | null
          sort_order: number
          subsection?: string | null
          theorem_id?: string | null
        }
        Update: {
          check_comment?: string | null
          id?: number
          section_id?: number | null
          sort_order?: number
          subsection?: string | null
          theorem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marquee_theorems_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "derivation_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marquee_theorems_theorem_id_fkey"
            columns: ["theorem_id"]
            isOneToOne: false
            referencedRelation: "theorems"
            referencedColumns: ["id"]
          },
        ]
      }
      papers: {
        Row: {
          abstract: string | null
          authors: string[] | null
          bibliography: Json | null
          body_md: string | null
          created_at: string | null
          date: string | null
          id: string
          number: string | null
          paper_number: number | null
          related_test_slugs: string[] | null
          related_theorem_names: string[] | null
          related_wiki_slugs: string[] | null
          section_anchors: Json | null
          slug: string
          status: string | null
          target_journal: string | null
          title: string
          toc: Json | null
          updated_at: string | null
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          bibliography?: Json | null
          body_md?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          number?: string | null
          paper_number?: number | null
          related_test_slugs?: string[] | null
          related_theorem_names?: string[] | null
          related_wiki_slugs?: string[] | null
          section_anchors?: Json | null
          slug: string
          status?: string | null
          target_journal?: string | null
          title: string
          toc?: Json | null
          updated_at?: string | null
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          bibliography?: Json | null
          body_md?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          number?: string | null
          paper_number?: number | null
          related_test_slugs?: string[] | null
          related_theorem_names?: string[] | null
          related_wiki_slugs?: string[] | null
          section_anchors?: Json | null
          slug?: string
          status?: string | null
          target_journal?: string | null
          title?: string
          toc?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          category: string | null
          confidence: string | null
          created_at: string | null
          data_manifest: Json | null
          data_sources: string[] | null
          description: string | null
          evaluation_md: string | null
          figure_paths: string[] | null
          id: string
          last_run_at: string | null
          name: string
          reproduction_steps: string | null
          run_duration_sec: number | null
          script_path: string | null
          search_vector: unknown
          slug: string
          source_code: string | null
          statistics: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          confidence?: string | null
          created_at?: string | null
          data_manifest?: Json | null
          data_sources?: string[] | null
          description?: string | null
          evaluation_md?: string | null
          figure_paths?: string[] | null
          id?: string
          last_run_at?: string | null
          name: string
          reproduction_steps?: string | null
          run_duration_sec?: number | null
          script_path?: string | null
          search_vector?: unknown
          slug: string
          source_code?: string | null
          statistics?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          confidence?: string | null
          created_at?: string | null
          data_manifest?: Json | null
          data_sources?: string[] | null
          description?: string | null
          evaluation_md?: string | null
          figure_paths?: string[] | null
          id?: string
          last_run_at?: string | null
          name?: string
          reproduction_steps?: string | null
          run_duration_sec?: number | null
          script_path?: string | null
          search_vector?: unknown
          slug?: string
          source_code?: string | null
          statistics?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      theorem_deps: {
        Row: {
          from_id: string
          to_id: string
        }
        Insert: {
          from_id: string
          to_id: string
        }
        Update: {
          from_id?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theorem_deps_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "theorems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theorem_deps_to_id_fkey"
            columns: ["to_id"]
            isOneToOne: false
            referencedRelation: "theorems"
            referencedColumns: ["id"]
          },
        ]
      }
      theorems: {
        Row: {
          category: string | null
          created_at: string | null
          display_name: string | null
          docstring: string | null
          file_path: string
          id: string
          is_marquee: boolean | null
          kind: string
          line_number: number | null
          name: string
          paper: string | null
          search_vector: unknown
          section: string | null
          section_id: number | null
          source_code: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          display_name?: string | null
          docstring?: string | null
          file_path: string
          id?: string
          is_marquee?: boolean | null
          kind: string
          line_number?: number | null
          name: string
          paper?: string | null
          search_vector?: unknown
          section?: string | null
          section_id?: number | null
          source_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          display_name?: string | null
          docstring?: string | null
          file_path?: string
          id?: string
          is_marquee?: boolean | null
          kind?: string
          line_number?: number | null
          name?: string
          paper?: string | null
          search_vector?: unknown
          section?: string | null
          section_id?: number | null
          source_code?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "theorems_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "derivation_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_categories: {
        Row: {
          color: string
          description: string | null
          icon: string | null
          id: number
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          color: string
          description?: string | null
          icon?: string | null
          id?: number
          slug: string
          sort_order: number
          title: string
        }
        Update: {
          color?: string
          description?: string | null
          icon?: string | null
          id?: number
          slug?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      wiki_pages: {
        Row: {
          body_md: string
          category_id: number | null
          created_at: string | null
          demo_component: string | null
          demo_config: Json | null
          id: string
          related_pages: string[] | null
          related_paper_slugs: string[] | null
          search_vector: unknown
          slug: string
          summary: string
          title: string
          updated_at: string | null
        }
        Insert: {
          body_md: string
          category_id?: number | null
          created_at?: string | null
          demo_component?: string | null
          demo_config?: Json | null
          id?: string
          related_pages?: string[] | null
          related_paper_slugs?: string[] | null
          search_vector?: unknown
          slug: string
          summary: string
          title: string
          updated_at?: string | null
        }
        Update: {
          body_md?: string
          category_id?: number | null
          created_at?: string | null
          demo_component?: string | null
          demo_config?: Json | null
          id?: string
          related_pages?: string[] | null
          related_paper_slugs?: string[] | null
          search_vector?: unknown
          slug?: string
          summary?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "wiki_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      wiki_scores: {
        Row: {
          algo_details: Json | null
          article_quality: number
          economic_importance: number
          empirical_coverage: number
          id: string
          impact_score: number
          importance_reasoning: string | null
          model_used: string | null
          novelty: number
          novelty_reasoning: string | null
          quality_reasoning: string | null
          scored_at: string | null
          theoretical_coverage: number
          wiki_slug: string
        }
        Insert: {
          algo_details?: Json | null
          article_quality: number
          economic_importance: number
          empirical_coverage: number
          id?: string
          impact_score: number
          importance_reasoning?: string | null
          model_used?: string | null
          novelty: number
          novelty_reasoning?: string | null
          quality_reasoning?: string | null
          scored_at?: string | null
          theoretical_coverage: number
          wiki_slug: string
        }
        Update: {
          algo_details?: Json | null
          article_quality?: number
          economic_importance?: number
          empirical_coverage?: number
          id?: string
          impact_score?: number
          importance_reasoning?: string | null
          model_used?: string | null
          novelty?: number
          novelty_reasoning?: string | null
          quality_reasoning?: string | null
          scored_at?: string | null
          theoretical_coverage?: number
          wiki_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_scores_wiki_slug_fkey"
            columns: ["wiki_slug"]
            isOneToOne: true
            referencedRelation: "wiki_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      wiki_test_links: {
        Row: {
          created_at: string | null
          test_slug: string
          wiki_slug: string
        }
        Insert: {
          created_at?: string | null
          test_slug: string
          wiki_slug: string
        }
        Update: {
          created_at?: string | null
          test_slug?: string
          wiki_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_test_links_wiki_slug_fkey"
            columns: ["wiki_slug"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
      wiki_theorem_links: {
        Row: {
          created_at: string | null
          theorem_name: string
          wiki_slug: string
        }
        Insert: {
          created_at?: string | null
          theorem_name: string
          wiki_slug: string
        }
        Update: {
          created_at?: string | null
          theorem_name?: string
          wiki_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "wiki_theorem_links_theorem_name_fkey"
            columns: ["theorem_name"]
            isOneToOne: false
            referencedRelation: "theorems"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "wiki_theorem_links_wiki_slug_fkey"
            columns: ["wiki_slug"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      dangling_test_refs: {
        Row: {
          test_slug: string | null
          wiki_slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wiki_test_links_wiki_slug_fkey"
            columns: ["wiki_slug"]
            isOneToOne: false
            referencedRelation: "wiki_pages"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_dep_tree: {
        Args: { max_depth?: number; root_name: string }
        Returns: {
          depth: number
          from_name: string
          kind: string
          status: string
          to_name: string
          type: string
        }[]
      }
      section_status_counts: {
        Args: never
        Returns: {
          cnt: number
          section_id: number
          status: string
        }[]
      }
      set_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
