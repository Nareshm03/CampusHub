'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import axios from '@/lib/axios';

export default function HallTicketPage() {
  const [hallTicket, setHallTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();

  useEffect(() => {
    fetchHallTicket();
  }, []);

  const fetchHallTicket = async () => {
    try {
      const response = await axios.get(`/api/exams/hall-ticket/${params.id}`);
      setHallTicket(response.data.hallTicket);
    } catch (error) {
      console.error('Error fetching hall ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('hall-ticket');
    const opt = {
      margin: 1,
      filename: `hall-ticket-${hallTicket.hallTicketNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Note: You'll need to install html2pdf.js for this to work
    // html2pdf().set(opt).from(element).save();
    alert('Download feature requires html2pdf.js library');
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!hallTicket) return <div className="p-6">Hall ticket not found</div>;

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
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Download PDF
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
              <p><span className="font-semibold">Name:</span> {hallTicket.formData?.personalDetails?.name}</p>
              <p><span className="font-semibold">USN:</span> {hallTicket.student?.usn}</p>
              <p><span className="font-semibold">Email:</span> {hallTicket.student?.userId?.email}</p>
              <p><span className="font-semibold">Phone:</span> {hallTicket.formData?.personalDetails?.phone}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 border-b border-gray-300 pb-2">Exam Details</h3>
            <div className="space-y-2">
              <p><span className="font-semibold">Exam:</span> {hallTicket.exam?.title}</p>
              <p><span className="font-semibold">Date:</span> {new Date(hallTicket.exam?.examDate).toLocaleDateString()}</p>
              <p><span className="font-semibold">Time:</span> {hallTicket.exam?.duration} minutes</p>
              <p><span className="font-semibold">Venue:</span> {hallTicket.exam?.venue}</p>
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