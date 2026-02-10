
'use client';

import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        // Integrate with backend API in reality
    };

    return (
        <main className="min-h-screen bg-white dark:bg-slate-950 pt-32 pb-20 px-6 transition-colors duration-300">
            <div className="container mx-auto max-w-6xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

                    {/* Contact Info */}
                    <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
                            Get in <span className="text-indigo-600 dark:text-indigo-400">Touch</span>
                        </h1>
                        <p className="text-xl text-slate-600 dark:text-slate-400 mb-12">
                            Have questions about our institutional API? Need a custom integration? We're here to help.
                        </p>

                        <div className="space-y-8">
                            <ContactItem
                                icon={<Mail className="w-6 h-6" />}
                                title="Email Us"
                                content="institutional@quant101.com"
                            />
                            <ContactItem
                                icon={<Phone className="w-6 h-6" />}
                                title="Call Us"
                                content="+1 (555) 123-4567"
                            />
                            <ContactItem
                                icon={<MapPin className="w-6 h-6" />}
                                title="Visit Us"
                                content="101 Quant Way, Wall Street, NY 10005"
                            />
                        </div>

                        <div className="mt-12 p-6 bg-indigo-50 dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-800">
                            <h3 className="font-bold text-indigo-900 dark:text-white mb-2">Support Hours</h3>
                            <p className="text-indigo-700 dark:text-slate-400">Monday - Friday: 8am - 6pm EST</p>
                            <p className="text-indigo-700 dark:text-slate-400">24/7 dedicated support for Enterprise clients.</p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
                        {submitted ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 text-green-600 dark:text-green-400">
                                    <Send className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message Sent!</h3>
                                <p className="text-slate-600 dark:text-slate-400">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="mt-8 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">First Name</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all" placeholder="John" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
                                        <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all" placeholder="Doe" required />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Work Email</label>
                                    <input type="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all" placeholder="name@company.com" required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subject</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all">
                                        <option>Enterprise Licensing</option>
                                        <option>Technical Support</option>
                                        <option>Partnership Inquiry</option>
                                        <option>Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message</label>
                                    <textarea rows={4} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition-all" placeholder="How can we help you?" required></textarea>
                                </div>

                                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-600/30 transform hover:-translate-y-1">
                                    Send Message
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

function ContactItem({ icon, title, content }: any) {
    return (
        <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{content}</p>
            </div>
        </div>
    )
}
