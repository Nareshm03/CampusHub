'use client';
import { useState, useEffect } from 'react';
import api from '../../../../lib/axios';
import Card from '../../../../components/ui/Card';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import { toast } from 'sonner';

const inputCls = 'w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm';
const btnPrimary = 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50';
const btnDanger = 'px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs';
const btnGhost = 'px-3 py-1 border rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-800';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminFeesPage() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [formData, setFormData] = useState({
    student: '',
    semester: 1,
    academicYear: '2024-2025',
    tuitionFee: 0,
    examFee: 0,
    libraryFee: 0,
    labFee: 0,
    otherFees: 0,
    dueDate: '',
  });
  const [editData, setEditData] = useState({ dueDate: '' });
  const [payData, setPayData] = useState({ amount: '', paymentMethod: 'CASH', transactionId: '' });

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [feesRes, studentsRes, summaryRes] = await Promise.all([
        api.get(`/fees${statusFilter ? `?status=${statusFilter}` : ''}`),
        api.get('/students'),
        api.get('/fees/summary'),
      ]);
      setFees(feesRes.data?.data || []);
      const list = studentsRes.data?.data || studentsRes.data || [];
      setStudents(Array.isArray(list) ? list : []);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load fee records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    setLoading(true);
    api.get(`/fees${statusFilter ? `?status=${statusFilter}` : ''}`)
      .then((res) => setFees(res.data?.data || []))
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load fee records'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        student: formData.student,
        semester: Number(formData.semester),
        academicYear: formData.academicYear,
        tuitionFee: Number(formData.tuitionFee) || 0,
        examFee: Number(formData.examFee) || 0,
        libraryFee: Number(formData.libraryFee) || 0,
        labFee: Number(formData.labFee) || 0,
        otherFees: Number(formData.otherFees) || 0,
        dueDate: formData.dueDate,
      };
      const res = await api.post('/fees', payload);
      if (res.data?.success) {
        toast.success('Fee invoice generated successfully!');
        setFormData({ student: '', semester: 1, academicYear: '2024-2025', tuitionFee: 0, examFee: 0, libraryFee: 0, labFee: 0, otherFees: 0, dueDate: '' });
        fetchAll();
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to issue fee.');
    }
  };

  const handleDelete = async (feeId) => {
    if (!window.confirm('Delete this fee record? Only records without payments can be deleted.')) return;
    try {
      await api.delete(`/fees/${feeId}`);
      toast.success('Fee record deleted');
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete fee record');
    }
  };

  const startEdit = (fee) => {
    setEditingId(fee._id);
    setEditData({ dueDate: fee.dueDate ? new Date(fee.dueDate).toISOString().split('T')[0] : '' });
  };

  const saveEdit = async (feeId) => {
    try {
      await api.put(`/fees/${feeId}`, { dueDate: editData.dueDate || undefined });
      toast.success('Fee record updated');
      setEditingId(null);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update fee record');
    }
  };

  const recordPayment = async (feeId) => {
    try {
      await api.post(`/fees/${feeId}/payment`, {
        amount: Number(payData.amount),
        paymentMethod: payData.paymentMethod,
        transactionId: payData.transactionId || undefined,
      });
      toast.success('Payment recorded');
      setPayingId(null);
      setPayData({ amount: '', paymentMethod: 'CASH', transactionId: '' });
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to record payment');
    }
  };

  const remind = async (feeId) => {
    try {
      await api.post(`/fees/${feeId}/remind`);
      toast.success('Reminder sent');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to send reminder');
    }
  };

  const summaryCards = summary
    ? (Array.isArray(summary) ? summary : []).reduce(
        (acc, row) => {
          acc.count += row.count || 0;
          acc.total += row.totalAmount || 0;
          acc.paid += row.paidAmount || 0;
          return acc;
        },
        { count: 0, total: 0, paid: 0 }
      )
    : null;

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
          <p className="text-gray-500">Issue invoices, track payments, and manage student fee records.</p>
        </div>

        {summaryCards && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center"><div className="text-2xl font-bold">{summaryCards.count}</div><div className="text-sm text-gray-600">Invoices</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-bold">{fmt(summaryCards.total)}</div><div className="text-sm text-gray-600">Billed</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{fmt(summaryCards.paid)}</div><div className="text-sm text-gray-600">Collected</div></Card>
            <Card className="p-4 text-center"><div className="text-2xl font-bold text-red-600">{fmt(summaryCards.total - summaryCards.paid)}</div><div className="text-sm text-gray-600">Outstanding</div></Card>
          </div>
        )}

        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchAll} className="mt-2 text-sm text-red-700 underline">Try again</button>
          </Card>
        )}

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold">Issue New Fee Invoice</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student</label>
                <select required className={inputCls} value={formData.student} onChange={(e) => setFormData({ ...formData, student: e.target.value })}>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>{s.userId?.name || s.usn} ({s.usn})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Academic Year</label>
                <select className={inputCls} value={formData.academicYear} onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Semester (1-8)</label>
                <input type="number" min="1" max="8" required className={inputCls} value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input type="date" required className={inputCls} value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[['tuitionFee', 'Tuition'], ['examFee', 'Exam'], ['libraryFee', 'Library'], ['labFee', 'Lab'], ['otherFees', 'Other']].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm text-gray-600">{label} (₹)</label>
                  <input type="number" min="0" className={inputCls} value={formData[key]} onChange={(e) => setFormData({ ...formData, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg">
              Generate Fee Invoice
            </button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Fee Records</h3>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 border rounded text-sm">
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Loading fee records…</p>
          ) : fees.length === 0 ? (
            <p className="text-sm text-gray-500">No fee records{statusFilter ? ` with status ${statusFilter}` : ''}.</p>
          ) : (
            <div className="space-y-3">
              {fees.map((fee) => (
                <div key={fee._id} className="border rounded-lg p-4 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1">
                      <span className="font-semibold">{fee.student?.userId?.name || 'Unknown'}</span>
                      <span className="text-gray-500"> ({fee.student?.usn || 'N/A'})</span>
                      <span className="text-gray-500"> • Sem {fee.semester} • {fee.academicYear}</span>
                      <div className="text-gray-600 mt-1">
                        Total {fmt(fee.totalAmount)} • Paid <span className="text-green-600">{fmt(fee.paidAmount || 0)}</span> • Due {fmt(fee.totalAmount - (fee.paidAmount || 0))}
                        {' • '}<span className="font-medium">{fee.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingId === fee._id ? (
                        <>
                          <input type="date" value={editData.dueDate} onChange={(e) => setEditData({ dueDate: e.target.value })} className="px-2 py-1 border rounded text-xs" />
                          <button className={btnPrimary} onClick={() => saveEdit(fee._id)}>Save</button>
                          <button className={btnGhost} onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className={btnGhost} onClick={() => startEdit(fee)}>Edit</button>
                          <button className={btnGhost} onClick={() => setPayingId(payingId === fee._id ? null : fee._id)}>Payment</button>
                          <button className={btnGhost} onClick={() => remind(fee._id)}>Remind</button>
                          <button className={btnDanger} onClick={() => handleDelete(fee._id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                  {payingId === fee._id && (
                    <div className="mt-3 flex flex-col sm:flex-row gap-2 border-t pt-3">
                      <input type="number" min="0" placeholder="Amount" value={payData.amount} onChange={(e) => setPayData({ ...payData, amount: e.target.value })} className="px-2 py-1 border rounded text-xs" />
                      <select value={payData.paymentMethod} onChange={(e) => setPayData({ ...payData, paymentMethod: e.target.value })} className="px-2 py-1 border rounded text-xs">
                        <option value="CASH">CASH</option>
                        <option value="CARD">CARD</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                        <option value="CHEQUE">CHEQUE</option>
                      </select>
                      <input placeholder="Transaction ID (optional)" value={payData.transactionId} onChange={(e) => setPayData({ ...payData, transactionId: e.target.value })} className="px-2 py-1 border rounded text-xs" />
                      <button className={btnPrimary} onClick={() => recordPayment(fee._id)}>Record</button>
                    </div>
                  )}
                  {(fee.payments || []).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                      {fee.payments.map((p, i) => (
                        <p key={i} className="font-mono">{p.receiptNumber} • {fmt(p.amount)} • {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : ''} • {p.paymentMethod || ''}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
