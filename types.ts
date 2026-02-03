export type UserRole = 'PATIENT' | 'DOCTOR';
export type Language = 'en' | 'gu' | 'hi';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  role: UserRole;
  password?: string;
}

export type Specialty = 
  | 'Gynecology' 
  | 'Dentistry' 
  | 'Pediatrics' 
  | 'Cardiology' 
  | 'Neurology' 
  | 'Orthopedics' 
  | 'General Practice';

export interface Doctor extends User {
  specialty: Specialty;
  bio: string;
  experienceYears: number;
}

export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string; // ISO string
  slot: string; // HH:mm
  status: AppointmentStatus;
  patientName: string;
  doctorName: string;
  specialty: Specialty;
  createdAt: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED';
  method: string;
  transactionDate: string;
}

export interface TimeSlot {
  time: string;
  isAvailable: boolean;
}
