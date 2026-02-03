import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../App';
import { Appointment, TimeSlot } from '../types';
import { Calendar, Users, Clock, CheckCircle, XCircle, MoreVertical } from 'lucide-react';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const appData = await api.getDoctorAppointments(user!.id);
      const slotData = await api.getAvailableSlots(user!.id, selectedDate);
      setAppointments(appData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setSlots(slotData);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
    await api.updateAppointmentStatus(id, status);
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Doctor's Workspace</h1>
        <p className="text-slate-500 mt-1">Hello Dr. {user?.firstName}, manage your patients and schedule.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Stats & Slot Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Manage Availability
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Select Date</label>
                <input
                  type="date"
                  className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {slots.map(s => (
                  <div key={s.time} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">{s.time}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.isAvailable ? 'OPEN' : 'BOOKED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-blue-600 rounded-2xl p-6 text-white">
            <h4 className="font-bold opacity-80 text-sm mb-1">Total Patients</h4>
            <div className="text-3xl font-bold">{appointments.filter(a => a.status === 'COMPLETED').length}</div>
            <div className="mt-4 pt-4 border-t border-blue-500 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              <span>Verified Patient History</span>
            </div>
          </div>
        </div>

        {/* Right Side: Appointment List */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Patient Appointments
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Loading appointments...</td></tr>
                  ) : appointments.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No appointments scheduled.</td></tr>
                  ) : (
                    appointments.map(app => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{app.patientName}</div>
                          <div className="text-xs text-slate-500">ID: {app.patientId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-700">{app.date}</div>
                          <div className="text-xs text-slate-500">{app.slot}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                            app.status === 'CONFIRMED' ? 'bg-green-50 text-green-700 border-green-200' :
                            app.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {app.status === 'CONFIRMED' && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleStatusUpdate(app.id, 'COMPLETED')}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as Completed"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(app.id, 'CANCELLED')}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
