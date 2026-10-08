"use client";
import { useState } from "react";
import { Mail, Users, Activity, Settings, Plus, Play } from "lucide-react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleConnectMailbox = async () => {
    if (!email || !appPassword) return setStatus("Please fill all fields.");
    setStatus("Connecting...");

    const { error } = await supabase
      .from('mailboxes')
      .insert([{ email, app_password: appPassword }]);

    if (error) {
      setStatus("Error connecting mailbox: " + error.message);
    } else {
      setStatus("Mailbox connected securely!");
      setEmail("");
      setAppPassword("");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Mail className="w-6 h-6" />
            OutreachMVP
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("campaigns")} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${activeTab === 'campaigns' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}>
            <Activity className="w-5 h-5" /> Campaigns
          </button>
          <button onClick={() => setActiveTab("leads")} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${activeTab === 'leads' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}>
            <Users className="w-5 h-5" /> Lead Lists
          </button>
          <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}>
            <Settings className="w-5 h-5" /> Mailbox Setup
          </button>
        </nav>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold capitalize">{activeTab}</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 font-medium">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {activeTab === "campaigns" && (
             <div className="bg-white border rounded-lg shadow-sm p-6 grid grid-cols-4 gap-4 text-center">
                <div className="p-4 border rounded-md"><div className="text-2xl font-bold">450</div><div className="text-sm text-gray-500">Contacted</div></div>
                <div className="p-4 border rounded-md"><div className="text-2xl font-bold text-blue-600">62%</div><div className="text-sm text-gray-500">Open Rate</div></div>
                <div className="p-4 border rounded-md"><div className="text-2xl font-bold text-green-600">4%</div><div className="text-sm text-gray-500">Reply Rate</div></div>
                <div className="p-4 border rounded-md"><div className="text-2xl font-bold text-red-600">0.2%</div><div className="text-sm text-gray-500">Bounce Rate</div></div>
             </div>
          )}
          {activeTab === "settings" && (
            <div className="max-w-xl bg-white border rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Connect Sending Account</h3>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mb-4 p-2 border rounded-md" 
              />
              <input 
                type="password" 
                placeholder="16-digit App Password" 
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                className="w-full mb-4 p-2 border rounded-md" 
              />
              <button onClick={handleConnectMailbox} className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800">
                Connect Mailbox
              </button>
              {status && <p className="mt-4 text-sm font-medium text-blue-600">{status}</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
