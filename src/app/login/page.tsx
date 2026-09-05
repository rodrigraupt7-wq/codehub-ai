"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Conta criada! Verifica o teu email para confirmar a conta."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        window.location.href = "/";
      }
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09090b",
        color: "white",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: "16px",
          padding: "32px",
        }}
      >
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>
          CodeHub AI
        </h1>

        <p style={{ color: "#a1a1aa", marginBottom: "28px" }}>
          {isRegister ? "Cria a tua conta" : "Entra na tua conta"}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: "1px solid #3f3f46",
              background: "#09090b",
              color: "white",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "8px",
              border: "1px solid #3f3f46",
              background: "#09090b",
              color: "white",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "#ffffff",
              color: "#000000",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loading
              ? "Aguarda..."
              : isRegister
              ? "Criar conta"
              : "Entrar"}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: "16px",
              color: "#a1a1aa",
              fontSize: "14px",
            }}
          >
            {message}
          </p>
        )}

        <button
          onClick={() => {
            setIsRegister(!isRegister);
            setMessage("");
          }}
          style={{
            marginTop: "20px",
            background: "none",
            border: "none",
            color: "#a1a1aa",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {isRegister
            ? "Já tens uma conta? Entrar"
            : "Ainda não tens conta? Criar conta"}
        </button>
      </div>
    </main>
  );
}