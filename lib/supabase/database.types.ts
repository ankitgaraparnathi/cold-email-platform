export type Profile = {
  id: string;
  email: string | null;
  full_name: string;
  company_name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type Mailbox = {
  id: string;
  user_id: string;
  email: string;
  provider: "gmail" | "microsoft365" | "yahoo";
  app_password_encrypted: string;
  status: "connected" | "disconnected";
  created_at: string;
  updated_at: string;
};

export type LeadList = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
};

export type Lead = {
  id: string;
  user_id: string;
  lead_list_id: string;
  name: string;
  email: string;
  company: string;
  job_title: string;
  website: string;
  created_at: string;
};

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  lead_list_id: string;
  mailbox_id: string;
  status: "draft" | "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
};

export type SequenceStep = {
  id: string;
  user_id: string;
  campaign_id: string;
  step_number: number;
  subject: string;
  body: string;
  delay_days: number;
  created_at: string;
};

export type CampaignEvent = {
  id: string;
  user_id: string;
  campaign_id: string;
  lead_id: string | null;
  event_type: "sent" | "opened" | "replied" | "bounced" | "failed";
  occurred_at: string;
  metadata: Record<string, unknown>;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        Pick<Profile, "id"> &
          Partial<
            Pick<
              Profile,
              "email" | "full_name" | "company_name" | "timezone"
            >
          >
      >;
      mailboxes: Table<
        Mailbox,
        Pick<
          Mailbox,
          "email" | "provider" | "app_password_encrypted"
        > &
          Partial<Pick<Mailbox, "status">>
      >;
      lead_lists: Table<
        LeadList,
        Pick<LeadList, "name"> & Partial<Pick<LeadList, "description">>
      >;
      leads: Table<
        Lead,
        Pick<Lead, "lead_list_id" | "email"> &
          Partial<Pick<Lead, "name" | "company" | "job_title" | "website">>
      >;
      campaigns: Table<
        Campaign,
        Pick<Campaign, "name" | "lead_list_id" | "mailbox_id"> &
          Partial<Pick<Campaign, "status">>
      >;
      sequence_steps: Table<
        SequenceStep,
        Pick<
          SequenceStep,
          "campaign_id" | "step_number" | "subject" | "body"
        > &
          Partial<Pick<SequenceStep, "delay_days">>
      >;
      campaign_events: Table<
        CampaignEvent,
        Pick<CampaignEvent, "campaign_id" | "event_type"> &
          Partial<Pick<CampaignEvent, "lead_id" | "metadata">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
