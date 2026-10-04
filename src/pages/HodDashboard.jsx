import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { 
  Users, 
  DoorOpen, 
  Clock, 
  ShieldCheck, 
  Download, 
  Search, 
  Trash2, 
  Plus, 
  Calendar, 
  Settings,
  Projector,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { todayISO } from '../lib/timeUtils';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    onClick={onChange}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const HodDashboard = () => {
  const { profile } = useAuth();
  const today = todayISO();

  // Data State
  const [profiles, setProfiles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI State
  const [activeTab, setActiveTab] = useState('approvals'); // approvals, bookings, rooms
  
  // Modals
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  // Forms & Filters
  const [addRoomForm, setAddRoomForm] = useState({ name: '', capacity: 30, has_projector: false, is_active: true });
  const [bookingFilters, setBookingFilters] = useState({ date: '', room: '', section: '' });

  // Fetch Data
  const fetchAllData = async () => {
    try {
      setError(null);
      const [profilesRes, bookingsRes, roomsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'cr').order('created_at', { ascending: false }),
        supabase.from('bookings').select('*, rooms(name)').order('booking_date', { ascending: false }).order('start_time', { ascending: false }),
        supabase.from('rooms').select('*').order('name')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (roomsRes.error) throw roomsRes.error;

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (roomsRes.data) setRooms(roomsRes.data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Supabase realtime subscriptions
    const subProfiles = supabase.channel('hod_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchAllData)
      .subscribe();
      
    const subBookings = supabase.channel('hod_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAllData)
      .subscribe();
      
    const subRooms = supabase.channel('hod_rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchAllData)
      .subscribe();

    return () => {
      supabase.removeChannel(subProfiles);
      supabase.removeChannel(subBookings);
      supabase.removeChannel(subRooms);
    };
  }, []);

  // Handlers
  const toggleApproval = async (profileId, currentStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_approved: !currentStatus }).eq('id', profileId);
      if (error) throw error;
      toast.success(!currentStatus ? 'CR Approved successfully' : 'Approval Revoked');
    } catch (err) {
      toast.error('Failed to update CR status');
    }
  };

  const toggleRoomProperty = async (roomId, field, currentVal) => {
    try {
      const { error } = await supabase.from('rooms').update({ [field]: !currentVal }).eq('id', roomId);
      if (error) throw error;
      toast.success('Room updated');
    } catch(err) {
      toast.error('Failed to update room');
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('rooms').insert([{
        name: addRoomForm.name,
        capacity: parseInt(addRoomForm.capacity, 10),
        has_projector: addRoomForm.has_projector,
        is_active: addRoomForm.is_active
      }]);
      if (error) throw error;
      toast.success('Room added successfully');
      setAddRoomModalOpen(false);
      setAddRoomForm({ name: '', capacity: 30, has_projector: false, is_active: true });
    } catch(err) {
      toast.error(err.message || 'Error adding room');
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingToCancel.id);
      if (error) throw error;
      toast.success('Booking deleted');
    } catch (err) {
      toast.error('Failed to delete booking');
    } finally {
      setCancelModalOpen(false);
      setBookingToCancel(null);
    }
  };

  const handleExportCSV = () => {
    if (!filteredBookings.length) return toast.error('No data to export');
    
    const headers = ['Date', 'Start Time', 'End Time', 'Room', 'Subject', 'CR Name', 'Section', 'Faculty'];
    const rows = filteredBookings.map(b => [
      b.booking_date,
      b.start_time,
      b.end_time,
      b.rooms?.name || 'N/A',
      b.subject,
      b.cr_name,
      b.section,
      b.faculty_name
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings_export_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded');
  };

  // Derived Data
  const pendingCrsCount = profiles.filter(p => !p.is_approved).length;
  const activeRoomsCount = rooms.filter(r => r.is_active).length;
  const todaysBookingsCount = bookings.filter(b => b.booking_date === today).length;
  
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (bookingFilters.date && b.booking_date !== bookingFilters.date) return false;
      if (bookingFilters.room && !b.rooms?.name.toLowerCase().includes(bookingFilters.room.toLowerCase())) return false;
      if (bookingFilters.section && !b.section.toLowerCase().includes(bookingFilters.section.toLowerCase())) return false;
      return true;
    });
  }, [bookings, bookingFilters]);

  const getInitials = (name) => {
    if (!name) return 'CR';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <div className="flex-1 flex justify-center items-center"><Spinner size={40} /></div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full p-8 text-center bg-white shadow-sm">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h3>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <button 
            onClick={() => { setLoading(true); fetchAllData(); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto md:flex md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HOD Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, {profile?.full_name || 'HOD'}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex">
            <Badge status="primary" icon={ShieldCheck} className="text-sm px-3 py-1.5 shadow-sm">
              Head of Department
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-10">
          <Card className="flex flex-col p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{pendingCrsCount}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Pending CRs</p>
          </Card>
          
          <Card className="flex flex-col p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <DoorOpen className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{activeRoomsCount}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Active Rooms</p>
          </Card>
          
          <Card className="flex flex-col p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{todaysBookingsCount}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Today's Bookings</p>
          </Card>

          <Card className="flex flex-col p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-900">{bookings.length}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">Total Bookings</p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 mb-8 flex gap-8 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`pb-4 text-sm font-semibold whitespace-nowrap transition-colors relative ${activeTab === 'approvals' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            CR Approvals
            {pendingCrsCount > 0 && <span className="ml-2 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingCrsCount}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('bookings')}
            className={`pb-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'bookings' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All Bookings
          </button>
          <button 
            onClick={() => setActiveTab('rooms')}
            className={`pb-4 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === 'rooms' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Manage Rooms
          </button>
        </div>

        {/* Tab Content */}
        <div className="fade-in">
          
          {/* CR Approvals Tab */}
          {activeTab === 'approvals' && (
            <div className="space-y-4 max-w-4xl">
              {profiles.length === 0 ? (
                <Card className="py-20 text-center"><EmptyState icon={Users} title="No CRs found" description="There are no registered Class Representatives." /></Card>
              ) : (
                profiles.map(p => (
                  <Card key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-100 flex-shrink-0 shadow-sm">
                        <span className="text-indigo-700 font-bold text-sm tracking-wider">{getInitials(p.full_name)}</span>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{p.full_name}</h3>
                        <p className="text-sm text-slate-500 font-medium">Section {p.section}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 w-full sm:w-auto border-t sm:border-0 pt-4 sm:pt-0 border-slate-100">
                      {p.is_approved ? (
                        <Badge status="free">Approved</Badge>
                      ) : (
                        <Badge status="free-soon">Pending</Badge>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant={p.is_approved ? 'ghost' : 'primary'}
                        className={p.is_approved ? 'text-rose-600 hover:bg-rose-50' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}
                        onClick={() => toggleApproval(p.id, p.is_approved)}
                      >
                        {p.is_approved ? 'Revoke Access' : 'Approve CR'}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* All Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Input 
                    type="date" 
                    value={bookingFilters.date} 
                    onChange={e => setBookingFilters(p => ({...p, date: e.target.value}))} 
                    className="w-full sm:w-40"
                  />
                  <div className="relative w-full sm:w-48">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filter by Room..." 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm h-11 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                      value={bookingFilters.room}
                      onChange={e => setBookingFilters(p => ({...p, room: e.target.value}))}
                    />
                  </div>
                  <div className="relative w-full sm:w-48">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filter by Section..." 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm h-11 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                      value={bookingFilters.section}
                      onChange={e => setBookingFilters(p => ({...p, section: e.target.value}))}
                    />
                  </div>
                  {(bookingFilters.date || bookingFilters.room || bookingFilters.section) && (
                    <Button variant="ghost" className="text-slate-500" onClick={() => setBookingFilters({ date: '', room: '', section: '' })}>
                      Clear
                    </Button>
                  )}
                </div>
                <Button icon={FileSpreadsheet} variant="secondary" onClick={handleExportCSV} className="w-full sm:w-auto bg-white">
                  Export CSV
                </Button>
              </div>

              <Card className="!p-0 overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Class Info</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Booked By</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-16 text-center">
                            <EmptyState icon={Search} title="No bookings found" description="Try clearing your filters." />
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b, idx) => (
                          <tr key={b.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-slate-50 transition-colors'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-slate-900">{b.booking_date}</div>
                              <div className="text-xs text-slate-500">{b.start_time.substring(0,5)} - {b.end_time.substring(0,5)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className="bg-indigo-50 text-indigo-700">{b.rooms?.name || 'Unknown'}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-slate-900">{b.subject}</div>
                              <div className="text-xs text-slate-500">{b.faculty_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{b.cr_name}</div>
                              <div className="text-xs text-slate-500">Sec {b.section}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => { setBookingToCancel(b); setCancelModalOpen(true); }}
                                className="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-colors inline-flex items-center"
                              >
                                <Trash2 className="w-4 h-4 mr-1" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Manage Rooms Tab */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-slate-900">Campus Rooms</h2>
                <Button icon={Plus} onClick={() => setAddRoomModalOpen(true)}>Add Room</Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map(room => (
                  <Card key={room.id} className={`p-5 transition-all ${room.is_active ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-slate-300 opacity-70'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{room.name}</h3>
                        <p className="text-sm text-slate-500 flex items-center mt-1">
                          <Users className="w-4 h-4 mr-1.5" /> Capacity: {room.capacity}
                        </p>
                      </div>
                      <Badge status={room.is_active ? 'free' : 'occupied'}>
                        {room.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 flex items-center">
                          <Projector className="w-4 h-4 mr-2 text-indigo-500" /> Has Projector
                        </span>
                        <Toggle checked={room.has_projector} onChange={() => toggleRoomProperty(room.id, 'has_projector', room.has_projector)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700 flex items-center">
                          <Settings className="w-4 h-4 mr-2 text-slate-500" /> Active Status
                        </span>
                        <Toggle checked={room.is_active} onChange={() => toggleRoomProperty(room.id, 'is_active', room.is_active)} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Booking Modal */}
      <Modal 
        isOpen={cancelModalOpen} 
        onClose={() => setCancelModalOpen(false)}
        title={
          <div className="flex items-center text-rose-600">
            <AlertTriangle className="w-5 h-5 mr-2" /> Delete Booking
          </div>
        }
        footer={
          <>
            <Button variant="danger" onClick={handleCancelBooking} className="w-full sm:w-auto sm:ml-3">
              Delete Booking
            </Button>
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)} className="w-full sm:w-auto mt-3 sm:mt-0">
              Cancel
            </Button>
          </>
        }
      >
        <p>Are you sure you want to forcibly delete the booking for <strong>{bookingToCancel?.subject}</strong> by {bookingToCancel?.cr_name}?</p>
        <p className="mt-2 text-sm text-slate-500">This will remove the booking entirely from the system. The CR will not be notified automatically.</p>
      </Modal>

      {/* Add Room Modal */}
      <Modal
        isOpen={addRoomModalOpen}
        onClose={() => setAddRoomModalOpen(false)}
        title="Add New Room"
      >
        <form onSubmit={handleAddRoom} className="space-y-4 mt-4">
          <Input 
            label="Room Name" 
            placeholder="e.g. A-101" 
            required 
            value={addRoomForm.name}
            onChange={e => setAddRoomForm(p => ({...p, name: e.target.value}))}
          />
          <Input 
            label="Capacity (Seats)" 
            type="number" 
            min="1"
            required 
            value={addRoomForm.capacity}
            onChange={e => setAddRoomForm(p => ({...p, capacity: e.target.value}))}
          />
          <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50">
            <span className="text-sm font-medium text-slate-700">Includes built-in projector</span>
            <Toggle checked={addRoomForm.has_projector} onChange={() => setAddRoomForm(p => ({...p, has_projector: !p.has_projector}))} />
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setAddRoomModalOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto" icon={Plus}>Add Room</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default HodDashboard;
