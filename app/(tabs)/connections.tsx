import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Check, X, MessageCircle, Coffee } from 'lucide-react-native';
import type { Connection } from '@/types/database';

export default function ConnectionsScreen() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [activeTab, setActiveTab] = useState<'connections' | 'pending' | 'sent'>('connections');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch accepted connections
      const { data: acceptedConnections, error: acceptedError } = await supabase
        .from('connections')
        .select(`
          *,
          requester_profile:profiles!connections_requester_id_fkey(*),
          requested_profile:profiles!connections_requested_id_fkey(*)
        `)
        .or(`requester_id.eq.${user.id},requested_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (acceptedError) throw acceptedError;

      // Fetch pending requests (received)
      const { data: pendingData, error: pendingError } = await supabase
        .from('connections')
        .select(`
          *,
          requester_profile:profiles!connections_requester_id_fkey(*)
        `)
        .eq('requested_id', user.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Fetch sent requests
      const { data: sentData, error: sentError } = await supabase
        .from('connections')
        .select(`
          *,
          requested_profile:profiles!connections_requested_id_fkey(*)
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      setConnections(acceptedConnections || []);
      setPendingRequests(pendingData || []);
      setSentRequests(sentData || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      Alert.alert('Error', 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  };

  const handleConnectionResponse = async (connectionId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('connections')
        .update({ status })
        .eq('id', connectionId);

      if (error) throw error;

      Alert.alert('Success', `Connection ${status}!`);
      fetchConnections();
    } catch (error) {
      console.error('Error updating connection:', error);
      Alert.alert('Error', 'Failed to update connection');
    }
  };

  const renderConnectionCard = (connection: Connection, showActions = false) => {
    const isRequester = connection.requester_id === user?.id;
    const profile = isRequester ? connection.requested_profile : connection.requester_profile;
    
    if (!profile) return null;

    return (
      <View key={connection.id} style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <View style={styles.connectionInfo}>
            <View style={styles.avatarContainer}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile.first_name[0]}{profile.last_name[0]}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {profile.first_name} {profile.last_name}
              </Text>
              {profile.job_title && (
                <Text style={styles.jobTitle}>
                  {profile.job_title}
                  {profile.company && ` at ${profile.company}`}
                </Text>
              )}
              {profile.industry && (
                <Text style={styles.industry}>{profile.industry}</Text>
              )}
            </View>
          </View>
        </View>

        {showActions ? (
          <View style={styles.connectionActions}>
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => handleConnectionResponse(connection.id, 'accepted')}
            >
              <Check size={16} color="#FFF" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleConnectionResponse(connection.id, 'rejected')}
            >
              <X size={16} color="#FFF" />
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.connectionActions}>
            <TouchableOpacity style={styles.messageButton}>
              <MessageCircle size={16} color="#8B4513" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.meetButton}>
              <Coffee size={16} color="#FFF" />
              <Text style={styles.meetButtonText}>Meet</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'connections': return connections.length;
      case 'pending': return pendingRequests.length;
      case 'sent': return sentRequests.length;
      default: return 0;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connections</Text>
        <Text style={styles.subtitle}>Your professional network</Text>
      </View>

      <View style={styles.tabContainer}>
        {[
          { key: 'connections', label: 'Connected' },
          { key: 'pending', label: 'Requests' },
          { key: 'sent', label: 'Sent' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText
            ]}>
              {tab.label} ({getTabCount(tab.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'connections' && (
          <View>
            {connections.map((connection) => renderConnectionCard(connection))}
            {connections.length === 0 && (
              <View style={styles.emptyState}>
                <Coffee size={48} color="#8B7355" />
                <Text style={styles.emptyStateText}>No connections yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start networking by discovering new people
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'pending' && (
          <View>
            {pendingRequests.map((request) => renderConnectionCard(request, true))}
            {pendingRequests.length === 0 && (
              <View style={styles.emptyState}>
                <MessageCircle size={48} color="#8B7355" />
                <Text style={styles.emptyStateText}>No pending requests</Text>
                <Text style={styles.emptyStateSubtext}>
                  You'll see connection requests here
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'sent' && (
          <View>
            {sentRequests.map((request) => (
              <View key={request.id} style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View style={styles.connectionInfo}>
                    <View style={styles.avatarContainer}>
                      {request.requested_profile?.avatar_url ? (
                        <Image source={{ uri: request.requested_profile.avatar_url }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {request.requested_profile?.first_name[0]}{request.requested_profile?.last_name[0]}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.profileDetails}>
                      <Text style={styles.profileName}>
                        {request.requested_profile?.first_name} {request.requested_profile?.last_name}
                      </Text>
                      {request.requested_profile?.job_title && (
                        <Text style={styles.jobTitle}>
                          {request.requested_profile.job_title}
                          {request.requested_profile.company && ` at ${request.requested_profile.company}`}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                  </View>
                </View>
              </View>
            ))}
            {sentRequests.length === 0 && (
              <View style={styles.emptyState}>
                <Coffee size={48} color="#8B7355" />
                <Text style={styles.emptyStateText}>No sent requests</Text>
                <Text style={styles.emptyStateSubtext}>
                  Requests you send will appear here
                </Text>
              </View>
            )}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#8B4513',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#8B4513',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  connectionCard: {
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
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  jobTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  industry: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 2,
  },
  connectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  acceptButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rejectButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  messageButtonText: {
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '600',
  },
  meetButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  meetButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#FFF',
    fontSize: 12,
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
});