import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Calendar, 
  Clock, 
  Projector, 
  Users, 
  BookOpen, 
  Plus, 
  List, 
  Bell,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { parseTime, formatTime, formatDuration, todayISO, toMinutes } from '../lib/timeUtils';

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    onClick={onChange}
  >
    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);



const CrDashboard = () => {
  const { user, profile } = useAuth();
  
  // Data State
  const [rooms, setRooms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [myClasses, setMyClasses] = useState([]);
  const [requests, setRequests] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('book'); // mobile: book, classes, requests
  const [rightTab, setRightTab] = useState('classes'); // desktop: classes, requests
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  // Form State
  const today = todayISO();
  const [formData, setFormData] = useState({
    subject: '',
    faculty_name: '',
    booking_date: today,
    start_time: '09:00',
    end_time: '10:00',
    needs_projector: false,
    selected_room_id: null,
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'CR';
  const myBookingIdsRef = useRef([]);

  // Fetch Logic
  const fetchAllData = async () => {
    try {
      setError(null);
      // 1. Rooms
      const { data: roomsData, error: roomsErr } = await supabase.from('rooms').select('*').eq('is_active', true);
      if (roomsErr) throw roomsErr;
      if (roomsData) setRooms(roomsData);

      // 2. All Bookings today (for overlaps and borrowing)
      const { data: bookingsData, error: bookingsErr } = await supabase.from('bookings').select('*, rooms(name, has_projector)').eq('booking_date', formData.booking_date);
      if (bookingsErr) throw bookingsErr;
      if (bookingsData) {
        setAllBookings(bookingsData);
        // My classes for today
        const mine = bookingsData.filter(b => b.cr_id === user.id).sort((a,b) => a.start_time.localeCompare(b.start_time));
        setMyClasses(mine);
        myBookingIdsRef.current = mine.map(c => c.id);
      }

      // 3. Requests
      const { data: reqsData, error: reqsErr } = await supabase.from('projector_requests').select('*');
      if (reqsErr) throw reqsErr;
      if (reqsData) setRequests(reqsData);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [formData.booking_date]);

  useEffect(() => {
    const bookingsSub = supabase.channel('cr_bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAllData)
      .subscribe();

    const reqsSub = supabase.channel('cr_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projector_requests' }, (payload) => {
        fetchAllData();
        if (payload.eventType === 'INSERT' && payload.new.status === 'pending') {
          if (myBookingIdsRef.current.includes(payload.new.from_booking_id)) {
            toast('New incoming projector request!', { icon: '🔔' });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSub);
      supabase.removeChannel(reqsSub);
    };
  }, []);

  // Compute available rooms
  const duration = formatDuration(formData.start_time, formData.end_time);
  const isValidTime = parseTime(formData.end_time) > parseTime(formData.start_time);

  const availableRooms = useMemo(() => {
    if (!isValidTime) return [];
    const padTime = (t) => t.length === 5 ? `${t}:00` : t;
    const sTime = padTime(formData.start_time);
    const eTime = padTime(formData.end_time);

    return rooms.filter(room => {
      if (formData.needs_projector && !room.has_projector) return false;
      const isOverlapping = allBookings.some(b => {
        if (b.room_id !== room.id) return false;
        const bStart = padTime(b.start_time);
        const bEnd = padTime(b.end_time);
        return (sTime < bEnd && eTime > bStart);
      });
      return !isOverlapping;
    });
  }, [rooms, allBookings, formData.start_time, formData.end_time, formData.needs_projector, isValidTime]);

  // Derived Requests Data
  const myBookingIds = myClasses.map(c => c.id);
  const incomingRequests = requests.filter(r => myBookingIds.includes(r.from_booking_id) && r.status === 'pending');
  const outgoingRequests = requests.filter(r => myBookingIds.includes(r.requester_booking_id));

  const borrowable = [];
  myClasses.forEach(myClass => {
    if (myClass.rooms.has_projector) return; // Only need one if we don't have one

    allBookings.forEach(otherClass => {
      if (otherClass.cr_id === user.id) return;
      if (!otherClass.rooms.has_projector) return;
      if (otherClass.projector_in_use) return;

      const myStart = myClass.start_time;
      const myEnd = myClass.end_time;
      const otherStart = otherClass.start_time;
      const otherEnd = otherClass.end_time;

      if (myStart < otherEnd && myEnd > otherStart) {
        const requestObj = outgoingRequests.find(r => r.requester_booking_id === myClass.id && r.from_booking_id === otherClass.id);
        borrowable.push({
          myClass,
          otherClass,
          alreadyRequested: !!requestObj,
          requestObj
        });
      }
    });
  });

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'start_time' || name === 'end_time' || name === 'booking_date' ? { selected_room_id: null } : {})
    }));
  };

  const handleRoomSelect = (roomId) => {
    setFormData(prev => ({ ...prev, selected_room_id: roomId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidTime) return toast.error('End time must be after start time');
    if (!formData.selected_room_id) return toast.error('Please select an available room');

    setSubmitting(true);
    try {
      const { error } = await supabase.from('bookings').insert([{
        room_id: formData.selected_room_id,
        cr_id: user.id,
        cr_name: profile.full_name,
        section: profile.section,
        subject: formData.subject,
        faculty_name: formData.faculty_name,
        booking_date: formData.booking_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        needs_projector: formData.needs_projector,
        projector_in_use: formData.needs_projector,
      }]);

      if (error) {
        if (error.code === '23505' || error.message.includes('overlap')) {
          toast.error('That room is already booked for this time');
        } else throw error;
      } else {
        toast.success('Booking created successfully!');
        setFormData(prev => ({ ...prev, subject: '', faculty_name: '', selected_room_id: null }));
        if (window.innerWidth < 1024) setActiveTab('classes'); 
        setRightTab('classes');
      }
    } catch (err) {
      toast.error(err.message || 'Error creating booking');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProjectorInUse = async (bookingId, currentVal) => {
    try {
      const { error } = await supabase.from('bookings').update({ projector_in_use: !currentVal }).eq('id', bookingId);
      if (error) throw error;
      toast.success(!currentVal ? 'Projector marked as in use' : 'Projector released');
    } catch (err) {
      toast.error('Failed to update projector status');
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', bookingToCancel.id);
      if (error) throw error;
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error('Failed to cancel booking');
    } finally {
      setCancelModalOpen(false);
      setBookingToCancel(null);
    }
  };

  const handleCreateRequest = async (reqBookingId, fromBookingId) => {
    try {
      const { error } = await supabase.from('projector_requests').insert([{
        requester_booking_id: reqBookingId,
        from_booking_id: fromBookingId,
        requested_by: user.id,
        status: 'pending'
      }]);
      if (error) {
        if (error.code === '23505') toast.error("You already requested this!");
        else throw error;
      } else {
        toast.success("Projector requested!");
      }
    } catch (err) {
      toast.error("Error requesting projector");
    }
  };

  const handleRequestAction = async (requestId, newStatus) => {
    try {
      const { error } = await supabase.from('projector_requests').update({ status: newStatus }).eq('id', requestId);
      if (error) throw error;
      toast.success(newStatus === 'accepted' ? 'Request accepted!' : 'Request declined.');
    } catch (err) {
      toast.error("Error updating request");
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Spinner size={32} /></div>;
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

  // --- Views --- //
  const renderBookingForm = () => (
    <Card className="flex flex-col h-full border-none shadow-none sm:shadow-sm sm:border-solid lg:col-span-7">
      <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
        <Calendar className="w-5 h-5 text-indigo-500 mr-2" />
        New Booking
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input 
            label="Subject" 
            name="subject" 
            placeholder="e.g. Data Structures" 
            required 
            value={formData.subject} 
            onChange={handleChange} 
          />
          <Input 
            label="Faculty Name" 
            name="faculty_name" 
            placeholder="e.g. Prof. Smith" 
            required 
            value={formData.faculty_name} 
            onChange={handleChange} 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Input 
            label="Date" 
            name="booking_date" 
            type="date" 
            required 
            value={formData.booking_date} 
            onChange={handleChange} 
            min={today}
          />
          <div className="sm:col-span-2 flex items-end gap-3">
            <Input 
              label="Start Time" 
              name="start_time" 
              type="time" 
              required 
              value={formData.start_time} 
              onChange={handleChange} 
            />
            <Input 
              label="End Time" 
              name="end_time" 
              type="time" 
              required 
              value={formData.end_time} 
              onChange={handleChange} 
            />
            <div className="h-11 px-4 bg-slate-100 rounded-xl flex items-center justify-center text-sm font-medium text-slate-600 whitespace-nowrap border border-transparent">
              {isValidTime ? duration : 'Invalid'}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Projector Requirement</label>
          <div className="flex p-1 bg-slate-100 rounded-xl w-full max-w-sm">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, needs_projector: false, selected_room_id: null }))}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!formData.needs_projector ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Not needed
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, needs_projector: true, selected_room_id: null }))}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex justify-center items-center ${formData.needs_projector ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Projector className="w-4 h-4 mr-1.5" /> Needed
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col pt-2">
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-slate-700">Available Rooms</label>
          </div>
          
          <div className="flex-1 min-h-[150px] bg-slate-50 rounded-xl border border-slate-200 p-2 overflow-y-auto">
            {!isValidTime ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                Please enter a valid time range.
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-500">
                No rooms available for this time slot.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableRooms.map(room => (
                  <div 
                    key={room.id}
                    onClick={() => handleRoomSelect(room.id)}
                    className={`cursor-pointer border rounded-xl p-3 flex flex-col transition-all ${
                      formData.selected_room_id === room.id 
                        ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span className={`font-bold text-base ${formData.selected_room_id === room.id ? 'text-indigo-900' : 'text-slate-900'}`}>
                      {room.name}
                    </span>
                    <div className="flex items-center justify-between mt-auto pt-2 text-slate-500 text-xs">
                      <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {room.capacity}</span>
                      {room.has_projector && <Projector className="w-3 h-3" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Button type="submit" className="w-full sm:w-auto" isLoading={submitting} disabled={!isValidTime || !formData.selected_room_id} icon={Plus}>
            Confirm Booking
          </Button>
        </div>
      </form>
    </Card>
  );

  const renderMyClasses = () => (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4 fade-in">
      {myClasses.length === 0 ? (
        <EmptyState 
          icon={BookOpen}
          title="No classes today"
          description="You haven't booked any rooms for today yet."
          className="py-20"
        />
      ) : (
        <div className="relative border-l-2 border-indigo-100 ml-3 pl-5 space-y-6 pb-4">
          {myClasses.map((cls) => {
            const isPast = parseTime(cls.end_time) < toMinutes(new Date()) && formData.booking_date === todayISO();
            return (
              <div key={cls.id} className="relative">
                <div className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${isPast ? 'bg-slate-300' : 'bg-indigo-500 ring-2 ring-indigo-200'}`}></div>
                <div className={`bg-white rounded-xl p-4 shadow-sm border ${isPast ? 'border-slate-200 opacity-60' : 'border-indigo-100 shadow-indigo-100/50'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-indigo-600">
                        {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
                      </span>
                      <h4 className="text-base font-semibold text-slate-900 leading-tight mt-1">{cls.subject}</h4>
                    </div>
                    <Badge className="bg-slate-100 text-slate-700 font-bold px-2 py-1">
                      {cls.rooms.name}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-slate-500 mb-4">{cls.faculty_name}</p>
                  
                  {!isPast && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      {cls.rooms.has_projector ? (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-slate-700 mr-3 flex items-center">
                            <Projector className="w-4 h-4 mr-1 text-slate-400" />
                            Projector in use
                          </span>
                          <Toggle 
                            checked={cls.projector_in_use} 
                            onChange={() => toggleProjectorInUse(cls.id, cls.projector_in_use)} 
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">No projector in room</span>
                      )}
                      
                      <button 
                        onClick={() => { setBookingToCancel(cls); setCancelModalOpen(true); }}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRequests = () => (
    <div className="flex-1 overflow-y-auto space-y-8 pb-4 fade-in">
      {/* Incoming Requests */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
          Incoming Requests
          {incomingRequests.length > 0 && <span className="ml-2 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">{incomingRequests.length}</span>}
        </h3>
        
        {incomingRequests.length === 0 ? (
          <p className="text-sm text-slate-500 italic px-2">No pending requests right now.</p>
        ) : (
          <div className="space-y-3">
            {incomingRequests.map(req => {
              const reqClass = allBookings.find(b => b.id === req.requester_booking_id);
              if (!reqClass) return null;
              return (
                <div key={req.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
                  <p className="text-sm text-slate-900 font-medium mb-1">
                    <span className="font-bold">{reqClass.cr_name}</span> ({reqClass.section}) wants to borrow a projector.
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    For their <span className="font-semibold">{reqClass.subject}</span> class in <span className="font-semibold">{reqClass.rooms.name}</span>.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleRequestAction(req.id, 'accepted')}>
                      Accept
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1 text-rose-600 hover:bg-rose-50" onClick={() => handleRequestAction(req.id, 'declined')}>
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Need a projector / Outgoing */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Need a projector?
        </h3>
        
        {borrowable.length === 0 ? (
          <p className="text-sm text-slate-500 italic px-2">No overlapping projector rooms available to borrow from.</p>
        ) : (
          <div className="space-y-4">
            {borrowable.map((item, idx) => {
              const { myClass, otherClass, alreadyRequested, requestObj } = item;
              
              return (
                <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge className="bg-indigo-50 text-indigo-700 font-semibold mb-2">For {myClass.subject}</Badge>
                      <h4 className="text-sm font-bold text-slate-900">{otherClass.rooms.name}</h4>
                    </div>
                    {requestObj?.status === 'accepted' ? (
                      <Badge status="free">Accepted</Badge>
                    ) : requestObj?.status === 'declined' ? (
                      <Badge status="occupied">Declined</Badge>
                    ) : alreadyRequested ? (
                      <Badge status="free-soon">Pending</Badge>
                    ) : null}
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                    Booked by <span className="font-semibold text-slate-700">{otherClass.cr_name}</span> ({otherClass.section}) <br/>
                    {formatTime(otherClass.start_time)} - {formatTime(otherClass.end_time)}
                  </p>

                  {requestObj?.status === 'accepted' ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-800 font-medium flex items-center shadow-sm">
                      <CheckCircle className="w-4 h-4 mr-1.5 flex-shrink-0 text-emerald-600" />
                      <span>Collect from {otherClass.rooms.name}, {otherClass.section}</span>
                    </div>
                  ) : !alreadyRequested ? (
                    <Button size="sm" className="w-full" onClick={() => handleCreateRequest(myClass.id, otherClass.id)}>
                      Request projector
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Greeting Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-6 sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Hi, {firstName} 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <Badge status="primary" className="text-sm px-3 py-1.5 hidden sm:inline-flex">
            Section {profile?.section}
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-0 sm:py-8 w-full flex-1 flex flex-col">
        {/* Desktop Layout */}
        <div className="hidden lg:grid grid-cols-12 gap-8 h-[calc(100vh-12rem)]">
          {renderBookingForm()}
          
          <Card className="flex flex-col h-full border-none shadow-none sm:shadow-sm sm:border-solid lg:col-span-5 bg-slate-50/50 sm:bg-white overflow-hidden !p-0">
            <div className="flex border-b border-slate-200">
              <button 
                onClick={() => setRightTab('classes')} 
                className={`flex-1 py-4 font-semibold text-sm transition-colors ${rightTab === 'classes' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                My Classes
              </button>
              <button 
                onClick={() => setRightTab('requests')} 
                className={`flex-1 py-4 font-semibold text-sm relative transition-colors ${rightTab === 'requests' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                Projector Requests
                {incomingRequests.length > 0 && <span className="absolute top-3.5 right-6 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-sm shadow-rose-200"></span>}
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6 flex flex-col">
              {rightTab === 'classes' ? renderMyClasses() : renderRequests()}
            </div>
          </Card>
        </div>

        {/* Mobile / Tablet Layout */}
        <div className="lg:hidden flex-1 flex flex-col pb-16">
          <div className="flex-1 p-4 h-full flex flex-col">
            {activeTab === 'book' && renderBookingForm()}
            {activeTab === 'classes' && renderMyClasses()}
            {activeTab === 'requests' && renderRequests()}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-3 flex justify-between z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setActiveTab('book')}
          className={`flex flex-col items-center justify-center w-1/3 transition-colors ${activeTab === 'book' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Book</span>
        </button>
        <button 
          onClick={() => setActiveTab('classes')}
          className={`flex flex-col items-center justify-center w-1/3 relative transition-colors ${activeTab === 'classes' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <List className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">My Classes</span>
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`flex flex-col items-center justify-center w-1/3 relative transition-colors ${activeTab === 'requests' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Bell className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Requests</span>
          {incomingRequests.length > 0 && (
            <span className="absolute top-0 right-6 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse border-2 border-white"></span>
          )}
        </button>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal 
        isOpen={cancelModalOpen} 
        onClose={() => setCancelModalOpen(false)}
        title={
          <div className="flex items-center text-rose-600">
            <AlertTriangle className="w-5 h-5 mr-2" /> Cancel Booking
          </div>
        }
        footer={
          <>
            <Button variant="danger" onClick={handleCancelBooking} className="w-full sm:w-auto sm:ml-3">
              Yes, cancel booking
            </Button>
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)} className="w-full sm:w-auto mt-3 sm:mt-0">
              Go back
            </Button>
          </>
        }
      >
        <p>Are you sure you want to cancel the booking for <strong>{bookingToCancel?.subject}</strong>?</p>
        <p className="mt-2 text-sm text-slate-500">This action cannot be undone and will free up the room for others.</p>
      </Modal>
    </div>
  );
};

export default CrDashboard;
