'use client';
import { useState, useEffect } from 'react';
import ProtectedRoute from '../../../../components/ProtectedRoute';
import Card from '../../../../components/ui/Card';
import api from '../../../../lib/axios';
import { toast } from 'sonner';

const inputCls = 'w-full px-3 py-2 border rounded text-sm';
const btnPrimary = 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm';
const btnDanger = 'px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm';
const btnGhost = 'px-3 py-1 border rounded hover:bg-gray-100 text-sm';

const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];

function StatsCards({ stats }) {
  if (!stats) return null;
  const cards = [
    ['Rooms', stats.totalRooms ?? 0],
    ['Capacity', stats.totalCapacity ?? 0],
    ['Occupied', stats.totalOccupied ?? 0],
    ['Available', stats.availableSpots ?? 0],
    ['Occupancy', `${stats.occupancyRate ?? 0}%`],
    ['Pending bookings', stats.bookings?.pending ?? 0],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map(([label, value]) => (
        <Card key={label} className="p-4 text-center">
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-gray-600">{label}</div>
        </Card>
      ))}
    </div>
  );
}

export default function AdminHostelPage() {
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('hostels');
  const [hostelForm, setHostelForm] = useState({ name: '', type: 'BOYS' });
  const [editingHostel, setEditingHostel] = useState(null);
  const [roomForm, setRoomForm] = useState({ hostelId: '', number: '', capacity: 2, rent: '', facilities: '' });
  const [allocForm, setAllocForm] = useState({ hostelId: '', roomNumber: '', usn: '' });

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, hostelsRes, bookingsRes] = await Promise.all([
        api.get('/hostel/admin/stats'),
        api.get('/hostel/admin/hostels'),
        api.get(`/hostel/admin/bookings${statusFilter ? `?status=${statusFilter}` : ''}`),
      ]);
      setStats(statsRes.data?.data || null);
      setHostels(hostelsRes.data?.data || []);
      setBookings(bookingsRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load hostel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (!loading) {
      api.get(`/hostel/admin/bookings${statusFilter ? `?status=${statusFilter}` : ''}`)
        .then((res) => setBookings(res.data?.data || []))
        .catch((err) => toast.error(err.response?.data?.error || 'Failed to load bookings'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const refresh = () => fetchAll();

  const createHostel = async (e) => {
    e.preventDefault();
    try {
      await api.post('/hostel/admin/hostels', { name: hostelForm.name, type: hostelForm.type });
      toast.success('Hostel created');
      setHostelForm({ name: '', type: 'BOYS' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create hostel');
    }
  };

  const saveHostelEdit = async (id, payload) => {
    try {
      await api.put(`/hostel/admin/hostels/${id}`, payload);
      toast.success('Hostel updated');
      setEditingHostel(null);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update hostel');
    }
  };

  const deleteHostel = async (id) => {
    if (!window.confirm('Delete this hostel? Only empty hostels without active bookings can be deleted.')) return;
    try {
      await api.delete(`/hostel/admin/hostels/${id}`);
      toast.success('Hostel deleted');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete hostel');
    }
  };

  const addRoom = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/hostel/admin/hostels/${roomForm.hostelId}/rooms`, {
        number: roomForm.number,
        capacity: Number(roomForm.capacity) || 2,
        rent: Number(roomForm.rent),
        facilities: roomForm.facilities.split(',').map((f) => f.trim()).filter(Boolean),
      });
      toast.success('Room added');
      setRoomForm({ hostelId: '', number: '', capacity: 2, rent: '', facilities: '' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add room');
    }
  };

  const removeRoom = async (hostelId, roomNumber) => {
    if (!window.confirm(`Remove room ${roomNumber}? Only empty rooms can be removed.`)) return;
    try {
      await api.delete(`/hostel/admin/hostels/${hostelId}/rooms/${roomNumber}`);
      toast.success('Room removed');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove room');
    }
  };

  const setBookingStatus = async (bookingId, status) => {
    try {
      await api.put(`/hostel/admin/bookings/${bookingId}`, { status });
      toast.success(`Booking ${status.toLowerCase().replace('_', ' ')}`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update booking');
    }
  };

  const resolveStudentId = async (usn) => {
    const response = await api.get('/students');
    const list = response.data?.data || response.data || [];
    const match = list.find((s) => s.usn === usn.trim().toUpperCase());
    if (!match) throw new Error(`No student found with USN ${usn}`);
    return match._id;
  };

  const allocate = async (e) => {
    e.preventDefault();
    try {
      const studentId = await resolveStudentId(allocForm.usn);
      await api.post('/hostel/allocate', { hostelId: allocForm.hostelId, roomNumber: allocForm.roomNumber, studentId });
      toast.success('Room allocated');
      setAllocForm({ hostelId: '', roomNumber: '', usn: '' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to allocate room');
    }
  };

  const deallocate = async (e) => {
    e.preventDefault();
    try {
      const studentId = await resolveStudentId(allocForm.usn);
      await api.delete('/hostel/allocate', { data: { hostelId: allocForm.hostelId, roomNumber: allocForm.roomNumber, studentId } });
      toast.success('Student deallocated');
      setAllocForm({ hostelId: '', roomNumber: '', usn: '' });
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Failed to deallocate');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="p-6"><div className="animate-pulse"><div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div><div className="h-48 bg-gray-200 rounded"></div></div></div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">Hostel Management</h1>
        {error && (
          <Card className="p-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={fetchAll} className="mt-2 text-sm text-red-700 underline">Try again</button>
          </Card>
        )}

        <StatsCards stats={stats} />

        <div className="flex gap-2 flex-wrap">
          {[['hostels', 'Hostels & Rooms'], ['bookings', 'Bookings'], ['allocate', 'Allocate']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded text-sm font-medium ${tab === key ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-100'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'hostels' && (
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="font-bold mb-3">Create Hostel</h3>
              <form onSubmit={createHostel} className="flex flex-col sm:flex-row gap-2">
                <input className={inputCls} placeholder="Hostel name *" value={hostelForm.name} onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })} required />
                <select className={inputCls} value={hostelForm.type} onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}>
                  <option value="BOYS">BOYS</option>
                  <option value="GIRLS">GIRLS</option>
                </select>
                <button type="submit" className={btnPrimary}>Create</button>
              </form>
            </Card>

            {hostels.length === 0 ? (
              <p className="text-gray-500 text-sm">No hostels yet. Create the first one above.</p>
            ) : hostels.map((hostel) => (
              <Card key={hostel._id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <div className="flex-1">
                    <span className="font-bold">{hostel.name}</span>
                    <span className="ml-2 text-sm text-gray-500">{hostel.type} • {hostel.rooms?.length || 0} rooms</span>
                  </div>
                  <div className="flex gap-2">
                    {editingHostel === hostel._id ? (
                      <>
                        <input
                          className="px-2 py-1 border rounded text-sm"
                          defaultValue={hostel.name}
                          id={`hostel-name-${hostel._id}`}
                        />
                        <button
                          className={btnPrimary}
                          onClick={() => saveHostelEdit(hostel._id, { name: document.getElementById(`hostel-name-${hostel._id}`).value })}
                        >
                          Save
                        </button>
                        <button className={btnGhost} onClick={() => setEditingHostel(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className={btnGhost} onClick={() => setEditingHostel(hostel._id)}>Rename</button>
                        <button className={btnDanger} onClick={() => deleteHostel(hostel._id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {(hostel.rooms || []).map((room) => (
                    <div key={room.number} className="flex flex-col sm:flex-row sm:items-center gap-1 text-sm border rounded p-2">
                      <span className="font-medium">Room {room.number}</span>
                      <span className="text-gray-600">cap {room.capacity} • occupied {room.occupants?.length || 0} • ₹{room.rent}/mo</span>
                      <button className="sm:ml-auto text-red-600 hover:underline text-xs" onClick={() => removeRoom(hostel._id, room.number)}>
                        Remove room
                      </button>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRoomForm({ ...roomForm, hostelId: hostel._id });
                    addRoom(e);
                  }}
                  className="mt-3 flex flex-col sm:flex-row gap-2"
                >
                  <input className={inputCls} placeholder="Room no." value={roomForm.hostelId === hostel._id ? roomForm.number : ''} onChange={(e) => setRoomForm({ ...roomForm, hostelId: hostel._id, number: e.target.value })} required />
                  <input className={inputCls} type="number" min="1" max="10" placeholder="Capacity" value={roomForm.hostelId === hostel._id ? roomForm.capacity : 2} onChange={(e) => setRoomForm({ ...roomForm, hostelId: hostel._id, capacity: e.target.value })} />
                  <input className={inputCls} type="number" min="0" placeholder="Rent" value={roomForm.hostelId === hostel._id ? roomForm.rent : ''} onChange={(e) => setRoomForm({ ...roomForm, hostelId: hostel._id, rent: e.target.value })} required />
                  <input className={inputCls} placeholder="Facilities (comma separated)" value={roomForm.hostelId === hostel._id ? roomForm.facilities : ''} onChange={(e) => setRoomForm({ ...roomForm, hostelId: hostel._id, facilities: e.target.value })} />
                  <button type="submit" className={btnPrimary}>Add Room</button>
                </form>
              </Card>
            ))}
          </div>
        )}

        {tab === 'bookings' && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-bold">Booking Requests</h3>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1 border rounded text-sm">
                <option value="">All statuses</option>
                {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {bookings.length === 0 ? (
              <p className="text-gray-500 text-sm">No bookings{statusFilter ? ` with status ${statusFilter}` : ''}.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b._id} className="border rounded p-3 text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1">
                        <span className="font-semibold">{b.student?.userId?.name || 'Unknown'}</span>
                        <span className="text-gray-500"> ({b.student?.usn || 'N/A'})</span>
                        <span className="text-gray-600"> → {b.hostel?.name} Room {b.roomNumber}</span>
                        <div className="text-xs text-gray-500 mt-1">
                          {b.status}
                          {b.moveInDate ? ` • in ${new Date(b.moveInDate).toLocaleDateString()}` : ''}
                          {b.adminNote ? ` • note: ${b.adminNote}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT'].map((s) => (
                          <button key={s} className={btnGhost} onClick={() => setBookingStatus(b._id, s)}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {tab === 'allocate' && (
          <Card className="p-4">
            <h3 className="font-bold mb-3">Direct Allocate / Deallocate</h3>
            <form className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select value={allocForm.hostelId} onChange={(e) => setAllocForm({ ...allocForm, hostelId: e.target.value, roomNumber: '' })} className={inputCls} required>
                <option value="">Select hostel</option>
                {hostels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
              </select>
              <select value={allocForm.roomNumber} onChange={(e) => setAllocForm({ ...allocForm, roomNumber: e.target.value })} className={inputCls} required>
                <option value="">Select room</option>
                {(hostels.find((h) => String(h._id) === String(allocForm.hostelId))?.rooms || []).map((r) => (
                  <option key={r.number} value={r.number}>Room {r.number} ({r.occupants?.length || 0}/{r.capacity})</option>
                ))}
              </select>
              <input value={allocForm.usn} onChange={(e) => setAllocForm({ ...allocForm, usn: e.target.value })} placeholder="Student USN" className={inputCls} required />
              <div className="flex gap-2">
                <button type="button" onClick={allocate} className={btnPrimary}>Allocate</button>
                <button type="button" onClick={deallocate} className={btnDanger}>Deallocate</button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-2">Allocate assigns the student directly to the room. Deallocate removes a direct (non-booking) occupant. Booking-linked occupants change via booking status (check-out).</p>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
