'use client';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import axios from '@/lib/axios';

const statusColor = (status) => {
  switch (status) {
    case 'APPROVED':
    case 'CHECKED_IN':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const fmtDate = (value) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
};

export default function Hostel() {
  const [allocation, setAllocation] = useState(null); // { kind: 'booking'|'allocated', data }
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ hostelId: '', roomNumber: '', moveInDate: '', checkOutDate: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [roomRes, availRes] = await Promise.all([
        axios.get('/hostel/my-room').catch((err) => {
          // 404 means "no allocation yet" — not a failure
          if (err.response?.status === 404) return { data: null };
          throw err;
        }),
        axios.get('/hostel/rooms/available'),
      ]);
      if (roomRes.data) {
        setAllocation({ kind: roomRes.data.type, data: roomRes.data.data });
      } else {
        setAllocation(null);
      }
      setAvailableRooms(roomRes.data ? availRes.data?.data || [] : availRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load hostel information');
    } finally {
      setLoading(false);
    }
  };

  const requestBooking = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (!form.hostelId || !form.roomNumber || !form.moveInDate || !form.checkOutDate) {
      setMessage({ type: 'error', text: 'Select a hostel, room, and both dates' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post('/hostel/book', {
        hostelId: form.hostelId,
        roomNumber: form.roomNumber,
        moveInDate: form.moveInDate,
        checkOutDate: form.checkOutDate,
      });
      setMessage({ type: 'success', text: 'Booking request submitted for admin approval' });
      setForm({ hostelId: '', roomNumber: '', moveInDate: '', checkOutDate: '' });
      fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to submit booking request' });
    } finally {
      setSubmitting(false);
    }
  };

  const cancelBooking = async (bookingId) => {
    setMessage({ type: '', text: '' });
    try {
      await axios.put(`/hostel/booking/${bookingId}/cancel`);
      setMessage({ type: 'success', text: 'Booking cancelled' });
      fetchAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to cancel booking' });
    }
  };

  const hostels = [];
  const seenHostels = new Set();
  availableRooms.forEach((room) => {
    if (!seenHostels.has(String(room.hostelId))) {
      seenHostels.add(String(room.hostelId));
      hostels.push({ id: room.hostelId, name: `${room.hostelName} (${room.hostelType})` });
    }
  });
  const roomsForHostel = availableRooms.filter((room) => String(room.hostelId) === String(form.hostelId));

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['STUDENT']}>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['STUDENT']}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Hostel</h1>

        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchAll} className="mt-2 text-sm text-red-700 underline">Try again</button>
          </Card>
        )}

        {message.text && (
          <div className={`p-3 rounded text-sm border ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {message.text}
          </div>
        )}

        {/* Current allocation or booking */}
        {allocation?.kind === 'booking' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">My Booking</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(allocation.data.status)}`}>
                {allocation.data.status}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <p><strong>Hostel:</strong> {allocation.data.hostel?.name || 'N/A'} ({allocation.data.hostel?.type || ''})</p>
              <p><strong>Room:</strong> {allocation.data.roomNumber}</p>
              <p><strong>Move-in:</strong> {fmtDate(allocation.data.moveInDate)}</p>
              <p><strong>Check-out:</strong> {fmtDate(allocation.data.checkOutDate)}</p>
              {allocation.data.adminNote && (
                <p className="md:col-span-2"><strong>Admin note:</strong> {allocation.data.adminNote}</p>
              )}
            </div>
            {['PENDING', 'APPROVED'].includes(allocation.data.status) && (
              <button
                onClick={() => cancelBooking(allocation.data._id)}
                className="mt-4 px-4 py-2 text-sm border border-red-300 text-red-700 rounded hover:bg-red-50"
              >
                Cancel Booking
              </button>
            )}
            {allocation.data.hostel?.mess?.menu?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Mess Menu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allocation.data.hostel.mess.menu.map((menu, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{menu.day}:</strong> {menu.breakfast} | {menu.lunch} | {menu.dinner}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {allocation?.kind === 'allocated' && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">My Room</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Room Details</h3>
                <p>Hostel: {allocation.data.hostelName || 'N/A'}</p>
                <p>Room Number: {allocation.data.roomNumber || 'N/A'}</p>
                <p>Monthly Rent: ₹{allocation.data.rent ?? 'N/A'}</p>
              </div>
              <div>
                <h3 className="font-semibold">Roommates</h3>
                {(!allocation.data.roommates || allocation.data.roommates.length === 0) ? (
                  <p>No roommates</p>
                ) : (
                  allocation.data.roommates.map((mate) => (
                    <p key={mate._id || mate.usn}>{mate.userId?.name || 'Unknown'} ({mate.usn || 'N/A'})</p>
                  ))
                )}
              </div>
            </div>

            {allocation.data.messMenu?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Mess Menu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allocation.data.messMenu.map((menu, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{menu.day}:</strong> {menu.breakfast} | {menu.lunch} | {menu.dinner}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Booking request form (only when nothing active) */}
        {!allocation && !error && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-2">Request a Room</h2>
            <p className="text-sm text-gray-600 mb-4">You have no active allocation. Pick an available room below to send a booking request.</p>
            <form onSubmit={requestBooking} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={form.hostelId}
                onChange={(e) => setForm({ ...form, hostelId: e.target.value, roomNumber: '' })}
                className="px-3 py-2 border rounded text-sm"
                required
              >
                <option value="">Select hostel</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <select
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                className="px-3 py-2 border rounded text-sm"
                required
              >
                <option value="">Select room</option>
                {roomsForHostel.map((room) => (
                  <option key={room.hostelId + room.roomNumber} value={room.roomNumber}>
                    Room {room.roomNumber} — {room.availableSpots} spot(s), ₹{room.rent}/mo
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={form.moveInDate}
                onChange={(e) => setForm({ ...form, moveInDate: e.target.value })}
                className="px-3 py-2 border rounded text-sm"
                required
              />
              <input
                type="date"
                value={form.checkOutDate}
                onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                className="px-3 py-2 border rounded text-sm"
                required
              />
              <button
                type="submit"
                disabled={submitting}
                className="md:col-span-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {submitting ? 'Submitting…' : 'Request Booking'}
              </button>
            </form>
          </Card>
        )}

        {/* Available rooms */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Available Rooms</h2>
          {availableRooms.length === 0 ? (
            <p className="text-gray-500 text-sm">No rooms available right now. Please check back later.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRooms.map((room) => (
                <Card key={room.hostelId + room.roomNumber} className="p-4">
                  <h3 className="font-semibold">{room.hostelName}</h3>
                  <p>Room: {room.roomNumber}</p>
                  <p>Available Spots: {room.availableSpots}</p>
                  <p>Rent: ₹{room.rent}/month</p>
                  <p className="text-sm text-gray-600">
                    Facilities: {(room.facilities || []).join(', ') || 'None listed'}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ProtectedRoute>
  );
}
