'use client';
import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import axios from '@/lib/axios';

export default function Hostel() {
  const [myRoom, setMyRoom] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyRoom();
    fetchAvailableRooms();
  }, []);

  const fetchMyRoom = async () => {
    try {
      const response = await axios.get('/hostel/my-room');
      setMyRoom(response.data.data);
    } catch (error) {
      console.error('No room allocated');
    }
  };

  const fetchAvailableRooms = async () => {
    try {
      const response = await axios.get('/hostel/rooms/available');
      setAvailableRooms(response.data.data);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {myRoom ? (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">My Room</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Room Details</h3>
              <p>Hostel: {myRoom.hostelName}</p>
              <p>Room Number: {myRoom.roomNumber}</p>
              <p>Monthly Rent: ₹{myRoom.rent}</p>
            </div>
            <div>
              <h3 className="font-semibold">Roommates</h3>
              {myRoom.roommates.length === 0 ? (
                <p>No roommates</p>
              ) : (
                myRoom.roommates.map((mate, idx) => (
                  <p key={idx}>{mate.userId.name} ({mate.usn})</p>
                ))
              )}
            </div>
          </div>
          
          {myRoom.messMenu && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Mess Menu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {myRoom.messMenu.map((menu, idx) => (
                  <div key={idx} className="text-sm">
                    <strong>{menu.day}:</strong> {menu.breakfast} | {menu.lunch} | {menu.dinner}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Available Rooms</h2>
          {availableRooms.length === 0 ? (
            <p>No rooms available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableRooms.map((room, idx) => (
                <Card key={idx} className="p-4">
                  <h3 className="font-semibold">{room.hostelName}</h3>
                  <p>Room: {room.roomNumber}</p>
                  <p>Available Spots: {room.availableSpots}</p>
                  <p>Rent: ₹{room.rent}/month</p>
                  <p className="text-sm text-gray-600">
                    Facilities: {room.facilities.join(', ')}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}