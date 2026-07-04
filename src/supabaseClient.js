import { createClient } from "@supabase/supabase-js";

// Ces deux valeurs viennent de Supabase > Project Settings > API
// En local : mettez-les dans un fichier ".env" (voir .env.example)
// Sur Vercel : mettez-les dans Project Settings > Environment Variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Variables Supabase manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Voir .env.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
