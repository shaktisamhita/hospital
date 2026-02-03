
# MedLink Hospital Appointment Platform

A professional hospital scheduling system built with FastAPI (Backend) and React (Frontend).

## Features
- **Role-Based Access**: Separate workflows for Patients and Doctors.
- **Double-Booking Prevention**: Transactional validation on the backend ensures slots are unique.
- **Payment Simulation**: Appointments require confirmation via payment before being finalized.
- **SMS Notifications**: Automated messages (logged to terminal) on successful booking.

## Prerequisites
- Python 3.9+
- Node.js (for local React development if not using this sandbox)

## How to Run Backend
1. Open your terminal in the project root.
2. Install dependencies:
   ```bash
   pip install fastapi uvicorn sqlalchemy
   ```
3. Start the server:
   ```bash
   uvicorn main:app --reload
   ```
   The backend will run on `http://localhost:8000`.

## How to Run Frontend
The frontend is pre-configured to talk to `localhost:8000`. If the backend is not running, the app will automatically fall back to **Mock Mode** using browser LocalStorage, so you can still preview the UI.

## Testing Double Booking
1. Open two separate browser tabs.
2. Log in as a patient in both.
3. Try to book the **same doctor, same date, and same time slot** simultaneously.
4. The first request to hit the server will succeed; the second will receive a `400 Bad Request` with an error message.
