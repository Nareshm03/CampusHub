'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  TicketIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import ProtectedRoute from '../../../components/ProtectedRoute';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import api from '../../../lib/axios';

const SupportCard = ({ icon: Icon, title, description, href, color }) => (
  <Link href={href}>
    <Card hover className="p-6 h-full group">
      <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/20 w-fit mb-4 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
      <div className="mt-4 flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
        Access
        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Card>
  </Link>
);

const TicketItem = ({ ticket }) => {
  const statusColors = {
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    RESOLVED: 'success',
    CLOSED: 'default'
  };

  const priorityColors = {
    LOW: 'default',
    MEDIUM: 'warning',
    HIGH: 'danger',
    URGENT: 'danger'
  };

  return (
    <Link href={`/tickets`}>
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {ticket.subject}
            </p>
            <Badge variant={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticket.description}</p>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          <Badge variant={statusColors[ticket.status]}>{ticket.status}</Badge>
          <span className="text-xs text-gray-500">
            {new Date(ticket.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets/my');
      setTickets(res.data?.data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const supportOptions = [
    {
      icon: TicketIcon,
      title: 'Submit a Ticket',
      description: 'Create a support ticket for technical issues, account problems, or general inquiries',
      href: '/tickets',
      color: 'blue'
    },
    {
      icon: QuestionMarkCircleIcon,
      title: 'FAQs',
      description: 'Find answers to commonly asked questions about using CampusHub',
      href: '/dashboard/support#faqs',
      color: 'purple'
    },
    {
      icon: BookOpenIcon,
      title: 'Documentation',
      description: 'Browse our comprehensive guides and tutorials for all features',
      href: '/dashboard/support#docs',
      color: 'green'
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time for immediate assistance',
      href: '/messages',
      color: 'orange'
    }
  ];

  const contactInfo = [
    { icon: EnvelopeIcon, label: 'Email', value: 'support@campushub.edu', href: 'mailto:support@campushub.edu' },
    { icon: PhoneIcon, label: 'Phone', value: '+1 (555) 123-4567', href: 'tel:+15551234567' },
    { icon: ClockIcon, label: 'Hours', value: 'Mon-Fri, 9:00 AM - 6:00 PM', href: null }
  ];

  const faqs = [
    {
      question: 'How do I reset my password?',
      answer: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.'
    },
    {
      question: 'How can I view my attendance?',
      answer: 'Navigate to the Attendance section from your dashboard to view detailed attendance records by subject.'
    },
    {
      question: 'Where can I check my marks?',
      answer: 'Go to Marks section to view your internal marks, semester marks, and CGPA calculations.'
    },
    {
      question: 'How do I apply for leave?',
      answer: 'Visit the Leave Management section, click "Apply for Leave", fill in the details, and submit your request.'
    },
    {
      question: 'How can I contact my faculty?',
      answer: 'Use the Messages section to send direct messages to your faculty members.'
    }
  ];

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Support Center</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Get help with CampusHub features, submit tickets, and find answers to your questions
          </p>
        </motion.div>

        {/* Support Options */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {supportOptions.map((option, index) => (
              <motion.div
                key={option.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <SupportCard {...option} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Tickets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Recent Tickets</h2>
              <Link href="/tickets" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <TicketIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No support tickets yet</p>
                <Link href="/tickets" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                  Create your first ticket
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.slice(0, 5).map((ticket) => (
                  <TicketItem key={ticket._id} ticket={ticket} />
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactInfo.map((info) => (
                <div key={info.label} className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/20">
                    <info.icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{info.label}</p>
                    {info.href ? (
                      <a href={info.href} className="text-sm text-primary-600 hover:text-primary-700">
                        {info.value}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{info.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* FAQs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} id="faqs">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <QuestionMarkCircleIcon className="h-4 w-4 text-primary-600" />
                    {faq.question}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">{faq.answer}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </ProtectedRoute>
  );
}
