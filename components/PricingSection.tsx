import React from 'react'

export default function PricingSection() {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      subtitle: 'forever',
      features: [
        'Up to 10 clients',
        'Basic follow-up automation',
        'Email support',
        'Standard dashboard',
        'Basic lead tracking',
        'Community support',
      ],
      cta: 'Get Started Free',
      highlight: false,
      description: 'Perfect for getting started.',
      paymentRequired: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$100',
      subtitle: 'per user / month',
      features: [
        'Unlimited clients',
        'Unlimited Follow-Ups: Email, SMS, and Voice',
        'Unlimited Contract Amendments: Full DocuSign sync + auto-updates',
        'Unlimited Client Data Uploads: Notes, documents, recordings, images',
        'Unlimited Scheduling: Campaigns, recurring sequences, auto-drips',
        'Knowledge-Based Follow-Ups: AI answers based on client files & FAQs',
        'Lead Scoring & Prioritization: Hot vs warm vs cold leads flagged automatically',
        'Advanced Dashboard: Full client snapshots, tasks, and timelines',
        'Priority support',
      ],
      cta: 'Start Professional Plan',
      highlight: true,
      description: 'Everything an agent needs, no limits.',
      paymentRequired: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      subtitle: 'pricing',
      features: [
        'All Professional Features, plus:',
        'Dedicated Admin Console (manage all agents centrally)',
        'Shared Team Knowledge Base (central property FAQs, templates, contracts)',
        'Advanced Workflows (conditional sends, staggered team campaigns, multi-channel orchestration)',
        'Lead Enrichment from public sources (income brackets, job titles, move history)',
        'Broker-Level Reporting & Insights (conversion, pipeline, performance dashboards)',
        'Dedicated Support & Onboarding',
        'Custom Integrations (CRM, MLS, phone systems, etc.)',
        'White-label solutions',
        '24/7 phone support',
      ],
      cta: 'Contact Sales',
      description: 'For brokerages and large teams.',
      paymentRequired: false,
    },
  ]

  const handlePlanClick = (plan: typeof plans[0]) => {
    if (plan.id === 'free') {
      window.location.href = '/signup?plan=free';
    } else if (plan.id === 'professional') {
      window.location.href = '/pricing/checkout?plan=professional';
    } else if (plan.id === 'enterprise') {
      window.location.href = '/contact-sales';
    }
  };

  return (
    <section aria-labelledby="pricing-heading" className="w-full bg-[#f9f9f7] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 id="pricing-heading" className="text-4xl font-bold text-slate-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto">
            Start free, upgrade as you grow. Choose the plan that fits your needs.
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3 items-stretch max-w-6xl mx-auto">
          {plans.map((p) => (
            <article
              key={p.id}
              className={
                'relative flex flex-col rounded-2xl p-6 shadow-sm bg-white transition-transform duration-200 ' +
                (p.highlight
                  ? 'scale-100 md:scale-105 border-2 border-orange-400 shadow-xl'
                  : 'shadow-md border border-gray-200')
              }
              aria-labelledby={`${p.id}-title`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-orange-800 bg-orange-100">
                    Most Popular
                  </span>
                </div>
              )}

              <header className="mt-4 text-center">
                <h3 id={`${p.id}-title`} className="text-xl font-semibold text-slate-900">
                  {p.name}
                </h3>
                {p.description && (
                  <p className="text-sm text-slate-600 mt-2">{p.description}</p>
                )}
                <div className="mt-4 flex items-baseline justify-center gap-x-2">
                  <span className="text-3xl font-bold text-slate-900">{p.price}</span>
                  <span className="text-sm text-slate-500">{p.subtitle}</span>
                </div>
              </header>

              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-x-3 text-slate-700">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-orange-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <button
                  type="button"
                  className="w-full inline-flex justify-center items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors shadow-lg"
                  aria-label={`${p.cta} for ${p.name}`}
                  onClick={() => handlePlanClick(p)}
                >
                  {p.cta}
                </button>
                {p.paymentRequired && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Payment required • Cancel anytime
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-700">
            All plans include a 14-day free trial. No credit card required for Free plan.{' '}
            <a href="/pricing/faq" className="text-orange-600 underline font-medium">
              See FAQ →
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
