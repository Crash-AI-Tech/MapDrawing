'use client';

import Link from 'next/link';
import { Mail, ArrowLeft, MessageCircle, HelpCircle, Shield } from 'lucide-react';

const FONT = { fontFamily: 'Fredoka, sans-serif' };

export default function SupportPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white font-sans">
            {/* eslint-disable-next-line @next/next/no-page-custom-font */}
            <link
                href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap"
                rel="stylesheet"
            />

            {/* Header */}
            <header className="border-b border-gray-100 bg-white/80 backdrop-blur-lg">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-violet-600"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="DrawMaps" className="h-7 w-7 rounded-lg" />
                        <span className="text-lg font-bold tracking-tight" style={FONT}>DrawMaps</span>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 py-16">
                {/* Page Title */}
                <div className="mb-16 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100">
                        <HelpCircle className="h-8 w-8 text-violet-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 md:text-5xl" style={FONT}>
                        Support Center
                    </h1>
                    <p className="mt-3 text-lg text-gray-500">
                        We&apos;re here to help you get the most out of DrawMaps.
                    </p>
                </div>

                {/* Contact Card */}
                <section className="mb-12 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                            <Mail className="h-6 w-6 text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900" style={FONT}>Contact Us</h2>
                            <p className="mt-1 text-gray-600">
                                Have a question, bug report, or feature request? Send us an email and we&apos;ll get back to you as soon as possible.
                            </p>
                            <a
                                href="mailto:wenjian@wisebamboo.fun"
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-700 hover:shadow-lg active:scale-95"
                            >
                                <Mail className="h-4 w-4" />
                                wenjian@wisebamboo.fun
                            </a>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section className="mb-12">
                    <div className="mb-6 flex items-center gap-3">
                        <MessageCircle className="h-6 w-6 text-violet-500" />
                        <h2 className="text-2xl font-bold text-gray-900" style={FONT}>
                            Frequently Asked Questions
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            {
                                q: 'What is DrawMaps?',
                                a: 'DrawMaps is a creative mapping tool that lets you draw directly on a real-world map. You can sketch freehand routes, drop custom pins with messages, and see other users\' creations in real time.',
                            },
                            {
                                q: 'How does the ink system work?',
                                a: 'Every user starts with 100 ink points. Drawing on the map consumes ink based on brush size and zoom level. Ink regenerates automatically at a rate of 1 point every 18 seconds, even when you\'re offline.',
                            },
                            {
                                q: 'Can I use DrawMaps on both web and mobile?',
                                a: 'Yes! DrawMaps is available as an iOS app and also works in your web browser. Your drawings and pins sync across all your devices.',
                            },
                            {
                                q: 'Is my data safe?',
                                a: 'We take data security seriously. All data is transmitted over HTTPS and stored securely on Cloudflare infrastructure. We only collect the minimum data necessary to provide the service.',
                            },
                            {
                                q: 'How do I report inappropriate content?',
                                a: 'You can report any pin or drawing by hovering over it and clicking the "Report" button. Our team reviews all reports promptly.',
                            },
                            {
                                q: 'Can I delete my account?',
                                a: 'Yes. Please contact us at wenjian@wisebamboo.fun with your account email and we will process your deletion request within 48 hours.',
                            },
                        ].map((item, i) => (
                            <details
                                key={i}
                                className="group rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm transition-shadow hover:shadow-md"
                            >
                                <summary className="cursor-pointer text-base font-semibold text-gray-900 marker:text-violet-400">
                                    {item.q}
                                </summary>
                                <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* Privacy */}
                <section className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                            <Shield className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900" style={FONT}>Privacy Policy</h2>
                            <p className="mt-1 text-gray-600">
                                We are committed to protecting your privacy. For full details on how we collect, use, and safeguard your data, please read our privacy policy.
                            </p>
                            <a
                                href="https://doc-hosting.flycricket.io/drawmaps-privacy-policy/ab08a782-7dc0-48b1-97c9-e4ce1ac47c55/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-block text-sm font-medium text-violet-600 underline underline-offset-2 hover:text-violet-800"
                            >
                                View Privacy Policy →
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-100 bg-gray-50 px-6 py-6 text-center">
                <p className="text-sm text-gray-400" style={FONT}>
                    © {new Date().getFullYear()} DrawMaps · Global Collaborative Art Platform
                </p>
            </footer>
        </div>
    );
}
