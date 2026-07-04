import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";
import { SectionCard, Chip, Plus, X, Send, CheckCircle2, AlertCircle, Paperclip, Printer,
  GraduationCap, BookOpen, ClipboardList, MessageSquare, CalendarDays, Users, LayoutDashboard } from "./ui.jsx";
import { PALETTE, DAYS, SLOTS } from "./tokens.js";

/* ---------------------------------------------------------------
   Shared data loaders
------------------------------------------------------------------*/
function useLookup(table) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from(table).select("*").then(({ data }) => setRows(data || []));
  }, [table]);
  return rows;
}

function useMyClassId(profile) {
  const [classId, setClassId] = useState(null);
  useEffect(() => {
    if (profile.role !== "teacher") return;
    supabase.from("teacher_classes").select("class_id").eq("teacher_id", profile.id).limit(1)
      .then(({ data }) => setClassId(data?.[0]?.class_id || null));
  }, [profile]);
  return classId;
}

function useMyChildren(profile) {
  const [children, setChildren] = useState([]);
  useEffect(() => {
    if (profile.role !== "parent") return;
    supabase.from("parent_students").select("student_id, students(*)").eq("parent_id", profile.id)
      .then(({ data }) => setChildren((data || []).map((r) => r.students).filter(Boolean)));
  }, [profile]);
  return children;
}

/* ---------------------------------------------------------------
   DASHBOARD
------------------------------------------------------------------*/
export function Dashboard({ profile }) {
  const classes = useLookup("classes");
  const [counts, setCounts] = useState({ students: 0, absences: 0, messages: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: sc }, { count: ac }, { count: mc }] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("absences").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
      ]);
      setCounts({ students: sc || 0, absences: ac || 0, messages: mc || 0 });
    })();
  }, []);

  if (profile.role === "admin") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SectionCard title="Établissement" icon={LayoutDashboard} accent={PALETTE.red}>
          <p className="text-sm leading-relaxed">
            <strong>Sweety School III F 9 ABA</strong><br />
            Antaniavo Antohomadinika Avaratra, Antananarivo 101<br />
            <span className="text-black/50">Préscolaire · Primaire</span>
          </p>
        </SectionCard>
        <SectionCard title="Classes" icon={Users} accent={PALETTE.orange}>
          <div className="space-y-2">
            {classes.map((c) => <Chip key={c.id} color={c.color}>{c.name}</Chip>)}
          </div>
        </SectionCard>
        <SectionCard title="Chiffres clés" icon={ClipboardList} accent={PALETTE.green}>
          <p className="text-sm">{counts.students} élève(s) inscrit(s)</p>
          <p className="text-sm">{counts.absences} absence(s)/retard(s) au total</p>
          <p className="text-sm">{counts.messages} message(s) échangés</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <SectionCard title="Bienvenue" icon={LayoutDashboard} accent={PALETTE.blue}>
        <p className="text-sm">
          Utilisez le menu à gauche pour consulter {profile.role === "teacher" ? "votre classe" : "les enfants rattachés à votre compte"} :
          cahier de texte, notes, absences et messagerie.
        </p>
      </SectionCard>
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN — ÉLÈVES & CLASSES
------------------------------------------------------------------*/
export function ElevesView() {
  const classes = useLookup("classes");
  const [students, setStudents] = useState([]);

  useEffect(() => {
    supabase.from("students").select("*").then(({ data }) => setStudents(data || []));
  }, []);

  return (
    <div className="space-y-5">
      {classes.map((c) => (
        <SectionCard key={c.id} title={`${c.name} (${c.cycle})`} icon={GraduationCap} accent={c.color}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {students.filter((s) => s.class_id === c.id).map((s) => (
              <div key={s.id} className="border rounded-xl px-3 py-2 text-sm" style={{ borderColor: c.color + "40" }}>
                {s.full_name}
              </div>
            ))}
            {students.filter((s) => s.class_id === c.id).length === 0 && (
              <p className="text-sm text-black/40">Aucun élève renseigné pour cette classe.</p>
            )}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   EMPLOI DU TEMPS
------------------------------------------------------------------*/
export function EmploiView({ profile }) {
  const classes = useLookup("classes");
  const subjects = useLookup("subjects");
  const myClassId = useMyClassId(profile);
  const children = useMyChildren(profile);
  const defaultClassId = profile.role === "teacher" ? myClassId : profile.role === "parent" ? children[0]?.class_id : classes[0]?.id;
  const [sel, setSel] = useState(defaultClassId);
  const [slots, setSlots] = useState([]);

  useEffect(() => { if (defaultClassId && !sel) setSel(defaultClassId); }, [defaultClassId]);
  useEffect(() => {
    if (!sel) return;
    supabase.from("schedule_slots").select("*").eq("class_id", sel).then(({ data }) => setSlots(data || []));
  }, [sel]);

  const cls = classes.find((c) => c.id === sel);
  const subjById = (id) => subjects.find((s) => s.id === id);
  const slotFor = (day, i) => slots.find((s) => s.day === day && s.slot_index === i);

  if (!cls) return <SectionCard title="Emploi du temps" icon={CalendarDays} accent={PALETTE.blue}><p className="text-sm text-black/40">Aucune classe disponible pour le moment.</p></SectionCard>;

  return (
    <SectionCard title="Emploi du temps" icon={CalendarDays} accent={cls.color}
      action={profile.role === "admin" && (
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="text-sm border rounded-lg px-2 py-1">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr><th className="text-left p-2 text-black/40 font-semibold w-32">Horaire</th>{DAYS.map((d) => <th key={d} className="text-left p-2 font-semibold">{d}</th>)}</tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, i) => (
              <tr key={slot} className="border-t border-black/5">
                <td className="p-2 text-black/40 text-xs">{slot}</td>
                {DAYS.map((d) => {
                  const s = slotFor(d, i);
                  const subj = s ? subjById(s.subject_id) : null;
                  return <td key={d} className="p-2">{subj ? <Chip color={subj.color}>{subj.name}</Chip> : <span className="text-black/20 text-xs">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------
   CAHIER DE TEXTE (avec pièce jointe : fascicules / devoirs en PDF)
------------------------------------------------------------------*/
export function CahierView({ profile }) {
  const subjects = useLookup("subjects");
  const myClassId = useMyClassId(profile);
  const children = useMyChildren(profile);
  const classId = profile.role === "teacher" ? myClassId : children[0]?.class_id;

  const [list, setList] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    if (!classId) return;
    supabase.from("homework").select("*").eq("class_id", classId).order("created_at", { ascending: false })
      .then(({ data }) => setList(data || []));
  };
  useEffect(load, [classId]);

  const add = async () => {
    if (!desc || !date || !classId) return;
    setUploading(true);
    let file_url = null, file_name = null;
    if (file) {
      const path = `${classId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
      if (!upErr) {
        const { data } = supabase.storage.from("documents").getPublicUrl(path);
        file_url = data.publicUrl;
        file_name = file.name;
      }
    }
    await supabase.from("homework").insert({
      class_id: classId, subject_id: subjectId || null, teacher_id: profile.id,
      date_label: date, description: desc, file_url, file_name,
    });
    setDesc(""); setDate(""); setFile(null); setUploading(false);
    load();
  };

  const subjById = (id) => subjects.find((s) => s.id === id);

  return (
    <SectionCard title="Cahier de texte" icon={BookOpen} accent={PALETTE.orange}>
      {profile.role === "teacher" && (
        <div className="mb-4 p-3 rounded-xl border border-black/10 bg-black/[0.02] flex flex-wrap gap-2 items-end">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="">Matière...</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Jour (ex. Lundi 06/07)" className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Travail à donner..." className="border rounded-lg px-2 py-1.5 text-sm flex-[2] min-w-[200px]" />
          <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm cursor-pointer" style={{ borderColor: PALETTE.orange }}>
            <Paperclip size={14} /> {file ? file.name.slice(0, 14) : "Fichier (fascicule...)"}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <button onClick={add} disabled={uploading} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50" style={{ background: PALETTE.orange }}>
            <Plus size={14} /> {uploading ? "Envoi..." : "Ajouter"}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-black/40">Rien à afficher pour le moment.</p>}
        {list.map((h) => (
          <div key={h.id} className="flex items-start gap-3 border-b border-black/5 pb-2">
            {subjById(h.subject_id) && <Chip color={subjById(h.subject_id).color}>{subjById(h.subject_id).name}</Chip>}
            <div className="text-sm flex-1">
              <span className="text-black/40 text-xs">{h.date_label}</span>
              <p>{h.description}</p>
              {h.file_url && (
                <a href={h.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold mt-1" style={{ color: PALETTE.blue }}>
                  <Paperclip size={12} /> {h.file_name || "Pièce jointe"}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------
   NOTES & BULLETINS
------------------------------------------------------------------*/
export function NotesView({ profile }) {
  const subjects = useLookup("subjects");
  const myClassId = useMyClassId(profile);
  const children = useMyChildren(profile);
  const [classStudents, setClassStudents] = useState([]);
  const [studentId, setStudentId] = useState(children[0]?.id || "");
  const [grades, setGrades] = useState([]);
  const [term, setTerm] = useState("Trimestre 1");

  const [formStudent, setFormStudent] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [coeff, setCoeff] = useState("1");

  useEffect(() => {
    if (profile.role !== "teacher" || !myClassId) return;
    supabase.from("students").select("*").eq("class_id", myClassId).then(({ data }) => setClassStudents(data || []));
  }, [profile, myClassId]);

  useEffect(() => { if (profile.role === "parent" && children[0]) setStudentId(children[0].id); }, [children]);

  const loadGrades = (id) => {
    if (!id) return;
    supabase.from("grades").select("*").eq("student_id", id).order("created_at", { ascending: false })
      .then(({ data }) => setGrades(data || []));
  };

  useEffect(() => { if (profile.role === "parent") loadGrades(studentId); }, [studentId, profile.role]);
  useEffect(() => {
    if (profile.role !== "teacher") return;
    supabase.from("grades").select("*").in("student_id", classStudents.map((s) => s.id))
      .order("created_at", { ascending: false }).then(({ data }) => setGrades(data || []));
  }, [classStudents, profile.role]);

  const subjById = (id) => subjects.find((s) => s.id === id);

  const addGrade = async () => {
    if (!formStudent || !formSubject || !label || value === "") return;
    await supabase.from("grades").insert({
      student_id: formStudent, subject_id: formSubject, teacher_id: profile.id,
      label, value: Number(value), max: 10, coefficient: Number(coeff) || 1, term,
    });
    setLabel(""); setValue("");
    supabase.from("grades").select("*").in("student_id", classStudents.map((s) => s.id))
      .order("created_at", { ascending: false }).then(({ data }) => setGrades(data || []));
  };

  const printBulletin = () => window.print();

  if (profile.role === "parent") {
    const childName = children.find((c) => c.id === studentId)?.full_name || "";
    const termGrades = grades.filter((g) => g.term === term);
    const totalCoeff = termGrades.reduce((a, g) => a + Number(g.coefficient), 0);
    const avg = totalCoeff ? termGrades.reduce((a, g) => a + (g.value / g.max) * 20 * g.coefficient, 0) / totalCoeff : null;

    return (
      <SectionCard title={`Bulletin — ${childName}`} icon={GraduationCap} accent={PALETTE.purple}
        action={
          <div className="flex gap-2 items-center">
            {children.length > 1 && (
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="text-sm border rounded-lg px-2 py-1">
                {children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            )}
            <select value={term} onChange={(e) => setTerm(e.target.value)} className="text-sm border rounded-lg px-2 py-1">
              <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
            </select>
            <button onClick={printBulletin} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: PALETTE.purple }}>
              <Printer size={14} /> Imprimer
            </button>
          </div>
        }>
        {avg !== null && <p className="mb-3 text-sm font-semibold">Moyenne générale ({term}) : <span style={{ color: PALETTE.purple }}>{avg.toFixed(1)}/20</span></p>}
        <table className="w-full text-sm">
          <thead><tr className="text-black/40 text-left"><th className="p-2">Matière</th><th className="p-2">Évaluation</th><th className="p-2">Coeff.</th><th className="p-2">Note</th></tr></thead>
          <tbody>
            {termGrades.map((g) => (
              <tr key={g.id} className="border-t border-black/5">
                <td className="p-2">{subjById(g.subject_id) && <Chip color={subjById(g.subject_id).color}>{subjById(g.subject_id).name}</Chip>}</td>
                <td className="p-2">{g.label}</td>
                <td className="p-2">{g.coefficient}</td>
                <td className="p-2 font-semibold">{g.value}/{g.max}</td>
              </tr>
            ))}
            {termGrades.length === 0 && <tr><td colSpan={4} className="p-3 text-black/40 text-sm">Aucune note pour ce trimestre.</td></tr>}
          </tbody>
        </table>
      </SectionCard>
    );
  }

  // teacher
  return (
    <SectionCard title="Notes & bulletins" icon={GraduationCap} accent={PALETTE.purple}>
      <div className="mb-4 p-3 rounded-xl border border-black/10 bg-black/[0.02] flex flex-wrap gap-2 items-end">
        <select value={formStudent} onChange={(e) => setFormStudent(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="">Élève...</option>
          {classStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <select value={formSubject} onChange={(e) => setFormSubject(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="">Matière...</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Intitulé (ex. Devoir surveillé)" className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[160px]" />
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="/10" type="number" min="0" max="10" className="border rounded-lg px-2 py-1.5 text-sm w-20" />
        <input value={coeff} onChange={(e) => setCoeff(e.target.value)} placeholder="Coeff." type="number" min="1" className="border rounded-lg px-2 py-1.5 text-sm w-20" />
        <select value={term} onChange={(e) => setTerm(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
          <option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option>
        </select>
        <button onClick={addGrade} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: PALETTE.purple }}>
          <Plus size={14} /> Ajouter
        </button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-black/40 text-left"><th className="p-2">Élève</th><th className="p-2">Matière</th><th className="p-2">Évaluation</th><th className="p-2">Coeff.</th><th className="p-2">Note</th></tr></thead>
        <tbody>
          {grades.map((g) => (
            <tr key={g.id} className="border-t border-black/5">
              <td className="p-2">{classStudents.find((s) => s.id === g.student_id)?.full_name}</td>
              <td className="p-2">{subjById(g.subject_id) && <Chip color={subjById(g.subject_id).color}>{subjById(g.subject_id).name}</Chip>}</td>
              <td className="p-2">{g.label}</td>
              <td className="p-2">{g.coefficient}</td>
              <td className="p-2 font-semibold">{g.value}/{g.max}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------
   ABSENCES
------------------------------------------------------------------*/
export function AbsencesView({ profile }) {
  const myClassId = useMyClassId(profile);
  const children = useMyChildren(profile);
  const [classStudents, setClassStudents] = useState([]);
  const [list, setList] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("Absence");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (profile.role === "teacher" && myClassId) {
      supabase.from("students").select("*").eq("class_id", myClassId).then(({ data }) => setClassStudents(data || []));
    }
  }, [profile, myClassId]);

  const load = () => {
    const ids = profile.role === "parent" ? children.map((c) => c.id) : classStudents.map((s) => s.id);
    if (ids.length === 0) return;
    supabase.from("absences").select("*").in("student_id", ids).order("created_at", { ascending: false })
      .then(({ data }) => setList(data || []));
  };
  useEffect(load, [classStudents, children, profile.role]);

  const add = async () => {
    if (!studentId || !date) return;
    await supabase.from("absences").insert({ student_id: studentId, date_label: date, type, reason: reason || "—", justified: false });
    setReason(""); setDate("");
    load();
  };

  const nameOf = (id) => (profile.role === "parent" ? children : classStudents).find((s) => s.id === id)?.full_name;

  return (
    <SectionCard title="Absences & retards" icon={ClipboardList} accent={PALETTE.green}>
      {profile.role === "teacher" && (
        <div className="mb-4 p-3 rounded-xl border border-black/10 bg-black/[0.02] flex flex-wrap gap-2 items-end">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="">Élève...</option>
            {classStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm">
            <option>Absence</option><option>Retard</option>
          </select>
          <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Date" className="border rounded-lg px-2 py-1.5 text-sm w-32" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif" className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]" />
          <button onClick={add} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: PALETTE.green }}>
            <Plus size={14} /> Signaler
          </button>
        </div>
      )}
      <div className="space-y-1.5">
        {list.length === 0 && <p className="text-sm text-black/40">Aucune absence enregistrée.</p>}
        {list.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-sm py-1 border-b border-black/5">
            {a.justified ? <CheckCircle2 size={14} color={PALETTE.green} /> : <AlertCircle size={14} color={PALETTE.red} />}
            <strong>{nameOf(a.student_id)}</strong> — {a.date_label} — {a.type} ({a.reason})
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ---------------------------------------------------------------
   MESSAGERIE
------------------------------------------------------------------*/
export function MessagerieView({ profile }) {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    supabase.from("profiles").select("id, full_name, role").neq("id", profile.id).then(({ data }) => setContacts(data || []));
  }, [profile]);

  const load = () => {
    supabase.from("messages").select("*").order("created_at", { ascending: false }).then(({ data }) => setMessages(data || []));
  };
  useEffect(load, []);

  const send = async () => {
    if (!to || !subject || !body) return;
    const isBroadcast = to === "all_parents";
    await supabase.from("messages").insert({
      from_id: profile.id,
      to_id: isBroadcast ? null : to,
      to_broadcast: isBroadcast ? "all_parents" : null,
      subject, body,
    });
    setTo(""); setSubject(""); setBody(""); setComposerOpen(false);
    load();
  };

  const nameOf = (id) => contacts.find((c) => c.id === id)?.full_name || (id === profile.id ? profile.full_name : "—");

  return (
    <SectionCard title="Messagerie" icon={MessageSquare} accent={PALETTE.pink}
      action={
        <button onClick={() => setComposerOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: PALETTE.pink }}>
          <Plus size={14} /> Nouveau message
        </button>
      }>
      {composerOpen && (
        <div className="mb-4 p-4 rounded-xl border border-black/10 bg-black/[0.02] relative">
          <button onClick={() => setComposerOpen(false)} className="absolute top-3 right-3 text-black/30"><X size={16} /></button>
          <div className="space-y-2">
            <select value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm w-full">
              <option value="">Destinataire...</option>
              {profile.role === "admin" && <option value="all_parents">Tous les parents</option>}
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Objet" className="border rounded-lg px-2 py-1.5 text-sm w-full" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre message..." rows={3} className="border rounded-lg px-2 py-1.5 text-sm w-full" />
            <button onClick={send} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-sm font-semibold" style={{ background: PALETTE.pink }}>
              <Send size={14} /> Envoyer
            </button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {messages.length === 0 && <p className="text-sm text-black/40">Aucun message.</p>}
        {messages.map((m) => (
          <div key={m.id} className="border-b border-black/5 pb-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{nameOf(m.from_id)} → {m.to_broadcast ? "Tous les parents" : nameOf(m.to_id)}</span>
              <span className="text-black/30 text-xs">{new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
            <div className="text-sm font-semibold" style={{ color: PALETTE.pink }}>{m.subject}</div>
            <p className="text-sm text-black/70">{m.body}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
