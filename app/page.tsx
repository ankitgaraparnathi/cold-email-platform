"use client";
import { useState } from "react";
import { Mail, Users, Activity, Settings, Plus, Play } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("settings");
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleConnectMailbox = async () => {
    if (!email || !appPassword) return setStatus("Please fill all fields.");
    setStatus("Connecting...");
    const { error } = await supabase.from("mailboxes").insert([{ email, app_password: appPassword }]);
    if (error) {
      setStatus("Error: " + error.message);
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
            <Mail className="w-6 h-6" /> OutreachMVP
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("campaigns")} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${activeTab === 'campaigns' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}>
            <Activity className="w-5 h-5" /> Campaigns
          </button>
          <button onClick={() => setActiveTab("leads")} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${activeTab === 'leads' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`>
            <Users className="w-5 h-5" /> Lead Lists
          </button>
          <button onClick={() => setActiveTab("settings")} className={`w-full flex items-center gap-3 px-4 py-2 rounded-md ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-101�`}>
            <Settings className="w-5 h-5" /> Mailbox Setup
          </button>
        </nav>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b p-6 flex�\�Y�KX�]�Y[�][\�X�[�\������\�Ә[YOH�^L��۝\�[ZX���\][^�H���X�]�UX�O�����]ۈ�\�Ә[YOH���X�YKM�^]�]HMKL���[�Y[Yݙ\����X�YKM��^][\�X�[�\��\L��۝[YY][H���\��\�Ә[YOH��MM�ψ�]��[\ZYۂ�؝]ۏ���XY\���XZ[��\�Ә[YOH��^LHM�ݙ\����X]]ȏ���X�]�UX�OOH��[\ZYۜȈ	��
�]��\�Ә[YOH���]�]H�ܙ\���[�Y[��Y��\�HM�ܚYܚYX���M�\M^X�[�\����]��\�Ә[YOH�M�ܙ\���[�Y[Y��]��\�Ә[YOH�^L�V�f��B�&��B#�CS��F�c��F�b6�74��S�'FW�B�6�FW�B�w&��S#�6��F7FVC��F�c���F�c��F�b6�74��S�'�B&�&FW"&�V�FVB��B#��F�b6�74��S�'FW�B�'��f��B�&��BFW�B�&�VR�c#�c"S��F�c��F�b6�74��S�'FW�B�6�FW�B�w&��S#��V�&FS��F�c���F�c��F�b6�74��S�'�B&�&FW"&�V�FVB��B#��F�b6�74��S�'FW�B�'��f��B�&��BFW�B�w&VV��c#�BS��F�c��F�b6�74��S�'FW�B�6�FW�B�w&��S#�&Wǒ&FS��F�c���F�c��F�b6�74��S�'�B&�&FW"&�V�FVB��B#��F�b6�74��S�'FW�B�'��f��B�&��BFW�B�&VB�c#��"S��F�c��F�b6�74��S�'FW�B�6�FW�B�w&��S#�&�V�6R&FS��F�c���F�c���F�c��Т�7F�fUF"���'6WGF��w2"bb���F�b6�74��S�&���r׆�&r�v��FR&�&FW"&�V�FVB�r6�F�r�6��b#�ƃ26�74��S�'FW�B��rf��B�6V֖&��B�"�B#�6���V7B6V�F��r66�V�C���3�Ɩ�WBG�S�&V���"�6V���FW#�$V���FG&W72"f�VS׶V������6��vSײ�S�璒��6WDV��R�F&vWB�f�VR��6�74��S�'r�gV���"�B�"&�&FW"&�V�FVB��B"��Ɩ�WBG�S�'77v�&B"�6V���FW#�#b�F�v�B77v�&B"f�VS׶77v�&G���6��vSײ�S�璒��6WD77v�&B�R�F&vWB�f�VR��6�74��S�'r�gV���"�B�"&�&FW"&�V�FVB��B"���'WGF����6Ɩ6�׶��F�T6���V7D���&���6�74��S�'r�gV��&r�&�6�FW�B�v��FR��"&�V�FVB��B��fW#�&r�w&�Ӄ#�6���V7B���&����'WGF����7FGW2bb�6�74��S�&�B�BFW�B�6�f��B��VF�V�FW�B�&�VR�c#�7FGW7����Т��F�c��Т��������F�c���F�c����