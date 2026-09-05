"use client";

import { useState } from "react";
import styles from "./pricing.module.css";

type Plan = "free" | "pro" | "promax";

const plans = {
  free: {
    name: "Free",
    price: "€0",
    description: "Para começar a usar o CodeHub AI.",
    popular: false,
    features: [
      "30 gerações de código / mês",
      "50 mensagens AI Chat / mês",
      "20 Debugs / mês",
      "20 melhorias / mês",
      "10 conversões / mês",
      "10 testes / mês",
      "5 projetos",
      "Histórico de 30 ações",
      "Editor de código",
      "Preview",
      "Download dos ficheiros",
      "Gemini AI",
    ],
  },
  pro: {
    name: "Pro",
    price: "€9,99",
    description: "Para quem programa regularmente.",
    popular: true,
    features: [
      "500 gerações de código / mês",
      "1.000 mensagens AI Chat / mês",
      "300 Debugs / mês",
      "300 melhorias / mês",
      "200 conversões / mês",
      "200 testes / mês",
      "50 projetos",
      "Histórico ilimitado",
      "Editor de código avançado",
      "Preview",
      "Download ZIP",
      "Análise de vários ficheiros",
      "Contexto entre ficheiros",
      "Projetos privados",
      "Processamento prioritário",
      "Sem publicidade",
    ],
  },
  promax: {
    name: "Pro Max",
    price: "€19,99",
    description: "Para utilizadores avançados.",
    popular: false,
    features: [
      "2.000 gerações de código / mês",
      "5.000 mensagens AI Chat / mês",
      "1.000 Debugs / mês",
      "1.000 melhorias / mês",
      "1.000 conversões / mês",
      "1.000 testes / mês",
      "200 projetos",
      "Histórico ilimitado",
      "Projetos maiores",
      "Contexto avançado",
      "Análise multi-ficheiro",
      "Geração de aplicações completas",
      "Refatoração avançada",
      "Correção automática",
      "Prioridade máxima",
      "Acesso antecipado a novas funções",
    ],
  },
};

export default function PricingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);

    async function choosePlan(plan: Plan) {
  if (plan === "free") {
    window.location.href = "/";
    return;
  }

  setLoading(plan);

  try {
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao iniciar pagamento.");
    }

    if (!data.url) {
      throw new Error("URL de pagamento não recebida.");
    }

    window.location.href = data.url;
  } catch (error) {
    console.error(error);

    alert(
      error instanceof Error
        ? error.message
        : "Não foi possível iniciar o pagamento."
    );

    setLoading(null);
  }
}

  return (
    <main className={styles.pricingPage}>
      <div className={styles.pricingBackground} />

      <header className={styles.pricingHeader}>
        <button
          className={styles.logoButton}
          onClick={() => (window.location.href = "/")}
        >
          <div className={styles.logoMark}>C</div>

          <div>
            <div className={styles.logoTitle}>CodeHub AI</div>
            <div className={styles.logoSubtitle}>
              AI Coding Platform
            </div>
          </div>
        </button>

        <button
          className={styles.backButton}
          onClick={() => (window.location.href = "/")}
        >
          ← Voltar
        </button>
      </header>

      <section className={styles.pricingHero}>
        <div className={styles.heroBadge}>⚡ CodeHub AI Plans</div>

        <h1>
          Escolhe o plano ideal
          <br />
          para programar com IA.
        </h1>

        <p>
          Começa gratuitamente e faz upgrade quando precisares de mais
          potência.
        </p>
      </section>

      <section className={styles.plansGrid}>
        {(Object.keys(plans) as Plan[]).map((planKey) => {
          const plan = plans[planKey];

          return (
            <article
              key={planKey}
              className={`${styles.planCard} ${
                plan.popular ? styles.planPopular : ""
              }`}
            >
              {plan.popular && (
                <div className={styles.popularBadge}>
                  ⭐ MAIS POPULAR
                </div>
              )}

              <div className={styles.planContent}>
                <div className={styles.planName}>{plan.name}</div>

                <div className={styles.planPrice}>
                  {plan.price}

                  {plan.price !== "€0" && (
                    <span className={styles.pricePeriod}>/mês</span>
                  )}
                </div>

                {plan.price === "€0" && (
                  <div
                    className={`${styles.pricePeriod} ${styles.freePeriod}`}
                  >
                    para sempre
                  </div>
                )}

                <p className={styles.planDescription}>
                  {plan.description}
                </p>

                <button
                  className={`${styles.planButton} ${
                    plan.popular ? styles.primaryPlanButton : ""
                  }`}
                  onClick={() => choosePlan(planKey)}
                  disabled={loading !== null}
                >
                  {loading === planKey
                    ? "A processar..."
                    : planKey === "free"
                    ? "Começar grátis"
                    : "Escolher plano"}
                </button>

                <div className={styles.featuresTitle}>
                  Incluído:
                </div>

                <ul className={styles.featuresList}>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span className={styles.check}>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.comparisonSection}>
        <h2>Comparação rápida</h2>

        <div className={styles.comparisonTable}>
          <div
            className={`${styles.comparisonRow} ${styles.comparisonHead}`}
          >
            <div>Funcionalidade</div>
            <div>Free</div>
            <div>Pro</div>
            <div>Pro Max</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Gerações / mês</div>
            <div>30</div>
            <div>500</div>
            <div>2.000</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Mensagens AI</div>
            <div>50</div>
            <div>1.000</div>
            <div>5.000</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Projetos</div>
            <div>5</div>
            <div>50</div>
            <div>200</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Histórico</div>
            <div>30 ações</div>
            <div>∞</div>
            <div>∞</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Multi-ficheiro</div>
            <div>—</div>
            <div>✓</div>
            <div>✓</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Projetos privados</div>
            <div>—</div>
            <div>✓</div>
            <div>✓</div>
          </div>

          <div className={styles.comparisonRow}>
            <div>Prioridade</div>
            <div>—</div>
            <div>✓</div>
            <div>⭐ Máxima</div>
          </div>
        </div>
      </section>

      <section className={styles.pricingFaq}>
        <h2>Perguntas frequentes</h2>

        <div className={styles.faqGrid}>
          <div className={styles.faqCard}>
            <h3>Posso começar grátis?</h3>

            <p>
              Sim. O plano Free permite experimentar as principais
              ferramentas do CodeHub AI sem pagar.
            </p>
          </div>

          <div className={styles.faqCard}>
            <h3>Posso mudar de plano?</h3>

            <p>
              Sim. O sistema será preparado para fazer upgrade ou
              downgrade da conta.
            </p>
          </div>

          <div className={styles.faqCard}>
            <h3>Os limites renovam?</h3>

            <p>
              Sim. Os limites mensais serão renovados no início de cada
              ciclo de faturação.
            </p>
          </div>

          <div className={styles.faqCard}>
            <h3>Como funciona o pagamento?</h3>

            <p>
              Nesta primeira versão estamos a preparar os planos. O
              pagamento será ligado numa próxima etapa.
            </p>
          </div>
        </div>
      </section>

      <footer className={styles.pricingFooter}>
        <div>© 2026 CodeHub AI</div>
        <div>AI Coding Platform</div>
      </footer>
    </main>
  );
}