import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";
import LoginScreen from "./LoginScreen.jsx";
import {
  LayoutDashboard, Users, GraduationCap, CalendarDays, ClipboardList,
  MessageSquare, BookOpen, LogOut, Sparkles, Chip,
} from "./ui.jsx";
import { PALETTE, PAPER, INK } from "./tokens.js";
import {
  Dashboard, ElevesView, EmploiView, CahierView, NotesView, AbsencesView, MessagerieView,
} from "./views.jsx";

const NAV = {
  admin: [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, color: PALETTE.red },
    { id: "eleves", label: "Élèves & classes", icon: Users, color: PALETTE.orange },
    { id: "emploi", label: "Emploi du temps", icon: CalendarDays, color: PALETTE.blue },
    { id: "absences", label: "Absences & retards", icon: ClipboardList, color: PALETTE.green },
    { id: "messagerie", label: "Messagerie", icon: MessageSquare, color: PALETTE.pink },
  ],
  teacher: [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, color: PALETTE.blue },
    { id: "cahier", label: "Cahier de texte", icon: BookOpen, color: PALETTE.orange },
    { id: "notes", label: "Notes & bulletins", icon: GraduationCap, color: PALETTE.purple },
    { id: "emploi", label: "Emploi du temps", icon: CalendarDays, color: PALETTE.green },
    { id: "absences", label: "Absences", icon: ClipboardList, color: PALETTE.red },
    { id: "messagerie", label: "Messagerie", icon: MessageSquare, color: PALETTE.pink },
  ],
  parent: [
    { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, color: PALETTE.pink },
    { id: "notes", label: "Notes & bulletins", icon: GraduationCap, color: PALETTE.purple },
    { id: "cahier", label: "Cahier de texte", icon: BookOpen, color: PALETTE.orange },
    { id: "emploi", label: "Emploi du temps", icon: CalendarDays, color: PALETTE.blue },
    { id: "absences", label: "Absences", icon: ClipboardList, color: PALETTE.green },
    { id: "messagerie", label: "Messagerie", icon: MessageSquare, color: PALETTE.red },
  ],
};

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        setProfile(error ? null : data);
        setLoading(false);
      });
  }, [session]);

  if (!session) return <LoginScreen />;

  if (loading) {
    return (
      <div className="min-h-full w-full flex items-center justify-center" style={{ background: PAPER }}>
        <p className="text-sm" style={{ color: INK + "88" }}>Chargement...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-full w-full flex items-center justify-center p-6" style={{ background: PAPER }}>
        <div className="max-w-md text-center bg-white p-6 rounded-2xl shadow border border-black/5">
          <p className="font-bold mb-2">Compte non configuré</p>
          <p className="text-sm text-black/60 mb-4">
            Votre compte existe mais aucun profil (rôle) ne lui est associé. Demandez à l'administration
            de créer votre ligne dans la table <code>profiles</code> (voir le guide fourni).
          </p>
          <button onClick={() => supabase.auth.signOut()} className="text-sm font-semibold text-red-600">
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const nav = NAV[profile.role] || [];
  const roleColor = profile.role === "admin" ? PALETTE.red : profile.role === "teacher" ? PALETTE.blue : PALETTE.pink;
  const roleLabel = profile.role === "admin" ? "Administration" : profile.role === "teacher" ? "Espace enseignant" : "Espace famille";

  return (
    <div className="min-h-full w-full flex" style={{ background: PAPER, color: INK, fontFamily: "'Quicksand', sans-serif" }}>
      <aside className="w-60 shrink-0 border-r border-black/5 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-black/5">
          <div className="font-black text-lg leading-tight" style={{ fontFamily: "'Baloo 2', sans-serif", color: PALETTE.purple }}>
            Sweety School
          </div>
          <div className="text-[11px] text-black/40 font-medium">Espace numérique de travail</div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: tab === n.id ? n.color + "16" : "transparent", color: tab === n.id ? n.color : INK + "aa" }}>
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-black/5">
          <button onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-black/50 hover:bg-black/5">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: roleColor }}>{roleLabel}</div>
            <div className="font-bold text-lg">{profile.full_name}</div>
          </div>
          <Chip color={roleColor}><Sparkles size={12} /> L'oiseau dans le nid</Chip>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {tab === "dashboard" && <Dashboard profile={profile} />}
          {tab === "eleves" && <ElevesView profile={profile} />}
          {tab === "emploi" && <EmploiView profile={profile} />}
          {tab === "cahier" && <CahierView profile={profile} />}
          {tab === "notes" && <NotesView profile={profile} />}
          {tab === "absences" && <AbsencesView profile={profile} />}
          {tab === "messagerie" && <MessagerieView profile={profile} />}
        </div>
      </main>
    </div>
  );
}
