'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from '@/lib/axios';

export default function HallTicketPage() {
  const [hallTicket, setHallTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const params = useParams();

  useEffect(() => {
    fetchHallTicket();
  }, []);

  const fetchHallTicket = async () => {
    try {
      setFetchError('');
      const response = await axios.get(`/exams/hall-ticket/${params.id}`);
      setHallTicket(response.data.hallTicket || null);
    } catch (error) {
      console.error('Error fetching hall ticket:', error);
      const status = error.response?.status;
      const message = error.response?.data?.message || error.response?.data?.error || 'Failed to load hall ticket.';
      setFetchError(status === 403 ? 'You are not authorized to view this hall ticket.' : status === 404 ? 'Hall ticket not found.' : status === 400 ? message : message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Direct PDF export is not available (no PDF library wired). Print remains
  // the supported path — browsers offer Save-as-PDF from the print dialog.

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4 max-w-4xl mx-auto"><div className="h-8 bg-gray-200 rounded w-1/3"></div><div className="h-64 bg-gray-200 rounded"></div></div></div>;
  if (!hallTicket) return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center py-12 bg-gray-50 border rounded-lg">
        <p className="text-gray-700 font-medium">Hall ticket unavailable</p>
        <p className="text-gray-500 text-sm mt-1">{fetchError || 'Hall ticket not found. It is issued only after registration is confirmed and fees are paid.'}</p>
        <button onClick={fetchHallTicket} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    </div>
  );

  const studentName = hallTicket.formData?.personalDetails?.name || hallTicket.student?.userId?.name || '—';
  const studentEmail = hallTicket.formData?.personalDetails?.email || hallTicket.student?.userId?.email || '—';
  const studentPhone = hallTicket.formData?.personalDetails?.phone || '—';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Hall Ticket</h1>
        <div className="space-x-4">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Print
          </button>
          <button
            disabled
            title="PDF export is not available — use Print and choose Save as PDF"
            className="px-4 py-2 bg-green-300 text-white rounded cursor-not-allowed"
          >
            Download PDF (unavailable)
          </button>
        </div>
      </div>

      <div id="hall-ticket" className="bg-white border-2 border-gray-300 p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">CAMPUS HUB UNIVERSITY</h1>
          <h2 className="text-xl font-semibold text-gray-600 mt-2">EXAMINATION HALL TICKET</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 border-b border-gray-300 pb-2">Student Details</h3>
            <div className="space-y-2">
              <p><span className="font-semibold">Name:</span> {studentName}</p>
              <p><span className="font-semibold">USN:</span> {hallTicket.student?.usn || hallTicket.formData?.personalDetails?.usn || '—'}</p>
              <p><span className="font-semibold">Email:</span> {studentEmail}</p>
              <p><span className="font-semibold">Phone:</span> {studentPhone}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 border-b border-gray-300 pb-2">Exam Details</h3>
            <div className="space-y-2">
              <p><span className="font-semibold">Exam:</span> {hallTicket.exam?.title || '—'}</p>
              <p><span className="font-semibold">Date:</span> {hallTicket.exam?.examDate ? new Date(hallTicket.exam.examDate).toLocaleDateString() : '—'}</p>
              <p><span className="font-semibold">Time:</span> {hallTicket.exam?.duration ? `${hallTicket.exam.duration} minutes` : '—'}</p>
              <p><span className="font-semibold">Venue:</span> {hallTicket.exam?.venue || '—'}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 border-b border-gray-300 pb-2">Registration Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <p><span className="font-semibold">Registration Number:</span> {hallTicket.registrationNumber}</p>
            <p><span className="font-semibold">Hall Ticket Number:</span> {hallTicket.hallTicketNumber}</p>
            <p><span className="font-semibold">Status:</span> {hallTicket.status}</p>
            <p><span className="font-semibold">Fee Status:</span> {hallTicket.feeStatus}</p>
          </div>
        </div>

        <div className="border-t border-gray-300 pt-6">
          <h3 className="text-lg font-semibold mb-4">Instructions</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Bring this hall ticket to the examination hall</li>
            <li>Carry a valid photo ID proof</li>
            <li>Report to the examination center 30 minutes before the exam</li>
            <li>Mobile phones and electronic devices are not allowed</li>
            <li>Follow all examination rules and regulations</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <div className="border border-gray-300 p-4 inline-block">
            <p className="text-sm text-gray-600">Student Photo</p>
            <div className="w-24 h-32 bg-gray-200 mx-auto mt-2"></div>
          </div>
        </div>

        <div className="mt-8 text-right">
          <div className="border-t border-gray-300 pt-4 inline-block">
            <p className="text-sm">Controller of Examinations</p>
          </div>
        </div>
      </div>
    </div>
  );
}