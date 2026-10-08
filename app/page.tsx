"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  FileUp,
  ListChecks,
  LogOut,
  Mail,
  Plus,
  Send,
  Settings,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Campaign,
  CampaignEvent,
  Lead,
  LeadList,
  Mailbox,
  Profile,
  SequenceStep,
} from "@/lib/supabase/database.types";

type Section =
  | "dashboard"
  | "mailboxes"
  | "lead-lists"
  | "leads"
  | "campaigns"
  | "sequences"
  | "activity"
  | "analytics"
  | "settings";

type Notice = { type: "success" | "error"; text: string } | null;
type MailboxSummary = Pick<
  Mailbox,
  "id" | "email" | "provider" | "status" | "created_at"
>;

const pageSize = 500;

async function fetchAllPages<Row>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: Row[] | null;
    error: { message: string } | null;
  }>,
): Promise<Row[]> {
  const rows: Row[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

const navigation: {
  id: Section;
  label: string;
  icon: typeof Activity;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "mailboxes", label: "Mailboxes", icon: Mail },
  { id: "lead-lists", label: "Lead Lists", icon: ListChecks },
  { id: "leads", label: "Leads", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Send },
  { id: "sequences", label: "Sequence Builder", icon: ListChecks },
  { id: "activity", label: "Campaign Activity", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (quoted && character === '"' && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (quoted && character === '"') {
      quoted = false;
    } else if (!quoted && character === '"' && field.trim() === "") {
      field = "";
      quoted = true;
    } else if (!quoted && character === ",") {
      row.push(field.trim());
      field = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("The CSV file contains an unterminated quoted field.");
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([]);
  const [leadLists, setLeadLists] = useState<LeadList[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([]);
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  const [mailboxEmail, setMailboxEmail] = useState("");
  const [mailboxPassword, setMailboxPassword] = useState("");
  const [mailboxProvider, setMailboxProvider] = useState<
    "gmail" | "microsoft365" | "yahoo"
  >("gmail");
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [leadListId, setLeadListId] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadJobTitle, setLeadJobTitle] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignLeadListId, setCampaignLeadListId] = useState("");
  const [campaignMailboxId, setCampaignMailboxId] = useState("");
  const [stepSubject, setStepSubject] = useState("");
  const [stepBody, setStepBody] = useState("");
  const [stepDelay, setStepDelay] = useState("0");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [timezone, setTimezone] = useState("UTC");

  const loadData = useCallback(async () => {
    if (!supabase) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      setIsLoading(true);
      setNotice(null);
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserEmail(user.email ?? "");

      const [
        profileResult,
        mailboxRows,
        listRows,
        leadRows,
        campaignRows,
        stepRows,
        eventRows,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        fetchAllPages((from, to) =>
          supabase
            .from("mailboxes")
            .select("id, email, provider, status, created_at")
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("lead_lists")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("leads")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("campaigns")
            .select("*")
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("sequence_steps")
            .select("*")
            .order("campaign_id")
            .order("step_number")
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("campaign_events")
            .select("*")
            .order("occurred_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
        ),
      ]);

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = profileResult.data;
      setProfile(loadedProfile);
      setFullName(loadedProfile?.full_name ?? "");
      setCompanyName(loadedProfile?.company_name ?? "");
      setTimezone(loadedProfile?.timezone ?? "UTC");
      setMailboxes(mailboxRows);
      setLeadLists(listRows);
      setLeads(leadRows);
      setCampaigns(campaignRows);
      setSequenceSteps(stepRows);
      setEvents(eventRows);
      setSelectedCampaignId((current) => current || campaignRows[0]?.id || "");
    } catch (error: unknown) {
      setIsLoading(false);
      setNotice({ type: "error", text: `Unable to load workspace: ${messageFor(error)}` });
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    // This starts an async Supabase request; state updates happen after its response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.email, lead.company, lead.job_title]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [leads, search]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const selectedSteps = sequenceSteps.filter((step) => step.campaign_id === selectedCampaignId);

  const perform = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setIsSaving(true);
    setNotice(null);
    try {
      await action();
      await loadData();
      setNotice({ type: "success", text: successMessage });
    } catch (error: unknown) {
      setNotice({ type: "error", text: messageFor(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMailboxSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await perform(async () => {
      const response = await fetch("/api/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mailboxEmail,
          appPassword: mailboxPassword,
          provider: mailboxProvider,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Mailbox could not be connected.");
      }
      setMailboxEmail("");
      setMailboxPassword("");
    }, "Mailbox verified and saved.");
  };

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    await perform(async () => {
      const { error } = await supabase
        .from("lead_lists")
        .insert({ name: listName.trim(), description: listDescription.trim() });
      if (error) throw error;
      setListName("");
      setListDescription("");
    }, "Lead list created.");
  };

  const insertLeads = async (
    listId: string,
    records: {
      name: string;
      email: string;
      company: string;
      job_title: string;
      website: string;
    }[],
  ) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    if (records.length === 0) throw new Error("No valid lead rows were found.");
    for (let offset = 0; offset < records.length; offset += pageSize) {
      const chunk = records.slice(offset, offset + pageSize);
      const { error } = await supabase
        .from("leads")
        .upsert(
          chunk.map((record) => ({ ...record, lead_list_id: listId })),
          { onConflict: "user_id,lead_list_id,email", ignoreDuplicates: true },
        );
      if (error) {
        throw new Error(
          `Import stopped after processing ${offset} of ${records.length} rows: ${error.message}`,
        );
      }
    }
  };

  const handleCreateLead = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !leadListId) return;
    await perform(async () => {
      const { error } = await supabase.from("leads").insert({
        lead_list_id: leadListId,
        name: leadName.trim(),
        email: leadEmail.trim().toLowerCase(),
        company: leadCompany.trim(),
        job_title: leadJobTitle.trim(),
      });
      if (error) throw error;
      setLeadName("");
      setLeadEmail("");
      setLeadCompany("");
      setLeadJobTitle("");
    }, "Lead added.");
  };

  const handleCsvImport = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!leadListId) {
      setNotice({ type: "error", text: "Create or select a lead list first." });
      return;
    }

    await perform(async () => {
      const rows = csvRows(await file.text());
      if (rows.length < 2) throw new Error("CSV must include a header and at least one lead.");
      const headers = rows[0].map((header) =>
        header.trim().toLowerCase().replaceAll(" ", "_"),
      );
      const emailIndex = headers.indexOf("email");
      if (emailIndex === -1) throw new Error('CSV needs an "email" column.');
      const at = (row: string[], header: string) => {
        const index = headers.indexOf(header);
        return index < 0 ? "" : row[index] ?? "";
      };
      const importedLeads = rows.slice(1).flatMap((row) => {
        const email = at(row, "email").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return [];
        return [
          {
            name: at(row, "name"),
            email,
            company: at(row, "company"),
            job_title: at(row, "job_title"),
            website: at(row, "website"),
          },
        ];
      });
      await insertLeads(leadListId, importedLeads);
    }, "CSV leads imported; existing addresses were skipped.");
  };

  const handleCreateCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    await perform(async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: campaignName.trim(),
          lead_list_id: campaignLeadListId,
          mailbox_id: campaignMailboxId,
          status: "draft",
        })
        .select("id")
        .single();
      if (error) throw error;
      setCampaignName("");
      setSelectedCampaignId(data.id);
    }, "Campaign draft created.");
  };

  const handleAddStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !selectedCampaignId) return;
    await perform(async () => {
      const { error } = await supabase.from("sequence_steps").insert({
        campaign_id: selectedCampaignId,
        step_number: selectedSteps.length + 1,
        subject: stepSubject.trim(),
        body: stepBody.trim(),
        delay_days: Number(stepDelay),
      });
      if (error) throw error;
      setStepSubject("");
      setStepBody("");
      setStepDelay("0");
    }, "Sequence step saved.");
  };

  const handleSaveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !profile) return;
    await perform(async () => {
      const { error } = await supabase.from("profiles").upsert({
        id: profile.id,
        email: userEmail,
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        timezone,
      });
      if (error) throw error;
    }, "Workspace settings saved.");
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setNotice({ type: "error", text: `Sign out failed: ${error.message}` });
      return;
    }
    router.replace("/login");
    router.refresh();
  };

  const title =
    navigation.find((item) => item.id === activeSection)?.label ?? "Dashboard";
  const uniqueLeadCount = (
    rows: CampaignEvent[],
    eventType: CampaignEvent["event_type"],
  ) =>
    new Set(
      rows
        .filter((event) => event.event_type === eventType && event.lead_id)
        .map((event) => `${event.campaign_id}:${event.lead_id}`),
    ).size;
  const sentCount = events.filter((event) => event.event_type === "sent").length;
  const sentRecipientCount = uniqueLeadCount(events, "sent");
  const openedCount = uniqueLeadCount(events, "opened");
  const repliedCount = uniqueLeadCount(events, "replied");
  const bouncedCount = events.filter((event) => event.event_type === "bounced").length;
  const openRate = sentRecipientCount
    ? Math.round((openedCount / sentRecipientCount) * 100)
    : 0;
  const replyRate = sentRecipientCount
    ? Math.round((repliedCount / sentRecipientCount) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Mail aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">Outreach</span>
        </div>
        <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={activeSection === id ? "page" : undefined}
              onClick={() => {
                setActiveSection(id);
                setNotice(null);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                activeSection === id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-xs text-slate-500">{userEmail}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Workspace
              </p>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              {activeSection === "leads" && (
                <label className="hidden cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 sm:flex">
                  <FileUp aria-hidden="true" className="h-4 w-4" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvImport}
                    className="sr-only"
                    aria-label="Import leads from CSV"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              >
                <LogOut aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>
          <nav
            aria-label="Mobile navigation"
            className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden"
          >
            {navigation.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                aria-current={activeSection === id ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  activeSection === id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
          {notice && (
            <div
              role={notice.type === "error" ? "alert" : "status"}
              className={`rounded-lg border px-4 py-3 text-sm ${
                notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}
            >
              {notice.text}
            </div>
          )}

          {!supabase ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <h2 className="font-semibold">Connect a Supabase project</h2>
              <p className="mt-2">
                Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY,
                then apply the database migration to enable workspace features.
              </p>
            </section>
          ) : isLoading ? (
            <section
              aria-live="polite"
              className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500"
            >
              Loading workspace data...
            </section>
          ) : (
            <>
              {activeSection === "dashboard" && (
                <>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Good day{profile?.full_name ? `, ${profile.full_name}` : ""}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Live activity from your workspace data.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Emails sent", sentCount.toLocaleString()],
                      ["Open rate", `${openRate}%`],
                      ["Reply rate", `${replyRate}%`],
                      ["Bounces", bouncedCount.toLocaleString()],
                    ].map(([label, value]) => (
                      <article
                        key={label}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-500">{label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Calculated from recorded campaign events
                        </p>
                      </article>
                    ))}
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h3 className="font-semibold">Campaigns</h3>
                      <div className="mt-4 space-y-3">
                        {campaigns.length ? (
                          campaigns.slice(0, 5).map((campaign) => (
                            <div
                              key={campaign.id}
                              className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{campaign.name}</p>
                                <p className="text-xs text-slate-500">
                                  {campaign.status} ·{" "}
                                  {leads.filter((lead) => lead.lead_list_id === campaign.lead_list_id).length}{" "}
                                  leads
                                </p>
                              </div>
                              <span className="text-xs text-slate-400">
                                {new Date(campaign.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <EmptyState text="Create a campaign to see it here." />
                        )}
                      </div>
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h3 className="font-semibold">Recent activity</h3>
                      <div className="mt-4 space-y-3">
                        {events.slice(0, 5).length ? (
                          events.slice(0, 5).map((event) => (
                            <EventRow key={event.id} event={event} campaigns={campaigns} />
                          ))
                        ) : (
                          <EmptyState text="Campaign events will appear here when recorded." />
                        )}
                      </div>
                    </section>
                  </div>
                </>
              )}

              {activeSection === "mailboxes" && (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Connect a mailbox</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Credentials are verified with the provider and encrypted before storage.
                    </p>
                    <form onSubmit={handleMailboxSubmit} className="mt-5 space-y-4">
                      <Field label="Mailbox email" htmlFor="mailbox-email">
                        <input
                          id="mailbox-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={mailboxEmail}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setMailboxEmail(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Provider" htmlFor="mailbox-provider">
                        <select
                          id="mailbox-provider"
                          value={mailboxProvider}
                          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                            setMailboxProvider(
                              event.target.value as "gmail" | "microsoft365" | "yahoo",
                            )
                          }
                          className={inputClass}
                        >
                          <option value="gmail">Google / Gmail</option>
                          <option value="microsoft365">Microsoft 365</option>
                          <option value="yahoo">Yahoo</option>
                        </select>
                      </Field>
                      <Field label="App password" htmlFor="mailbox-password">
                        <input
                          id="mailbox-password"
                          type="password"
                          required
                          autoComplete="new-password"
                          value={mailboxPassword}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setMailboxPassword(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <button type="submit" disabled={isSaving} className={primaryButton}>
                        {isSaving ? "Verifying..." : "Test connection and save"}
                      </button>
                    </form>
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Connected mailboxes</h2>
                    <div className="mt-4 space-y-3">
                      {mailboxes.length ? (
                        mailboxes.map((mailbox) => (
                          <div
                            key={mailbox.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{mailbox.email}</p>
                              <p className="text-xs capitalize text-slate-500">
                                {mailbox.provider}
                              </p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                              {mailbox.status}
                            </span>
                          </div>
                        ))
                      ) : (
                        <EmptyState text="No mailboxes connected yet." />
                      )}
                    </div>
                  </section>
                </div>
              )}

              {activeSection === "lead-lists" && (
                <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Create lead list</h2>
                    <form onSubmit={handleCreateList} className="mt-5 space-y-4">
                      <Field label="List name" htmlFor="list-name">
                        <input
                          id="list-name"
                          required
                          value={listName}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setListName(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Description" htmlFor="list-description">
                        <textarea
                          id="list-description"
                          rows={3}
                          value={listDescription}
                          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setListDescription(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <button type="submit" disabled={isSaving} className={primaryButton}>
                        <Plus aria-hidden="true" className="h-4 w-4" />
                        Create list
                      </button>
                    </form>
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Your lists</h2>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="pb-3 font-medium">List</th>
                            <th className="pb-3 font-medium">Leads</th>
                            <th className="pb-3 font-medium">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {leadLists.map((list) => (
                            <tr key={list.id}>
                              <td className="py-3">
                                <p className="font-medium">{list.name}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{list.description}</p>
                              </td>
                              <td className="py-3">
                                {leads.filter((lead) => lead.lead_list_id === list.id).length}
                              </td>
                              <td className="py-3 text-slate-500">
                                {new Date(list.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!leadLists.length && <EmptyState text="Create your first lead list." />}
                    </div>
                  </section>
                </div>
              )}

              {activeSection === "leads" && (
                <div className="space-y-6">
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">Add a lead</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Add an individual prospect or import a CSV from the header.
                        </p>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 sm:hidden">
                        <FileUp aria-hidden="true" className="h-4 w-4" />
                        Import CSV
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={handleCsvImport}
                          className="sr-only"
                          aria-label="Import leads from CSV"
                        />
                      </label>
                    </div>
                    <form
                      onSubmit={handleCreateLead}
                      className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
                    >
                      <Field label="Lead list" htmlFor="lead-list-select">
                        <select
                          id="lead-list-select"
                          required
                          value={leadListId}
                          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                            setLeadListId(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Choose a list</option>
                          {leadLists.map((list) => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Name" htmlFor="lead-name">
                        <input
                          id="lead-name"
                          value={leadName}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setLeadName(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Email" htmlFor="lead-email">
                        <input
                          id="lead-email"
                          type="email"
                          required
                          value={leadEmail}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setLeadEmail(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Company" htmlFor="lead-company">
                        <input
                          id="lead-company"
                          value={leadCompany}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setLeadCompany(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Job title" htmlFor="lead-title">
                        <input
                          id="lead-title"
                          value={leadJobTitle}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setLeadJobTitle(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <div className="sm:col-span-2 xl:col-span-5">
                        <button
                          type="submit"
                          disabled={isSaving || !leadLists.length}
                          className={primaryButton}
                        >
                          <Plus aria-hidden="true" className="h-4 w-4" />
                          Add lead
                        </button>
                      </div>
                    </form>
                  </section>
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                      <div>
                        <h2 className="font-semibold">Prospects</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {leads.length} total leads across your lists
                        </p>
                      </div>
                      <input
                        type="search"
                        aria-label="Search leads"
                        placeholder="Search leads..."
                        value={search}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setSearch(event.target.value)
                        }
                        className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-5 py-3 font-medium">Contact</th>
                            <th className="px-5 py-3 font-medium">Company</th>
                            <th className="px-5 py-3 font-medium">List</th>
                            <th className="px-5 py-3 font-medium">Added</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredLeads.map((lead) => (
                            <tr key={lead.id}>
                              <td className="px-5 py-3">
                                <p className="font-medium">{lead.name || lead.email}</p>
                                <p className="text-xs text-slate-500">{lead.email}</p>
                              </td>
                              <td className="px-5 py-3">
                                <p>{lead.company || "—"}</p>
                                <p className="text-xs text-slate-500">{lead.job_title}</p>
                              </td>
                              <td className="px-5 py-3 text-slate-600">
                                {leadLists.find((list) => list.id === lead.lead_list_id)?.name ?? "—"}
                              </td>
                              <td className="px-5 py-3 text-slate-500">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!filteredLeads.length && (
                        <EmptyState text={search ? "No matching leads." : "Add a lead or import a CSV to get started."} />
                      )}
                    </div>
                  </section>
                </div>
              )}

              {activeSection === "campaigns" && (
                <div className="space-y-6">
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Create a campaign draft</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Associate a mailbox and lead list, then build its sequence.
                    </p>
                    <form onSubmit={handleCreateCampaign} className="mt-5 grid gap-4 sm:grid-cols-3">
                      <Field label="Campaign name" htmlFor="campaign-name">
                        <input
                          id="campaign-name"
                          required
                          value={campaignName}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                            setCampaignName(event.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Lead list" htmlFor="campaign-lead-list">
                        <select
                          id="campaign-lead-list"
                          required
                          value={campaignLeadListId}
                          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                            setCampaignLeadListId(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Choose a list</option>
                          {leadLists.map((list) => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Sending mailbox" htmlFor="campaign-mailbox">
                        <select
                          id="campaign-mailbox"
                          required
                          value={campaignMailboxId}
                          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                            setCampaignMailboxId(event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="">Choose a mailbox</option>
                          {mailboxes.map((mailbox) => (
                            <option key={mailbox.id} value={mailbox.id}>{mailbox.email}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          disabled={isSaving || !leadLists.length || !mailboxes.length}
                          className={primaryButton}
                        >
                          <Plus aria-hidden="true" className="h-4 w-4" />
                          Create draft
                        </button>
                      </div>
                    </form>
                  </section>
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-5 py-3 font-medium">Campaign</th>
                            <th className="px-5 py-3 font-medium">List</th>
                            <th className="px-5 py-3 font-medium">Mailbox</th>
                            <th className="px-5 py-3 font-medium">Sequence</th>
                            <th className="px-5 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {campaigns.map((campaign) => (
                            <tr key={campaign.id}>
                              <td className="px-5 py-3 font-medium">{campaign.name}</td>
                              <td className="px-5 py-3">
                                {leadLists.find((list) => list.id === campaign.lead_list_id)?.name ?? "—"}
                              </td>
                              <td className="px-5 py-3">
                                {mailboxes.find((mailbox) => mailbox.id === campaign.mailbox_id)?.email ?? "—"}
                              </td>
                              <td className="px-5 py-3">
                                {sequenceSteps.filter((step) => step.campaign_id === campaign.id).length}{" "}
                                steps
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                    campaign.status === "draft"
                                      ? "bg-slate-100 text-slate-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  {campaign.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!campaigns.length && <EmptyState text="Create a campaign draft to get started." />}
                    </div>
                  </section>
                </div>
              )}

              {activeSection === "sequences" && (
                <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)]">
                  <section className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Choose campaign</h2>
                    <select
                      aria-label="Choose campaign for sequence"
                      value={selectedCampaignId}
                      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                        setSelectedCampaignId(event.target.value)
                      }
                      className={`${inputClass} mt-4`}
                    >
                      <option value="">Select a campaign</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                      ))}
                    </select>
                    {selectedCampaign && (
                      <p className="mt-3 text-sm text-slate-500">
                        {selectedCampaign.name} · {selectedCampaign.status}
                      </p>
                    )}
                  </section>
                  <div className="space-y-6">
                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                      <h2 className="font-semibold">Sequence steps</h2>
                      <div className="mt-4 space-y-3">
                        {selectedSteps.map((step) => (
                          <article key={step.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <h3 className="text-sm font-semibold">
                                Step {step.step_number}: {step.subject}
                              </h3>
                              <span className="shrink-0 text-xs text-slate-500">
                                {step.delay_days === 0 ? "Immediate" : `After ${step.delay_days} days`}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                              {step.body}
                            </p>
                          </article>
                        ))}
                        {!selectedSteps.length && (
                          <EmptyState text="Add the first step to this campaign's sequence." />
                        )}
                      </div>
                    </section>
                    <section className="rounded-xl border border-slate-200 bg-white p-6">
                      <h2 className="font-semibold">Add sequence step</h2>
                      <form onSubmit={handleAddStep} className="mt-5 space-y-4">
                        <Field label="Subject" htmlFor="step-subject">
                          <input
                            id="step-subject"
                            required
                            value={stepSubject}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              setStepSubject(event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Email body" htmlFor="step-body">
                          <textarea
                            id="step-body"
                            rows={6}
                            required
                            value={stepBody}
                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setStepBody(event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Wait days before this step" htmlFor="step-delay">
                          <input
                            id="step-delay"
                            type="number"
                            min="0"
                            max="365"
                            required
                            value={stepDelay}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              setStepDelay(event.target.value)
                            }
                            className={inputClass}
                          />
                        </Field>
                        <button
                          type="submit"
                          disabled={isSaving || !selectedCampaignId}
                          className={primaryButton}
                        >
                          <Plus aria-hidden="true" className="h-4 w-4" />
                          Save step
                        </button>
                      </form>
                    </section>
                  </div>
                </div>
              )}

              {activeSection === "activity" && (
                <section className="rounded-xl border border-slate-200 bg-white p-6">
                  <h2 className="font-semibold">Campaign activity</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Recent events recorded against your campaigns.
                  </p>
                  <div className="mt-5 divide-y divide-slate-100">
                    {events.map((event) => (
                      <EventRow key={event.id} event={event} campaigns={campaigns} />
                    ))}
                    {!events.length && (
                      <EmptyState text="No campaign activity has been recorded yet." />
                    )}
                  </div>
                </section>
              )}

              {activeSection === "analytics" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Emails sent" value={sentCount} />
                    <MetricCard label="Opens" value={openedCount} detail={`${openRate}% open rate`} />
                    <MetricCard label="Replies" value={repliedCount} detail={`${replyRate}% reply rate`} />
                    <MetricCard label="Bounces" value={bouncedCount} />
                  </div>
                  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="font-semibold">Campaign performance</h2>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="pb-3 font-medium">Campaign</th>
                            <th className="pb-3 font-medium">Sent</th>
                            <th className="pb-3 font-medium">Opens</th>
                            <th className="pb-3 font-medium">Replies</th>
                            <th className="pb-3 font-medium">Bounces</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {campaigns.map((campaign) => {
                            const campaignEvents = events.filter(
                              (event) => event.campaign_id === campaign.id,
                            );
                            const count = (type: CampaignEvent["event_type"]) =>
                              type === "opened" || type === "replied"
                                ? uniqueLeadCount(campaignEvents, type)
                                : campaignEvents.filter((event) => event.event_type === type).length;
                            return (
                              <tr key={campaign.id}>
                                <td className="py-3 font-medium">{campaign.name}</td>
                                <td className="py-3">{count("sent")}</td>
                                <td className="py-3">{count("opened")}</td>
                                <td className="py-3">{count("replied")}</td>
                                <td className="py-3">{count("bounced")}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {!campaigns.length && <EmptyState text="Create a campaign to see analytics." />}
                    </div>
                    <p className="mt-4 text-xs text-slate-400">
                      Metrics reflect up to the 500 most recent recorded events.
                    </p>
                  </section>
                </div>
              )}

              {activeSection === "settings" && (
                <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
                  <h2 className="font-semibold">Workspace profile</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage the profile associated with {userEmail}.
                  </p>
                  <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
                    <Field label="Full name" htmlFor="settings-name">
                      <input
                        id="settings-name"
                        value={fullName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setFullName(event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Company" htmlFor="settings-company">
                      <input
                        id="settings-company"
                        value={companyName}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          setCompanyName(event.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Timezone" htmlFor="settings-timezone">
                      <select
                        id="settings-timezone"
                        value={timezone}
                        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                          setTimezone(event.target.value)
                        }
                        className={inputClass}
                      >
                        {["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"].map((zone) => (
                          <option key={zone} value={zone}>{zone}</option>
                        ))}
                      </select>
                    </Field>
                    <button type="submit" disabled={isSaving} className={primaryButton}>
                      Save settings
                    </button>
                  </form>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      {text}
    </p>
  );
}

function EventRow({
  event,
  campaigns,
}: {
  event: CampaignEvent;
  campaigns: Campaign[];
}) {
  const campaignName =
    campaigns.find((campaign) => campaign.id === event.campaign_id)?.name ??
    "Campaign";
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Activity aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium capitalize">
            {event.event_type} · {campaignName}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(event.occurred_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
      {detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}
    </article>
  );
}
