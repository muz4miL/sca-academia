# 🎓 SCIENCES COACHING ACADEMY Management System

> **A Comprehensive MERN Stack ERP for Modern Educational Institutions.**
> *Seamlessly integrating Academic Management, Financial Tracking, and Interactive Student Services.*

![Project Status](https://img.shields.io/badge/Status-Active_Development-sky?style=for-the-badge&logo=react)
![Tech Stack](https://img.shields.io/badge/Stack-MERN-0EA5E9?style=for-the-badge&logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-slate?style=for-the-badge)

## 📖 Overview

The **SCIENCES COACHING ACADEMY Management System** is a multi-interface ERP solution designed to bridge the gap between administrative control and student experience. Moving beyond simple record-keeping, it offers a robust **Operational Engine** that handles everything from inventory tracking to public inquiries.

The standout features include the **Smart Gatekeeper System** with barcode-based entry verification, real-time attendance tracking, and intelligent timetable-aware access control.

## 🏗️ Architecture

The system consists of three distinct interfaces:
1.  **🛡️ Admin Portal:** Complete control over Users, Finances, Inventory, and Academics.
2.  **🎓 Student Portal:** A secure dashboard for students to view timetables and fee status.
3.  **🌐 Public Website:** A landing interface for inquiries and general academy information.

---

## ✨ Key Features

### 🔐 Smart Gatekeeper & Attendance
* **Barcode Scanning:** USB scanner integration for instant student verification.
* **Real-Time Attendance:** Auto-marked on successful gate scan, synced to dashboard.
* **Timetable-Aware:** Validates entry against class schedule (day + time window).
* **Fee Enforcement:** Blocks full defaulters at the gate automatically.

### 🏢 Core Administration
* **Admissions Cycle:** Two-stage process (Signup -> Formal Admission).
* **Inventory Management:** Track assets, supplies, and stock levels.
* **Inquiry System:** Manage leads and questions from the public website.
* **Timetable Builder:** Dynamic scheduling for classes and teachers.

### 💰 Financial Engine
* **Revenue Splitting:** Automated calculation of profit shares (Partner vs. Academy).
* **Fee Management:** Track student payments, dues, and generated revenue.
* **Closing Protocol:** "End of Day" locking mechanism to secure daily cash collections.

### 🎨 The "SCA" UI
* **Design System:** Clean, modern interface built with **Shadcn/UI**.
* **Theme:** Professional "Sky Blue" (#0EA5E9) & Slate architecture.
* **Responsive:** Fully optimized for Desktop, Tablet, and Mobile.

---

## 🛠️ Tech Stack

### Frontend
* **Framework:** React.js (Vite)
* **Language:** TypeScript
* **Styling:** Tailwind CSS, Shadcn/ui
* **Icons:** Lucide React

### Backend
* **Runtime:** Node.js
* **Framework:** Express.js
* **Database:** MongoDB (Mongoose ODM) - *Multi-tenant capable*
* **Authentication:** JWT (JSON Web Tokens) with RBAC

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* MongoDB (Local `mongod` running or Atlas URI)

### 1. Clone the Repository
```bash
git clone [https://github.com/muz4miL/sca-academy.git](https://github.com/muz4miL/sca-academy.git)
cd sca-academy
