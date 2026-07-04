-- =========================================================
-- SWEETY SCHOOL — schéma de base de données Supabase
-- À copier-coller dans : Supabase > SQL Editor > New query > Run
-- =========================================================

-- Extension nécessaire pour générer des identifiants uniques
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 1. PROFILS (un profil par compte connecté : admin / enseignant / parent)
--    Ce tableau est relié 1-pour-1 à auth.users (les vrais comptes/mots de passe)
-- ---------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'teacher', 'parent')),
  full_name text not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 2. CLASSES
-- ---------------------------------------------------------
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cycle text not null,
  color text not null default '#4A8FD1'
);

-- ---------------------------------------------------------
-- 3. MATIÈRES
-- ---------------------------------------------------------
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#B24FC7'
);

-- ---------------------------------------------------------
-- 4. ENSEIGNANTS ↔ CLASSE (un enseignant principal par classe pour simplifier)
-- ---------------------------------------------------------
create table teacher_classes (
  teacher_id uuid references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  primary key (teacher_id, class_id, subject_id)
);

-- ---------------------------------------------------------
-- 5. ÉLÈVES
-- ---------------------------------------------------------
create table students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  class_id uuid references classes(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 6. PARENTS ↔ ÉLÈVES (un parent peut avoir plusieurs enfants)
-- ---------------------------------------------------------
create table parent_students (
  parent_id uuid references profiles(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  primary key (parent_id, student_id)
);

-- ---------------------------------------------------------
-- 7. EMPLOI DU TEMPS
-- ---------------------------------------------------------
create table schedule_slots (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  day text not null,
  slot_index int not null,
  subject_id uuid references subjects(id) on delete set null
);

-- ---------------------------------------------------------
-- 8. CAHIER DE TEXTE (devoirs, fascicules — file_url pointe vers Supabase Storage)
-- ---------------------------------------------------------
create table homework (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references profiles(id) on delete set null,
  date_label text not null,
  description text not null,
  file_url text,
  file_name text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 9. NOTES (contrôles, devoirs surveillés, avec trimestre pour les bulletins)
-- ---------------------------------------------------------
create table grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  teacher_id uuid references profiles(id) on delete set null,
  label text not null,
  value numeric not null,
  max numeric not null default 10,
  coefficient numeric not null default 1,
  term text not null default 'Trimestre 1',
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 10. ABSENCES / RETARDS
-- ---------------------------------------------------------
create table absences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  date_label text not null,
  type text not null check (type in ('Absence', 'Retard')),
  reason text,
  justified boolean not null default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 11. MESSAGERIE
-- ---------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references profiles(id) on delete set null,
  to_id uuid references profiles(id) on delete set null,
  to_broadcast text, -- ex: 'all_parents' quand le message vise tous les parents
  subject text not null,
  body text not null,
  created_at timestamptz default now()
);

-- =========================================================
-- FONCTION UTILITAIRE : renvoie le rôle de l'utilisateur connecté
-- =========================================================
create or replace function my_role() returns text as $$
  select role from profiles where id = auth.uid()
$$ language sql stable security definer;

create or replace function my_class_ids() returns setof uuid as $$
  select class_id from teacher_classes where teacher_id = auth.uid()
$$ language sql stable security definer;

create or replace function my_children_ids() returns setof uuid as $$
  select student_id from parent_students where parent_id = auth.uid()
$$ language sql stable security definer;

-- =========================================================
-- ACTIVATION DE LA SÉCURITÉ (Row Level Security) SUR TOUTES LES TABLES
-- =========================================================
alter table profiles enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table teacher_classes enable row level security;
alter table students enable row level security;
alter table parent_students enable row level security;
alter table schedule_slots enable row level security;
alter table homework enable row level security;
alter table grades enable row level security;
alter table absences enable row level security;
alter table messages enable row level security;

-- ---------- PROFILES ----------
create policy "voir son propre profil ou tout si admin"
  on profiles for select
  using (id = auth.uid() or my_role() = 'admin');

create policy "modifier son propre profil"
  on profiles for update
  using (id = auth.uid());

-- ---------- CLASSES / SUBJECTS / SCHEDULE (lecture ouverte à tout compte connecté) ----------
create policy "lecture classes" on classes for select using (auth.uid() is not null);
create policy "lecture matieres" on subjects for select using (auth.uid() is not null);
create policy "lecture emploi du temps" on schedule_slots for select using (auth.uid() is not null);
create policy "admin gere classes" on classes for all using (my_role() = 'admin');
create policy "admin gere matieres" on subjects for all using (my_role() = 'admin');
create policy "admin gere emploi du temps" on schedule_slots for all using (my_role() = 'admin');

-- ---------- TEACHER_CLASSES ----------
create policy "lecture affectations" on teacher_classes for select using (auth.uid() is not null);
create policy "admin gere affectations" on teacher_classes for all using (my_role() = 'admin');

-- ---------- STUDENTS ----------
create policy "admin voit tous les eleves" on students for select using (my_role() = 'admin');
create policy "enseignant voit sa classe" on students for select using (
  my_role() = 'teacher' and class_id in (select my_class_ids())
);
create policy "parent voit ses enfants" on students for select using (
  my_role() = 'parent' and id in (select my_children_ids())
);
create policy "admin gere eleves" on students for all using (my_role() = 'admin');

-- ---------- PARENT_STUDENTS ----------
create policy "voir son propre lien parent-enfant" on parent_students for select using (
  parent_id = auth.uid() or my_role() = 'admin'
);
create policy "admin gere liens parent-enfant" on parent_students for all using (my_role() = 'admin');

-- ---------- HOMEWORK ----------
create policy "voir devoirs de sa classe" on homework for select using (
  my_role() = 'admin'
  or (my_role() = 'teacher' and class_id in (select my_class_ids()))
  or (my_role() = 'parent' and class_id in (select class_id from students where id in (select my_children_ids())))
);
create policy "enseignant ajoute devoirs" on homework for insert with check (
  my_role() = 'teacher' and class_id in (select my_class_ids())
);
create policy "enseignant modifie ses devoirs" on homework for update using (
  my_role() = 'teacher' and teacher_id = auth.uid()
);
create policy "enseignant supprime ses devoirs" on homework for delete using (
  my_role() = 'teacher' and teacher_id = auth.uid()
);

-- ---------- GRADES ----------
create policy "voir notes autorisees" on grades for select using (
  my_role() = 'admin'
  or (my_role() = 'teacher' and student_id in (select id from students where class_id in (select my_class_ids())))
  or (my_role() = 'parent' and student_id in (select my_children_ids()))
);
create policy "enseignant ajoute notes" on grades for insert with check (
  my_role() = 'teacher' and student_id in (select id from students where class_id in (select my_class_ids()))
);
create policy "enseignant modifie ses notes" on grades for update using (
  my_role() = 'teacher' and teacher_id = auth.uid()
);
create policy "enseignant supprime ses notes" on grades for delete using (
  my_role() = 'teacher' and teacher_id = auth.uid()
);

-- ---------- ABSENCES ----------
create policy "voir absences autorisees" on absences for select using (
  my_role() = 'admin'
  or (my_role() = 'teacher' and student_id in (select id from students where class_id in (select my_class_ids())))
  or (my_role() = 'parent' and student_id in (select my_children_ids()))
);
create policy "enseignant ou admin ajoute absence" on absences for insert with check (
  my_role() in ('teacher', 'admin')
);

-- ---------- MESSAGES ----------
create policy "voir ses messages" on messages for select using (
  from_id = auth.uid()
  or to_id = auth.uid()
  or (to_broadcast = 'all_parents' and my_role() = 'parent')
  or my_role() = 'admin'
);
create policy "envoyer un message" on messages for insert with check (
  from_id = auth.uid()
);

-- =========================================================
-- DONNÉES DE DÉPART (à adapter avec les vraies infos de l'école)
-- =========================================================
insert into classes (name, cycle, color) values
  ('Moyenne Section', 'Préscolaire', '#F5A93F'),
  ('Grande Section', 'Préscolaire', '#EC1E79'),
  ('CP', 'Primaire', '#4A8FD1'),
  ('CE1', 'Primaire', '#7CB518');

insert into subjects (name, color) values
  ('Lecture / Malagasy', '#F0492E'),
  ('Français', '#4A8FD1'),
  ('Mathématiques', '#B24FC7'),
  ('Éveil scientifique', '#7CB518'),
  ('Graphisme / Écriture', '#F5A93F'),
  ('Chant / Activités', '#EC1E79');

-- =========================================================
-- BUCKET DE STOCKAGE POUR LES FICHIERS (fascicules, devoirs en PDF...)
-- À créer manuellement : Supabase > Storage > New bucket > nom "documents" > Public: non
-- Puis exécuter ci-dessous pour autoriser la lecture/écriture selon le rôle :
-- =========================================================
-- (à lancer seulement après avoir créé le bucket "documents" dans l'interface Storage)

-- create policy "lecture documents pour connectes"
--   on storage.objects for select
--   using (bucket_id = 'documents' and auth.uid() is not null);

-- create policy "enseignants deposent des documents"
--   on storage.objects for insert
--   with check (bucket_id = 'documents' and my_role() in ('teacher','admin'));
