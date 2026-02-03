
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../App';
import { Appointment, Doctor, Payment } from '../types';
import { Calendar, Plus, Clock, User, CheckCircle, XCircle, AlertCircle, Activity, CreditCard, Shield, Users, Info, ExternalLink } from 'lucide-react';

const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
  const styles = {
    CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
    PENDING_PAYMENT: 'bg-amber-100 text-amber-700 border-amber-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-black border flex items-center gap-1 w-fit uppercase tracking-tighter ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const PatientDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appointments' | 'team' | 'payments' | 'profile'>('appointments');

  useEffect(() => {
    // Check if we were redirected with a specific tab requested (e.g. from payment success)
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appData, payData, docData] = await Promise.all([
        api.getPatientAppointments(user!.id),
        api.getPatientPayments(user!.id),
        api.getAllDoctors()
      ]);
      setAppointments(appData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setPayments(payData);
      setDoctors(docData);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      await api.updateAppointmentStatus(id, 'CANCELLED');
      loadData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8">
      {/* Dashboard Branding Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Medical Management</span>
            <div className="h-[1px] w-8 bg-blue-200"></div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Patient Central</h1>
          <p className="text-slate-500 font-medium text-sm mt-2">Personal dashboard for MedLink Hospital services</p>
        </div>
        <Link
          to="/book"
          className="flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Schedule Visit
        </Link>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 mb-10 overflow-x-auto gap-4 no-scrollbar">
        {[
          { id: 'appointments', label: 'Visits', icon: Calendar },
          { id: 'team', label: 'Physicians', icon: Users },
          { id: 'payments', label: 'Finances', icon: CreditCard },
          { id: 'profile', label: 'My Record', icon: Info },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-3 px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-xl' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-20 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Accessing Medical Vault...</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {appointments.length === 0 ? (
                  <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No Scheduled Visits</p>
                  </div>
                ) : (
                  appointments.map(app => (
                    <div key={app.id} className="p-8 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-6">
                        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100"><User className="w-8 h-8" /></div>
                        <div>
                          <h4 className="text-xl font-bold text-slate-900">Dr. {app.doctorName}</h4>
                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">{app.specialty}</p>
                          <div className="flex flex-wrap items-center gap-6 mt-4 text-sm font-bold text-slate-500">
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-400" />{app.date}</span>
                            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />{app.slot}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-4">
                        <StatusBadge status={app.status} />
                        {app.status === 'CONFIRMED' && (
                          <button onClick={() => handleCancel(app.id)} className="text-[10px] text-red-400 hover:text-red-600 font-black uppercase tracking-widest border-b border-red-100">Request Cancellation</button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {doctors.map(doc => (
                <div key={doc.id} className="bg-white border border-slate-200 p-8 rounded-[2rem] hover:shadow-xl hover:border-blue-200 transition-all group">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {doc.firstName[0]}{doc.lastName[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">Dr. {doc.firstName} {doc.lastName}</h3>
                      <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">{doc.specialty}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 line-clamp-3">{doc.bio}</p>
                  <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      <Activity className="w-4 h-4 text-blue-400" />
                      {doc.experienceYears} Years Exp.
                    </div>
                    <Link to="/book" className="text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Book Dr. {doc.lastName}</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Ref</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Amount</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No Payment History Available</td></tr>
                    ) : (
                      payments.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-6 text-xs font-mono font-bold text-slate-900">{pay.id}</td>
                          <td className="px-8 py-6 text-sm font-bold text-slate-500">{new Date(pay.transactionDate).toLocaleDateString()}</td>
                          <td className="px-8 py-6 text-sm font-medium text-slate-500">{pay.method}</td>
                          <td className="px-8 py-6 text-lg font-black text-slate-900 tracking-tighter">${pay.amount.toFixed(2)}</td>
                          <td className="px-8 py-6"><span className="text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-3 py-1 rounded-full uppercase tracking-tighter">SUCCESS</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'profile' && user && (
            <div className="max-w-4xl bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-12">
              <div className="flex items-center gap-4 mb-10">
                <Shield className="w-10 h-10 text-blue-600" />
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">My Medical Profile</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</label>
                    <p className="text-xl font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Identifier</label>
                    <p className="text-xl font-bold text-slate-900">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Contact</label>
                    <p className="text-xl font-bold text-slate-900">{user.phone}</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residential Address</label>
                    <p className="text-xl font-bold text-slate-900 leading-tight">{user.address}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient ID</label>
                    <p className="text-sm font-mono font-bold text-blue-600">{user.id}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Protection Status</label>
                    <div className="flex items-center gap-2 text-green-600 font-black uppercase text-[10px] tracking-widest">
                      <CheckCircle className="w-4 h-4" /> Fully Encrypted
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 pt-10 border-t border-slate-100">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
                  <Activity className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tighter mb-1">Health Data Transparency</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">MedLink Hospital stores your information according to HIPAA compliance. Only authorized physicians assigned to your appointments can view your diagnostic history.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
