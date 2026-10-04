import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { Projector, Users, Clock, Search, Star, Video, VideoOff, ChevronDown, ChevronUp, MapPin, CheckCircle, XCircle, Activity, DoorOpen } from 'lucide-react';;

import { parseTime, formatTime, toMinutes, todayISO } from '../lib/timeUtils';

const RoomCard = ({ room, currentTime, isExpanded, onToggle }) => {
  const { 
    name, 
    capacity, 
    has_projector, 
    status, 
    currentBooking, 
    nextBooking, 
    minutesUntilNext, 
    projectorAvailable,
    roomBookings
  } = room;

  const isFreeWithProj = status === 'free' && projectorAvailable;

  const statusConfig = {
    'free': { color: 'bg-emerald-500', text: 'emerald', label: 'Free Now' },
    'free-soon': { color: 'bg-amber-500', text: 'amber', label: `Free for ${minutesUntilNext} min` },
    'occupied': { color: 'bg-rose-500', text: 'rose', label: 'Occupied' },
  };

  const currentConf = statusConfig[status];

  // Calculate progress for occupied
  let progress = 0;
  if (status === 'occupied' && currentBooking) {
    const startMins = parseTime(currentBooking.start_time);
    const endMins = parseTime(currentBooking.end_time);
    const nowMins = toMinutes(currentTime);
    progress = Math.min(100, Math.max(0, ((nowMins - startMins) / (endMins - startMins)) * 100));
  }

  return (
    <Card 
      className={`relative overflow-hidden cursor-pointer flex flex-col h-full transition-all duration-200 border-l-4 ${
        status === 'free' ? 'border-l-emerald-500' : 
        status === 'free-soon' ? 'border-l-amber-500' : 'border-l-rose-500'
      } ${isFreeWithProj ? 'ring-1 ring-emerald-500 shadow-emerald-100' : ''}`}
      onClick={onToggle}
    >
      {isFreeWithProj && (
        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center shadow-sm">
          <Star className="w-3 h-3 mr-1 fill-current" />
          Best Pick
        </div>
      )}

      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{name}</h3>
          <div className="flex items-center text-slate-500 text-sm mt-0.5">
            <Users className="w-4 h-4 mr-1.5" />
            {capacity} seats
          </div>
        </div>
        <div className="mt-1">
          <Badge status={status}>
            {currentConf.label}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {projectorAvailable ? (
          <Badge status="primary" icon={Projector} className="bg-indigo-50 text-indigo-700">
            Projector Available
          </Badge>
        ) : has_projector ? (
          <Badge className="bg-slate-100 text-slate-500 line-through">
            <Projector className="w-3.5 h-3.5 mr-1" /> Projector in use
          </Badge>
        ) : (
          <Badge className="bg-slate-50 text-slate-400 border border-slate-100">
            <VideoOff className="w-3.5 h-3.5 mr-1" /> No Projector
          </Badge>
        )}
      </div>

      {status === 'occupied' && currentBooking && (
        <div className="mt-auto pt-3 border-t border-slate-100">
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-sm font-semibold text-slate-900 truncate pr-2">{currentBooking.subject}</p>
            <p className="text-xs text-slate-500 whitespace-nowrap">Ends {formatTime(currentBooking.end_time)}</p>
          </div>
          <p className="text-xs text-slate-500 mb-2 truncate">
            {currentBooking.faculty_name} • {currentBooking.section}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-1000 ease-linear" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {status !== 'occupied' && nextBooking && (
        <div className="mt-auto pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Next class at <span className="font-medium text-slate-700 ml-1">{formatTime(nextBooking.start_time)}</span>
          </p>
        </div>
      )}

      {status !== 'occupied' && !nextBooking && (
        <div className="mt-auto pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-500" />
            Free for the rest of the day
          </p>
        </div>
      )}

      {/* Expanded Timetable Section */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
            Today's Schedule
            <ChevronUp className="w-4 h-4 text-slate-400" />
          </h4>
          
          {roomBookings.length === 0 ? (
            <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 rounded-lg">No bookings today.</p>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-2 space-y-4 pl-4 pb-2">
              {roomBookings.map((b) => {
                const startMins = parseTime(b.start_time);
                const endMins = parseTime(b.end_time);
                const currentMins = toMinutes(currentTime);
                const isCurrent = currentMins >= startMins && currentMins < endMins;
                const isPast = currentMins >= endMins;

                return (
                  <div key={b.id} className="relative">
                    <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${isCurrent ? 'bg-rose-500 ring-2 ring-rose-200' : isPast ? 'bg-slate-300' : 'bg-indigo-400'}`}></div>
                    <div className={`${isPast ? 'opacity-50' : ''} ${isCurrent ? 'bg-rose-50 p-2 -mt-2 -mx-2 rounded-lg' : ''}`}>
                      <div className="flex items-baseline justify-between">
                        <span className={`text-xs font-bold ${isCurrent ? 'text-rose-700' : 'text-slate-900'}`}>
                          {formatTime(b.start_time)} - {formatTime(b.end_time)}
                        </span>
                      </div>
                      <p className={`text-sm font-medium ${isCurrent ? 'text-rose-900' : 'text-slate-700'}`}>{b.subject}</p>
                      <p className="text-xs text-slate-500">{b.faculty_name} • {b.section}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {!isExpanded && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </div>
      )}
    </Card>
  );
};

const Home = () => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFree, setFilterFree] = useState(false);
  const [filterProjector, setFilterProjector] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  const fetchLiveInfo = async () => {
    try {
      setError(null);
      const todayStr = todayISO();
      
      const [roomsRes, bookingsRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('is_active', true),
        supabase.from('bookings').select('*').eq('booking_date', todayStr)
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      if (roomsRes.data) setRooms(roomsRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load live data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveInfo();

    // Clock and recompute interval
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Supabase realtime
    const roomsSub = supabase.channel('public:rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchLiveInfo)
      .subscribe();

    const bookingsSub = supabase.channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchLiveInfo)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(roomsSub);
      supabase.removeChannel(bookingsSub);
    };
  }, []);

  // Process and rank rooms
  const processedRooms = rooms.map(room => {
    const roomBookings = bookings
      .filter(b => b.room_id === room.id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    let currentBooking = null;
    let nextBooking = null;

    for (const b of roomBookings) {
      const startMins = parseTime(b.start_time);
      const endMins = parseTime(b.end_time);
      const currentMins = toMinutes(currentTime);
      
      if (currentMins >= startMins && currentMins < endMins) {
        currentBooking = b;
      } else if (currentMins < startMins && !nextBooking) {
        nextBooking = b;
      }
    }

    let status = 'free';
    let minutesUntilNext = null;
    
    if (currentBooking) {
      status = 'occupied';
    } else if (nextBooking) {
      const startMins = parseTime(nextBooking.start_time);
      const currentMins = toMinutes(currentTime);
      minutesUntilNext = startMins - currentMins;
      
      if (minutesUntilNext <= 15) {
        status = 'free-soon';
      }
    }

    const projectorAvailable = room.has_projector && (!currentBooking || !currentBooking.projector_in_use);

    return {
      ...room,
      roomBookings,
      currentBooking,
      nextBooking,
      status,
      minutesUntilNext,
      projectorAvailable
    };
  });

  const filteredRooms = processedRooms.filter(room => {
    if (filterFree && room.status === 'occupied') return false;
    if (filterProjector && !room.projectorAvailable) return false;
    if (searchQuery && !room.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const rank = { 'free': 2, 'free-soon': 3, 'occupied': 4 };
    const rankA = a.status === 'free' && a.projectorAvailable ? 1 : rank[a.status];
    const rankB = b.status === 'free' && b.projectorAvailable ? 1 : rank[b.status];
    
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });

  // Stats
  const freeCount = processedRooms.filter(r => r.status === 'free' || r.status === 'free-soon').length;
  const projCount = processedRooms.filter(r => (r.status === 'free' || r.status === 'free-soon') && r.projectorAvailable).length;
  const occupiedCount = processedRooms.filter(r => r.status === 'occupied').length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-900/20 blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                  Live Updates
                </div>
                <p className="text-indigo-100 font-medium text-sm">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Find a free classroom</h1>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 flex flex-col items-end">
              <p className="text-indigo-100 text-sm font-medium mb-1">Current Time</p>
              <div className="text-3xl font-bold font-mono tracking-tighter">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 flex items-center">
              <DoorOpen className="w-5 h-5 text-emerald-300 mr-2" />
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">Rooms Free</p>
                <p className="text-xl font-bold leading-none mt-0.5">{freeCount}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 flex items-center">
              <Projector className="w-5 h-5 text-indigo-300 mr-2" />
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">With Projector</p>
                <p className="text-xl font-bold leading-none mt-0.5">{projCount}</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5 flex items-center">
              <Users className="w-5 h-5 text-rose-300 mr-2" />
              <div>
                <p className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">Occupied</p>
                <p className="text-xl font-bold leading-none mt-0.5">{occupiedCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow shadow-sm"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
            <button
              onClick={() => setFilterFree(!filterFree)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm border ${
                filterFree 
                  ? 'bg-indigo-600 text-white border-transparent' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Free now
            </button>
            <button
              onClick={() => setFilterProjector(!filterProjector)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm border ${
                filterProjector 
                  ? 'bg-indigo-600 text-white border-transparent' 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Has projector
            </button>
          </div>
        </div>
      </div>

      {/* Room Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {error ? (
          <Card className="max-w-md mx-auto mt-12 p-8 text-center bg-white shadow-sm border border-slate-200">
            <Activity className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Connection Error</h3>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button 
              onClick={() => { setLoading(true); fetchLiveInfo(); }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Try again
            </button>
          </Card>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-[220px] flex flex-col">
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-32 mb-auto" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </div>
            ))}
          </div>
        ) : sortedRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
            {sortedRooms.map(room => (
              <RoomCard 
                key={room.id} 
                room={room} 
                currentTime={currentTime}
                isExpanded={expandedCard === room.id}
                onToggle={() => setExpandedCard(expandedCard === room.id ? null : room.id)}
              />
            ))}
          </div>
        ) : (
          <Card className="max-w-xl mx-auto mt-12 py-16 text-center bg-white shadow-sm border border-slate-200">
            <EmptyState 
              icon={Search}
              title="No classrooms found"
              description="We couldn't find any rooms matching your current filters. Try adjusting your search or clearing the filters."
              action={
                <button 
                  onClick={() => { setSearchQuery(''); setFilterFree(false); setFilterProjector(false); }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  Clear all filters
                </button>
              }
            />
          </Card>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-medium text-slate-500">Built for our department</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
