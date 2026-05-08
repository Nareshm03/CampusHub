'use client';
import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/axios';
import Card from '../../components/ui/Card';
import { PageLoader } from '../../components/ui/Loading';
import { toast } from 'sonner';

// Currency symbol — single source of truth for the entire page
const CURRENCY_SYMBOL = '₹';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

/** Format a number as a currency string */
const fmt = (amount) =>
  `${CURRENCY_SYMBOL}${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

// ─── Stripe checkout form ────────────────────────────────────────────────────

function CheckoutForm({ feeId, amountFormatted, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required'
    });

    if (error) {
      toast.error(error.message || 'Payment failed. Please try again.');
    } else if (paymentIntent?.status === 'succeeded') {
      toast.success(`Payment of ${amountFormatted} successful! A confirmation email has been sent.`);
      onSuccess();
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {processing ? 'Processing…' : `Pay ${amountFormatted}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function StudentFeesPage() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePayment, setActivePayment] = useState(null); // { feeId, clientSecret, amountFormatted }

  const fetchFees = useCallback(async () => {
    try {
      setLoading(true);

      let res;
      if (user?.role === 'PARENT') {
        // Parent: fetch by linked student's Student._id
        if (!user.linkedStudentId) return;
        res = await api.get(`/fees/student/${user.linkedStudentId}`);
        setFees(res.data?.data || []);
      } else {
        // Student: backend resolves User._id → Student._id internally
        res = await api.get('/fees/my');
        setFees(res.data?.data || []);
      }
    } catch (err) {
      toast.error('Failed to load fee records.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchFees();
  }, [user, fetchFees]);

  const initiatePayment = async (feeId, balance) => {
    try {
      const res = await api.post(`/fees/${feeId}/create-payment-intent`);
      if (res.data?.success) {
        setActivePayment({
          feeId,
          clientSecret: res.data.clientSecret,
          amountFormatted: res.data.amountFormatted || fmt(balance)
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not initiate payment. Please try again.');
    }
  };

  const handlePaymentSuccess = () => {
    setActivePayment(null);
    fetchFees();
  };

  if (loading) return <PageLoader message="Loading financial records…" />;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fees & Payments</h1>
        <p className="text-gray-500 mt-1">
          Manage pending tuition, track receipts, and securely pay online.
        </p>
      </div>

      {/* Stripe checkout modal */}
      {activePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Secure Payment</h2>
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: activePayment.clientSecret }}
            >
              <CheckoutForm
                feeId={activePayment.feeId}
                amountFormatted={activePayment.amountFormatted}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setActivePayment(null)}
              />
            </Elements>
          </Card>
        </div>
      )}

      <div className="grid gap-4">
        {fees.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            You have no outstanding or past fees on record.
          </Card>
        ) : (
          fees.map((fee) => {
            const balance = fee.totalAmount - (fee.paidAmount || 0);
            const isPaid = fee.status === 'PAID';
            return (
              <Card
                key={fee._id}
                className={`p-6 border-l-4 ${isPaid ? 'border-l-green-500' : 'border-l-red-500'}`}
              >
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {fee.title || `Semester ${fee.semester} Tuition`}
                    </h3>
                    <p className="text-sm text-gray-500">Academic Year: {fee.academicYear}</p>
                    <div className="mt-2 text-sm space-y-1">
                      <p>
                        Total:{' '}
                        <span className="font-medium">{fmt(fee.totalAmount)}</span>
                      </p>
                      <p>
                        Paid:{' '}
                        <span className="text-green-600 font-medium">
                          {fmt(fee.paidAmount || 0)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3">
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        isPaid
                          ? 'bg-green-100 text-green-700'
                          : fee.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-700'
                          : fee.status === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {fee.status}
                    </span>

                    {!isPaid && (
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          Due: {fmt(balance)}
                        </span>
                        <button
                          onClick={() => initiatePayment(fee._id, balance)}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                        >
                          Pay Securely
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment history */}
                {fee.payments?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Payment History
                    </p>
                    <div className="space-y-1">
                      {fee.payments.map((p, i) => (
                        <div
                          key={i}
                          className="flex justify-between text-sm text-gray-600 dark:text-gray-400"
                        >
                          <span className="font-mono text-xs">{p.receiptNumber}</span>
                          <span>{fmt(p.amount)}</span>
                          <span>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
