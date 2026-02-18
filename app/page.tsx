'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'

// ─── Data Constants ─────────────────────────────────────────────────────────

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

const stats = [
  { value: '610+', label: 'Validation Rules' },
  { value: '4', label: 'RPA Platforms' },
  { value: '<10ms', label: 'Avg Validation' },
  { value: '9,537', label: 'Workflows/min' },
]

const capabilities = [
  {
    title: 'Instant Validation',
    description: 'Validate any automation file in under 10 milliseconds. No waiting, no queues.',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    hoverBorder: 'hover:border-blue-500/50',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'CI/CD Integration',
    description: 'REST API and GitHub Actions for automated validation in your deployment pipeline.',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    hoverBorder: 'hover:border-green-500/50',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Custom Rules',
    description: 'Build organization-specific rules with regex patterns, field targeting, and severity levels.',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/50',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
  {
    title: 'Auto-Fix Suggestions',
    description: 'AI-powered recommendations to fix flagged issues automatically.',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    hoverBorder: 'hover:border-cyan-500/50',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    title: 'Release Validation',
    description: 'Validate entire Blue Prism release packages, UiPath .nupkg files, and AA bot bundles at once.',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    hoverBorder: 'hover:border-orange-500/50',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'Export Reports',
    description: 'Generate validation reports in CSV, Excel, and PDF formats for compliance.',
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-400',
    hoverBorder: 'hover:border-pink-500/50',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const testimonials = [
  {
    quote: 'Nomion caught 47 issues in our Blue Prism release that would have caused production failures. It\'s now a mandatory step in our deployment pipeline.',
    name: 'Sarah Chen',
    initials: 'SC',
    title: 'RPA Lead',
    company: 'Fortune 500 Manufacturing Company',
  },
  {
    quote: 'We reduced our automation review time by 80%. What used to take our CoE team hours now takes seconds with Nomion\'s instant validation.',
    name: 'Marcus Rodriguez',
    initials: 'MR',
    title: 'Automation Director',
    company: 'Global Financial Services Firm',
  },
  {
    quote: 'The custom rules feature lets us enforce our internal standards across 200+ UiPath workflows. Game changer for governance.',
    name: 'Priya Patel',
    initials: 'PP',
    title: 'CoE Manager',
    company: 'Enterprise Healthcare Provider',
  },
]

const trustedCompanies = [
  'Fortune 500 Bank',
  'Global Insurance Corp',
  'Big 4 Consultancy',
  'Enterprise Tech Co',
  'Healthcare Leader',
  'Manufacturing Giant',
]

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for individual developers evaluating Nomion.',
    highlighted: false,
    features: [
      '15 validations per month',
      '1 RPA platform',
      'Core validation rules',
      'Community support',
      'Validation history (7 days)',
    ],
    cta: 'Get Started Free',
    ctaHref: '/dashboard',
  },
  {
    name: 'Team',
    price: '$49',
    period: '/user/month',
    description: 'For teams validating across all platforms.',
    highlighted: true,
    features: [
      'Unlimited validations',
      'All 4 RPA platforms',
      '610+ validation rules',
      'Custom rules engine',
      'Validation history & analytics',
      'API access',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/dashboard?plan=team&trial=true',
  },
  {
    name: 'Business',
    price: '$149',
    period: '/user/month',
    description: 'For teams with CI/CD pipelines and governance needs.',
    highlighted: false,
    features: [
      'Everything in Team, plus:',
      'CI/CD integration',
      'GitHub & Azure DevOps',
      'Approval workflows',
      'Batch validation',
      'Export reports (CSV, PDF, SARIF)',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/dashboard?plan=business&trial=true',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations needing full control and compliance.',
    highlighted: false,
    features: [
      'Everything in Business, plus:',
      'SSO / SAML authentication',
      'Role-based access control (RBAC)',
      'Audit logging',
      'Dedicated support & SLA',
      'On-premise deployment option',
      'Custom integrations (Slack, Teams, Jira)',
    ],
    cta: 'Contact Sales',
    ctaHref: '#demo-form',
  },
]

const faqItems = [
  {
    question: 'What RPA platforms does Nomion support?',
    answer: 'Nomion validates automations from Blue Prism (.bpprocess, .bpobject, .bprelease), UiPath (.xaml, .nupkg, project.json), Power Automate (Cloud flows and Desktop flows via solution packages), and Automation Anywhere A360 (.bot.json files).',
  },
  {
    question: 'How fast is validation?',
    answer: 'Average validation time is under 10 milliseconds per file. Nomion can process over 9,500 workflows per minute, making it fast enough to integrate into any CI/CD pipeline without slowing down deployments.',
  },
  {
    question: 'Can I create custom validation rules?',
    answer: 'Yes. The custom rule builder lets you define organization-specific rules using regex patterns, field targeting, and configurable severity levels. Custom rules work alongside the 610+ built-in rules.',
  },
  {
    question: 'Does Nomion integrate with CI/CD pipelines?',
    answer: 'Absolutely. Nomion provides a REST API and a GitHub Action for automated validation. You can fail builds based on validation results and post review comments directly on pull requests.',
  },
  {
    question: 'What file types are supported?',
    answer: 'Blue Prism: .bpprocess, .bpobject, .bprelease files. UiPath: .xaml workflows, .nupkg packages, and project.json. Power Automate: exported solution .zip packages containing cloud and desktop flows. Automation Anywhere: A360 .bot.json files.',
  },
  {
    question: 'Is there a free plan?',
    answer: 'Yes. The Free plan includes 15 validations per month on 1 platform with core validation rules and no credit card required. Team ($49/user/month) and Business ($149/user/month) plans include a 14-day free trial with unlimited validations across all platforms — no credit card required to start.',
  },
  {
    question: 'How does enterprise pricing work?',
    answer: 'Enterprise pricing is customized based on your team size, deployment requirements (cloud vs. on-premise), and support needs. Enterprise includes SSO/SAML authentication, role-based access control, comprehensive audit logging, and dedicated support. Contact our sales team for a tailored quote.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. Automation files are processed in memory and never stored on disk. Validation results are encrypted at rest. Enterprise customers can deploy Nomion on-premise for full data sovereignty.',
  },
]

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Request Demo', href: '#demo-form' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Changelog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: 'mailto:hello@xolani.dev' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [demoForm, setDemoForm] = useState({
    fullName: '',
    email: '',
    company: '',
    teamSize: '',
    platforms: [] as string[],
    message: '',
  })
  const [demoSubmitting, setDemoSubmitting] = useState(false)
  const [demoSubmitted, setDemoSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSubmitted, setEmailSubmitted] = useState(false)

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Connect to email capture
    setEmailSubmitted(true)
  }

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDemoSubmitting(true)
    // TODO: Connect to backend API
    await new Promise(resolve => setTimeout(resolve, 1500))
    setDemoSubmitting(false)
    setDemoSubmitted(true)
  }

  const togglePlatform = (platform: string) => {
    setDemoForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
              <span className="text-white font-bold text-2xl">Nomion</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map(link => (
                <a key={link.label} href={link.href} className="text-gray-300 hover:text-white transition text-sm">
                  {link.label}
                </a>
              ))}
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <a
                href="#demo-form"
                className="border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 px-5 py-2 rounded-lg font-medium transition text-sm"
              >
                Request Demo
              </a>
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition text-sm"
              >
                Launch App
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden text-gray-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-800 pt-4 space-y-3">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-gray-300 hover:text-white transition py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#demo-form"
                className="block border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 px-5 py-2 rounded-lg font-medium transition text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Request Demo
              </a>
              <Link
                href="/dashboard"
                className="block bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition text-center"
              >
                Launch App
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="container mx-auto px-6 pt-20 pb-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <span className="text-blue-400 text-sm font-medium">610+ validation rules across 4 RPA platforms</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Ship automation with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                confidence
              </span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Validate your Blue Prism, UiPath, Power Automate, and Automation Anywhere releases against 610+ best practice rules
              before they reach production. Catch issues in seconds, not sprints.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-blue-500/25"
              >
                Start Free Trial
              </Link>
              <a
                href="#demo-form"
                className="w-full sm:w-auto border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition"
              >
                Request Demo
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="max-w-4xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Logos ─────────────────────────────────────────────── */}
      <section className="border-y border-gray-800 py-12 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <p className="text-center text-gray-500 text-sm mb-8 tracking-wide">VALIDATES AUTOMATIONS FROM</p>
          <div className="flex flex-wrap justify-center items-center gap-12">
            <div className="flex items-center gap-3">
              <Image src="/platforms/blueprism.svg" alt="Blue Prism" width={36} height={36} />
              <span className="text-gray-300 font-semibold text-lg">Blue Prism</span>
            </div>
            <div className="flex items-center gap-3">
              <Image src="/platforms/uipath.svg" alt="UiPath" width={36} height={36} />
              <span className="text-gray-300 font-semibold text-lg">UiPath</span>
            </div>
            <div className="flex items-center gap-3">
              <Image src="/platforms/powerautomate.svg" alt="Power Automate" width={36} height={36} />
              <span className="text-gray-300 font-semibold text-lg">Power Automate</span>
            </div>
            <div className="flex items-center gap-3">
              <Image src="/platforms/automationanywhere.svg" alt="Automation Anywhere" width={36} height={36} />
              <span className="text-gray-300 font-semibold text-lg">Automation Anywhere</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ───────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-20 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Enterprise-grade validation for every platform
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            One tool to validate them all. Upload your automation files and get instant feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Blue Prism */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition">
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
              <Image src="/platforms/blueprism.svg" alt="Blue Prism" width={32} height={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Blue Prism</h3>
            <p className="text-gray-400 mb-4">
              321+ rules covering processes, objects, environment variables, work queues, and more.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> .bpprocess, .bpobject, .bprelease
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Full XML parsing
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Release validation
              </li>
            </ul>
          </div>

          {/* UiPath */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-orange-500/50 transition">
            <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center mb-6">
              <Image src="/platforms/uipath.svg" alt="UiPath" width={32} height={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">UiPath</h3>
            <p className="text-gray-400 mb-4">
              88 rules across security, selectors, exception handling, logging, and REFramework detection.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> .xaml, .nupkg, project.json
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Selector quality scoring
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> 9,537 workflows/minute
              </li>
            </ul>
          </div>

          {/* Power Automate */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-purple-500/50 transition">
            <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
              <Image src="/platforms/powerautomate.svg" alt="Power Automate" width={32} height={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Power Automate</h3>
            <p className="text-gray-400 mb-4">
              154 rules across 12 categories including security, performance, error handling, and ALM/DevOps.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Cloud &amp; Desktop flows
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Solution package parsing
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Security scanning
              </li>
            </ul>
          </div>

          {/* Automation Anywhere */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-red-500/50 transition">
            <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
              <Image src="/platforms/automationanywhere.svg" alt="Automation Anywhere" width={32} height={32} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Automation Anywhere</h3>
            <p className="text-gray-400 mb-4">
              46 rules across 10 categories including security, bot structure, performance, and credentials.
            </p>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> A360 .bot.json files
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> SQL injection detection
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">&#10003;</span> Credential vault enforcement
              </li>
            </ul>
          </div>
        </div>

        {/* Rule Categories */}
        <div className="mt-16 bg-slate-800/30 border border-slate-700 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">Rule Categories</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'Security', 'Performance', 'Error Handling', 'Naming Conventions',
              'Variables', 'Logging', 'Selectors', 'Connection Management',
              'ALM/DevOps', 'Data Operations', 'Trigger Config', 'Bot Structure',
              'Configuration', 'Best Practices'
            ].map(cat => (
              <span key={cat} className="px-4 py-2 bg-slate-700/50 text-gray-300 rounded-lg text-sm">
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Capabilities ───────────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Everything you need to ship quality automations
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            From instant validation to CI/CD integration, Nomion covers the entire quality lifecycle.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {capabilities.map(cap => (
            <div
              key={cap.title}
              className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-8 ${cap.hoverBorder} transition group`}
            >
              <div className={`w-14 h-14 ${cap.iconBg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${cap.iconColor}`}>
                {cap.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{cap.title}</h3>
              <p className="text-gray-400">{cap.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Validate in 3 steps
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { step: '1', title: 'Upload', desc: 'Drop your automation file — process, workflow, or release package' },
            { step: '2', title: 'Validate', desc: 'Nomion scans against 560+ rules in under 10 milliseconds' },
            { step: '3', title: 'Ship', desc: 'Fix flagged issues and deploy with confidence' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social Proof ───────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Loved by RPA teams worldwide
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            See why automation teams trust Nomion to catch issues before production.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map(t => (
            <div key={t.name} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {t.initials}
                </div>
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-gray-500 text-sm">{t.title}, {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trusted By */}
        <div className="border-t border-gray-800 pt-12">
          <p className="text-center text-gray-500 text-sm mb-8 tracking-wide">TRUSTED BY RPA TEAMS AT</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
            {trustedCompanies.map(name => (
              <div key={name} className="text-gray-500 font-semibold text-lg">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Start free. Scale when you&apos;re ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-start">
          {pricingTiers.map(tier => (
            <div
              key={tier.name}
              className={`rounded-2xl p-8 relative overflow-hidden ${
                tier.highlighted
                  ? 'bg-gradient-to-b from-slate-800 to-slate-800/50 border-2 border-blue-500/40 md:scale-105'
                  : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              {tier.highlighted && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`font-bold text-white ${tier.price === 'Custom' ? 'text-3xl' : 'text-5xl'}`}>
                    {tier.price}
                  </span>
                  {tier.period && <span className="text-gray-400">{tier.period}</span>}
                </div>
                <p className="text-gray-500 mt-2 text-sm">{tier.description}</p>
              </div>
              <ul className="space-y-4 mb-8">
                {tier.features.map(feature => (
                  <li key={feature} className="flex items-center gap-3 text-gray-300 text-sm">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              {tier.ctaHref.startsWith('/') ? (
                <Link
                  href={tier.ctaHref}
                  className={`block w-full text-center py-4 rounded-xl font-semibold transition ${
                    tier.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
                  }`}
                >
                  {tier.cta}
                </Link>
              ) : (
                <a
                  href={tier.ctaHref}
                  className="block w-full text-center py-4 rounded-xl font-semibold transition border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white"
                >
                  {tier.cta}
                </a>
              )}
              {tier.highlighted && (
                <p className="text-center text-gray-500 text-sm mt-4">14-day free trial &middot; No credit card required</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ Section ────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Frequently asked questions
          </h2>
          <p className="text-gray-400 text-lg">
            Everything you need to know about Nomion.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-800/80 transition"
              >
                <span className="text-white font-medium pr-4">{item.question}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaqIndex === index ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaqIndex === index && (
                <div className="px-6 pb-6 text-gray-400 leading-relaxed">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Demo Request Form ──────────────────────────────────────────── */}
      <section id="demo-form" className="scroll-mt-20 container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Request a demo
            </h2>
            <p className="text-gray-400 text-lg">
              See Nomion in action. Our team will walk you through the platform.
            </p>
          </div>

          {!demoSubmitted ? (
            <form onSubmit={handleDemoSubmit} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 space-y-6">
              {/* Name & Email */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={demoForm.fullName}
                    onChange={e => setDemoForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Work Email</label>
                  <input
                    type="email"
                    value={demoForm.email}
                    onChange={e => setDemoForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@company.com"
                    className="w-full px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Company & Team Size */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={demoForm.company}
                    onChange={e => setDemoForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Acme Corp"
                    className="w-full px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Team Size</label>
                  <select
                    value={demoForm.teamSize}
                    onChange={e => setDemoForm(prev => ({ ...prev, teamSize: e.target.value }))}
                    className="w-full px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition appearance-none"
                    required
                  >
                    <option value="" disabled>Select team size</option>
                    <option value="1-5">1-5</option>
                    <option value="6-20">6-20</option>
                    <option value="21-50">21-50</option>
                    <option value="51-200">51-200</option>
                    <option value="200+">200+</option>
                  </select>
                </div>
              </div>

              {/* RPA Platforms */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">RPA Platforms</label>
                <div className="flex flex-wrap gap-4">
                  {['Blue Prism', 'UiPath', 'Power Automate', 'Automation Anywhere'].map(platform => (
                    <label key={platform} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={demoForm.platforms.includes(platform)}
                        onChange={() => togglePlatform(platform)}
                        className="w-4 h-4 rounded border-gray-600 bg-slate-900 accent-blue-500"
                      />
                      <span className="text-gray-300 text-sm">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message (optional)</label>
                <textarea
                  value={demoForm.message}
                  onChange={e => setDemoForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  placeholder="Tell us about your automation environment and what you're looking for..."
                  className="w-full px-5 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={demoSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoSubmitting ? 'Sending...' : 'Request Demo'}
              </button>
            </form>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Demo request received!</h3>
              <p className="text-gray-400">We&apos;ll be in touch within 24 hours to schedule your personalized demo.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="container mx-auto px-6 py-24 border-t border-gray-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to ship better automations?
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join hundreds of RPA teams using Nomion to catch issues before production.
          </p>
          {!emailSubmitted ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your work email"
                className="flex-1 px-5 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition"
              >
                Get Started
              </button>
            </form>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-6 py-4 rounded-xl">
              You&apos;re in! Check your email for next steps.
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800 bg-slate-900">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">N</span>
                </div>
                <span className="text-white font-semibold text-lg">Nomion</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                The RPA quality gate. Validate your automations against 560+ rules before production.
              </p>
            </div>

            {/* Link columns */}
            {footerColumns.map(col => (
              <div key={col.title}>
                <h4 className="text-white font-semibold mb-4 text-sm">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link href={link.href} className="text-gray-400 hover:text-white text-sm transition">
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className="text-gray-400 hover:text-white text-sm transition">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-gray-500 text-sm">&copy; 2026 Xolani Dube. All rights reserved.</span>
            <div className="flex gap-6">
              {/* GitHub */}
              <a href="#" className="text-gray-500 hover:text-white transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              {/* Twitter/X */}
              <a href="#" className="text-gray-500 hover:text-white transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a href="#" className="text-gray-500 hover:text-white transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
