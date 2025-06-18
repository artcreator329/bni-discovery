export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  industry?: string;
  job_title?: string;
  company?: string;
  avatar_url?: string;
  status: 'available' | 'busy' | 'offline';
  location?: string;
  preferred_meeting_times?: string[];
  interests?: string[];
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  requested_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester_profile?: UserProfile;
  requested_profile?: UserProfile;
}

export interface Meeting {
  id: string;
  organizer_id: string;
  attendee_id: string;
  title: string;
  description?: string;
  scheduled_for: string;
  duration_minutes: number;
  location?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  organizer_profile?: UserProfile;
  attendee_profile?: UserProfile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_profile?: UserProfile;
}

export interface CoffeeShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  photo_url?: string;
  created_at: string;
}