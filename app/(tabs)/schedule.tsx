import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Clock, MapPin, Plus, Coffee, Users } from 'lucide-react-native';
import type { Meeting } from '@/types/database';

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [selectedDate]);

  const fetchMeetings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          organizer_profile:profiles!meetings_organizer_id_fkey(*),
          attendee_profile:profiles!meetings_attendee_id_fkey(*)
        `)
        .or(`organizer_id.eq.${user.id},attendee_id.eq.${user.id}`)
        .gte('scheduled_for', startOfDay.toISOString())
        .lte('scheduled_for', endOfDay.toISOString())
        .order('scheduled_for');

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      Alert.alert('Error', 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  };

  const updateMeetingStatus = async (meetingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ status })
        .eq('id', meetingId);

      if (error) throw error;
      
      Alert.alert('Success', `Meeting ${status}!`);
      fetchMeetings();
    } catch (error) {
      console.error('Error updating meeting:', error);
      Alert.alert('Error', 'Failed to update meeting');
    }
  };

  const getWeekDays = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getMeetingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      case 'completed': return '#6B7280';
      default: return '#F59E0B';
    }
  };

  const weekDays = getWeekDays();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>Manage your coffee meetings</Text>
      </View>

      <View style={styles.calendarHeader}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekDaysContainer}
        >
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayButton,
                isSameDay(day, selectedDate) && styles.dayButtonActive
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={[
                styles.dayName,
                isSameDay(day, selectedDate) && styles.dayNameActive
              ]}>
                {getDayName(day)}
              </Text>
              <Text style={[
                styles.dayNumber,
                isSameDay(day, selectedDate) && styles.dayNumberActive
              ]}>
                {day.getDate()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.selectedDateHeader}>
        <View style={styles.dateInfo}>
          <Calendar size={20} color="#8B4513" />
          <Text style={styles.selectedDateText}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="#8B4513" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.meetingsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {meetings.map((meeting) => {
          const isOrganizer = meeting.organizer_id === user?.id;
          const otherProfile = isOrganizer ? meeting.attendee_profile : meeting.organizer_profile;
          
          return (
            <View key={meeting.id} style={styles.meetingCard}>
              <View style={styles.meetingHeader}>
                <View style={styles.meetingTime}>
                  <Clock size={16} color="#8B7355" />
                  <Text style={styles.timeText}>{formatTime(meeting.scheduled_for)}</Text>
                  <Text style={styles.durationText}>
                    ({meeting.duration_minutes} min)
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getMeetingStatusColor(meeting.status) }
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.meetingTitle}>{meeting.title}</Text>
              
              {meeting.description && (
                <Text style={styles.meetingDescription}>{meeting.description}</Text>
              )}

              <View style={styles.meetingParticipant}>
                <Users size={16} color="#8B7355" />
                <Text style={styles.participantText}>
                  {isOrganizer ? 'Meeting with' : 'Organized by'} {otherProfile?.first_name} {otherProfile?.last_name}
                </Text>
              </View>

              {meeting.location && (
                <View style={styles.meetingLocation}>
                  <MapPin size={16} color="#8B7355" />
                  <Text style={styles.locationText}>{meeting.location}</Text>
                </View>
              )}

              {meeting.status === 'pending' && (
                <View style={styles.meetingActions}>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={() => updateMeetingStatus(meeting.id, 'confirmed')}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => updateMeetingStatus(meeting.id, 'cancelled')}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {meeting.status === 'confirmed' && (
                <View style={styles.meetingActions}>
                  <TouchableOpacity style={styles.joinButton}>
                    <Coffee size={16} color="#FFF" />
                    <Text style={styles.joinButtonText}>Join Meeting</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {meetings.length === 0 && (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#8B7355" />
            <Text style={styles.emptyStateText}>No meetings scheduled</Text>
            <Text style={styles.emptyStateSubtext}>
              {isSameDay(selectedDate, new Date()) 
                ? "You're free today!" 
                : "Nothing planned for this day"
              }
            </Text>
            <TouchableOpacity style={styles.scheduleButton}>
              <Plus size={16} color="#FFF" />
              <Text style={styles.scheduleButtonText}>Schedule a Meeting</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
    marginTop: 4,
  },
  calendarHeader: {
    paddingBottom: 20,
  },
  weekDaysContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    minWidth: 60,
  },
  dayButtonActive: {
    backgroundColor: '#8B4513',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  dayNameActive: {
    color: '#FFF',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dayNumberActive: {
    color: '#FFF',
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  meetingsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  meetingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  meetingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  meetingParticipant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  participantText: {
    fontSize: 14,
    color: '#666',
  },
  meetingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  meetingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  joinButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  joinButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 24,
  },
  scheduleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});