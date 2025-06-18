import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Filter, MapPin, Clock, Briefcase } from 'lucide-react-native';
import type { UserProfile } from '@/types/database';

export default function DiscoverScreen() {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const industries = ['all', 'Technology', 'Finance', 'Healthcare', 'Marketing', 'Design', 'Consulting', 'Education', 'Other'];

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchQuery, selectedIndustry]);

  const fetchProfiles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      Alert.alert('Error', 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfiles();
    setRefreshing(false);
  };

  const filterProfiles = () => {
    let filtered = profiles;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(profile =>
        profile.first_name.toLowerCase().includes(query) ||
        profile.last_name.toLowerCase().includes(query) ||
        profile.job_title?.toLowerCase().includes(query) ||
        profile.company?.toLowerCase().includes(query) ||
        profile.industry?.toLowerCase().includes(query)
      );
    }

    // Filter by industry
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(profile => profile.industry === selectedIndustry);
    }

    setFilteredProfiles(filtered);
  };

  const sendConnectionRequest = async (targetUserId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: user.id,
          requested_id: targetUserId,
          status: 'pending',
        });

      if (error) throw error;
      Alert.alert('Success', 'Connection request sent!');
    } catch (error) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', 'Failed to send connection request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'busy': return '#F59E0B';
      case 'offline': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please complete your profile first</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Find coffee connections near you</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#8B7355" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, company, or industry"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.industryFilter}
        contentContainerStyle={styles.industryFilterContent}
      >
        {industries.map((industry) => (
          <TouchableOpacity
            key={industry}
            style={[
              styles.industryChip,
              selectedIndustry === industry && styles.industryChipActive
            ]}
            onPress={() => setSelectedIndustry(industry)}
          >
            <Text style={[
              styles.industryChipText,
              selectedIndustry === industry && styles.industryChipTextActive
            ]}>
              {industry === 'all' ? 'All Industries' : industry}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.profilesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredProfiles.map((userProfile) => (
          <View key={userProfile.id} style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.profileInfo}>
                <View style={styles.avatarContainer}>
                  {userProfile.avatar_url ? (
                    <Image source={{ uri: userProfile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {userProfile.first_name[0]}{userProfile.last_name[0]}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(userProfile.status) }]} />
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>
                    {userProfile.first_name} {userProfile.last_name}
                  </Text>
                  <Text style={styles.statusText}>
                    {getStatusText(userProfile.status)}
                  </Text>
                </View>
              </View>
            </View>

            {userProfile.job_title && (
              <View style={styles.jobInfo}>
                <Briefcase size={16} color="#8B7355" />
                <Text style={styles.jobTitle}>{userProfile.job_title}</Text>
                {userProfile.company && (
                  <Text style={styles.company}>at {userProfile.company}</Text>
                )}
              </View>
            )}

            {userProfile.industry && (
              <View style={styles.industryTag}>
                <Text style={styles.industryTagText}>{userProfile.industry}</Text>
              </View>
            )}

            {userProfile.location && (
              <View style={styles.locationInfo}>
                <MapPin size={16} color="#8B7355" />
                <Text style={styles.locationText}>{userProfile.location}</Text>
              </View>
            )}

            {userProfile.bio && (
              <Text style={styles.bio} numberOfLines={3}>
                {userProfile.bio}
              </Text>
            )}

            <View style={styles.profileActions}>
              <TouchableOpacity 
                style={styles.connectButton}
                onPress={() => sendConnectionRequest(userProfile.id)}
              >
                <Text style={styles.connectButtonText}>Connect</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton}>
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredProfiles.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No profiles found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  industryFilter: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  industryFilterContent: {
    paddingRight: 20,
    gap: 8,
  },
  industryChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  industryChipActive: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  industryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  industryChipTextActive: {
    color: '#FFF',
  },
  profilesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  jobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  company: {
    fontSize: 14,
    color: '#666',
  },
  industryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  industryTagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  connectButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#8B4513',
    fontSize: 16,
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
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});