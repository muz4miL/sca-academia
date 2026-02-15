// API Base URL - Auto-detect Codespaces or localhost
const getApiBaseUrl = () => {
  // Check if we're in GitHub Codespaces
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // Extract codespace name from current URL and construct backend URL
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev/api`;
  }
  // Fallback to localhost for local development
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface Seat {
  _id: string;
  sclass: string;
  session: string;
  school: string;
  seatNumber: number;
  seatLabel: string;
  wing: 'Left' | 'Right';
  side: 'Left' | 'Right';
  position: {
    row: number;
    column: number;
  };
  isTaken: boolean;
  isReserved: boolean;
  reservedReason?: string | null;
  student: {
    _id: string;
    name?: string;
    rollNum?: string;
    gender?: string;
  } | null;
  bookedAt?: string | null;
  history?: Array<{
    action: string;
    performedBy: string;
    performedByModel: string;
    timestamp: string;
    notes?: string;
  }>;
}

export interface GetSeatsResponse {
  seats: Seat[];
  allowedSide: 'Left' | 'Right';
  studentGender: 'Male' | 'Female';
  seatChangeCount?: number;
}

export interface BookSeatRequest {
  seatId: string;
  studentId: string;
}

export interface BookSeatResponse {
  message: string;
  seat: Seat;
  seatLabel?: string;
}

export interface AdminSeatsResponse {
  seats: Seat[];
  stats: {
    total: number;
    occupied: number;
    reserved: number;
    available: number;
    leftWing: { total: number; occupied: number };
    rightWing: { total: number; occupied: number };
  };
}

// Seat Service API
export const seatService = {
  // Get available seats for a class/session
  getSeats: async (classId: string, sessionId: string, studentId: string): Promise<GetSeatsResponse> => {
    const response = await fetch(`${API_BASE_URL}/seats/${classId}/${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch seats');
    }

    return data;
  },

  // Book a seat
  bookSeat: async (seatId: string, studentId: string): Promise<BookSeatResponse> => {
    const response = await fetch(`${API_BASE_URL}/seats/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ seatId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to book seat');
    }

    return data;
  },

  // Release a seat
  releaseSeat: async (seatId: string, studentId: string): Promise<{ 
    message: string; 
    seat: Seat;
    changeCount?: number;
    remainingChanges?: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/seats/release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ seatId }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to release seat');
    }

    return data;
  },

  // Admin: Get all seats with stats
  getAdminSeats: async (classId: string, sessionId: string): Promise<AdminSeatsResponse> => {
    const response = await fetch(`${API_BASE_URL}/seats/admin/${classId}/${sessionId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch admin seats');
    }
    return data;
  },

  // Admin: Initialize seats
  initializeSeats: async (classId: string, sessionId: string): Promise<{ message: string; count: number }> => {
    console.log('🚀 Initializing seats:', { classId, sessionId, url: `${API_BASE_URL}/seats/initialize` });
    const response = await fetch(`${API_BASE_URL}/seats/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ classId, sessionId }),
    });

    const data = await response.json();
    console.log('📡 Server response:', { status: response.status, ok: response.ok, data });
    
    if (!response.ok) {
      const errorMessage = data.message || `Server error: ${response.status}`;
      console.error('❌ Initialization failed:', errorMessage);
      throw new Error(errorMessage);
    }
    return data;
  },

  // Admin: Vacate seat
  vacateSeat: async (seatId: string, reason: string): Promise<{ message: string; seat: Seat }> => {
    const response = await fetch(`${API_BASE_URL}/seats/vacate/${seatId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to vacate seat');
    }
    return data;
  },

  //Admin: Toggle reservation
  toggleReservation: async (seatId: string, isReserved: boolean, reason: string | null): Promise<{ message: string; seat: Seat }> => {
    console.log('🔄 Toggling reservation:', { seatId, isReserved, reason });
    const response = await fetch(`${API_BASE_URL}/seats/reserve/${seatId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ isReserved, reason }),
    });

    const data = await response.json();
    console.log('📡 Toggle response:', { status: response.status, data });
    if (!response.ok) {
      console.error('❌ Toggle failed:', data);
      throw new Error(data.message || 'Failed to toggle reservation');
    }
    return data;
  },
};
