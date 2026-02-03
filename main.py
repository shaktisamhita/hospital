from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
import random
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Enum, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import enum

# --- DATABASE SETUP ---
DATABASE_URL = "sqlite:///./medlink.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"

class AppointmentStatus(str, enum.Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    firstName = Column(String)
    lastName = Column(String)
    address = Column(String)
    phone = Column(String)
    role = Column(String) # PATIENT or DOCTOR
    password = Column(String)
    specialty = Column(String, nullable=True) # For doctors
    bio = Column(String, nullable=True) # For doctors
    experienceYears = Column(Integer, nullable=True) # For doctors

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(String, primary_key=True, index=True)
    patientId = Column(String, ForeignKey("users.id"))
    doctorId = Column(String, ForeignKey("users.id"))
    date = Column(String) # YYYY-MM-DD
    slot = Column(String) # HH:MM
    status = Column(String, default=AppointmentStatus.PENDING_PAYMENT)
    patientName = Column(String)
    doctorName = Column(String)
    specialty = Column(String)
    createdAt = Column(DateTime, default=datetime.utcnow)

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True, index=True)
    appointmentId = Column(String, ForeignKey("appointments.id"))
    patientId = Column(String, ForeignKey("users.id"))
    amount = Column(Float)
    status = Column(String)
    method = Column(String)
    transactionDate = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- SCHEMAS ---
class UserBase(BaseModel):
    email: str
    firstName: str
    lastName: str
    address: str
    phone: str
    role: UserRole
    specialty: Optional[str] = None
    bio: Optional[str] = None
    experienceYears: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class AppointmentCreate(BaseModel):
    patientId: str
    doctorId: str
    date: str
    slot: str
    patientName: str
    doctorName: str
    specialty: str

class AppointmentResponse(AppointmentCreate):
    id: str
    status: AppointmentStatus
    createdAt: datetime
    class Config:
        from_attributes = True

class PaymentResponse(BaseModel):
    id: str
    appointmentId: str
    patientId: str
    amount: float
    status: str
    method: str
    transactionDate: datetime
    class Config:
        from_attributes = True

# --- APP INSTANCE ---
app = FastAPI(title="MedLink Hospital API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ENDPOINTS ---

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        id=f"u_{datetime.now().timestamp()}",
        **user.dict()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=UserResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or user.password != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@app.get("/doctors", response_model=List[UserResponse])
def get_doctors(specialty: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User).filter(User.role == UserRole.DOCTOR)
    if specialty:
        query = query.filter(User.specialty == specialty)
    return query.all()

@app.get("/slots")
def get_available_slots(doctorId: str, date: str, db: Session = Depends(get_db)):
    booked = db.query(Appointment).filter(
        Appointment.doctorId == doctorId,
        Appointment.date == date,
        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_PAYMENT])
    ).all()
    
    booked_times = [a.slot for a in booked]
    all_slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]
    
    return [{"time": t, "isAvailable": t not in booked_times} for t in all_slots]

@app.post("/appointments", response_model=AppointmentResponse)
def create_appointment(app_data: AppointmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Appointment).filter(
        Appointment.doctorId == app_data.doctorId,
        Appointment.date == app_data.date,
        Appointment.slot == app_data.slot,
        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_PAYMENT])
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="This slot has already been reserved.")

    new_app = Appointment(
        id=f"app_{datetime.now().timestamp()}",
        **app_data.dict(),
        status=AppointmentStatus.PENDING_PAYMENT
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    return new_app

@app.post("/appointments/{app_id}/pay")
def pay_appointment(app_id: str, db: Session = Depends(get_db)):
    app_record = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    app_record.status = AppointmentStatus.CONFIRMED
    
    # Create Payment Record
    new_payment = Payment(
        id=f"pay_{datetime.now().timestamp()}",
        appointmentId=app_id,
        patientId=app_record.patientId,
        amount=52.50,
        status="SUCCESS",
        method="Credit Card"
    )
    db.add(new_payment)
    db.commit()
    return {"status": "success"}

@app.get("/payments/patient/{patient_id}", response_model=List[PaymentResponse])
def get_patient_payments(patient_id: str, db: Session = Depends(get_db)):
    return db.query(Payment).filter(Payment.patientId == patient_id).all()

@app.get("/appointments/patient/{patient_id}", response_model=List[AppointmentResponse])
def get_patient_appointments(patient_id: str, db: Session = Depends(get_db)):
    return db.query(Appointment).filter(Appointment.patientId == patient_id).all()

@app.get("/appointments/doctor/{doctor_id}", response_model=List[AppointmentResponse])
def get_doctor_appointments(doctor_id: str, db: Session = Depends(get_db)):
    return db.query(Appointment).filter(Appointment.doctorId == doctor_id).all()

@app.patch("/appointments/{app_id}/status")
def update_status(app_id: str, status: AppointmentStatus, db: Session = Depends(get_db)):
    app_record = db.query(Appointment).filter(Appointment.id == app_id).first()
    if not app_record:
        raise HTTPException(status_code=404, detail="Appointment not found")
    app_record.status = status
    db.commit()
    return {"status": "success"}

@app.get("/wait-time/{doctor_id}")
async def get_wait_time(doctor_id: str):
    # Simulated ML model prediction for wait time
    wait_minutes = random.randint(5, 45)
    return {"doctor_id": doctor_id, "wait_time": f"{wait_minutes} minutes"}
