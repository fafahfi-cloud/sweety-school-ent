import React, { useState } from "react";
import { supabase } from "./supabaseClient.js";
import { PALETTE, PAPER, INK } from "./tokens.js";

function ButterflyMark({ style, className }) {
  return (
    <svg viewBox="0 0 100 100" width="46" height="46" style={style} className={className}>
      <g opacity="0.9">
        <path d="M50 50 C20 10 0 20 8 45 C14 62 35 58 50 50 Z" fill={PALETTE.purple} />
        <path d="M50 50 C80 10 100 20 92 45 C86 62 65 58 50 50 Z" fill={PALETTE.blue} />
        <path d="M50 50 C28 78 10 82 12 62 C14 50 34 52 50 50 Z" fill={PALETTE.pink} />
        <path d="M50 50 C72 78 90 82 88 62 C86 50 66 52 50 50 Z" fill={PALETTE.orange} />
        <line x1="50" y1="35" x2="50" y2="70" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("Email ou mot de passe incorrect.");
  };

  return (
    <div
      className="min-h-full w-full flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: `radial-gradient(circle at 15% 15%, ${PALETTE.yellow}22, transparent 40%), radial-gradient(circle at 85% 85%, ${PALETTE.blue}22, transparent 40%), ${PAPER}` }}
    >
      <ButterflyMark style={{ position: "absolute", top: 28, right: 60, transform: "rotate(12deg)" }} className="hidden sm:block" />
      <ButterflyMark style={{ position: "absolute", bottom: 40, left: 50, transform: "rotate(-16deg) scale(0.8)" }} className="hidden sm:block" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-black/5 p-6 sm:p-8 relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
            <span style={{ color: PALETTE.red }}>S</span>
            <span style={{ color: PALETTE.purple }}>w</span>
            <span style={{ color: PALETTE.orange }}>e</span>
            <span style={{ color: PALETTE.green }}>e</span>
            <span style={{ color: PALETTE.blue }}>t</span>
            <span style={{ color: PALETTE.pink }}>y</span>{" "}
            <span style={{ color: PALETTE.purple }}>S</span>
            <span style={{ color: PALETTE.green }}>c</span>
            <span style={{ color: PALETTE.pink }}>h</span>
            <span style={{ color: PALETTE.orange }}>o</span>
            <span style={{ color: PALETTE.blue }}>o</span>
            <span style={{ color: PALETTE.yellow }}>l</span>
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: INK + "99" }}>
            Espace Numérique de Travail — connexion sécurisée
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-sm font-semibold" style={{ color: INK }}>Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@sweetyschool.mg"
              className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none"
              style={{ borderColor: INK + "22" }}
            />
          </div>
          <div>
            <label className="text-sm font-semibold" style={{ color: INK }}>Mot de passe</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border rounded-xl px-3 py-2 text-sm outline-none"
              style={{ borderColor: INK + "22" }}
            />
          </div>
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40"
            style={{ background: PALETTE.pink }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: INK + "66" }}>
          Pas encore de compte ? Contactez l'administration de l'école,<br />qui crée les accès pour chaque famille et enseignant·e.
        </p>
      </div>
    </div>
  );
}
