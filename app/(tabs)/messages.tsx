import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Search } from 'lucide-react-native';
import type { Message } from '@/types/database';

interface Conversation {
  otherUserId: string;
  otherUserProfile?: any;
  lastMessage?: Message;
  unreadCount: number;
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new messages
    if (user) {
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        }, (payload) => {
          fetchConversations();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(*)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();
      
      messages?.forEach((message) => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId,
            otherUserProfile: message.sender_id !== user.id ? message.sender_profile : null,
            lastMessage: message,
            unreadCount: 0,
          });
        }
        
        const conversation = conversationMap.get(otherUserId)!;
        
        // Update last message if this is more recent
        if (!conversation.lastMessage || new Date(message.created_at) > new Date(conversation.lastMessage.created_at)) {
          conversation.lastMessage = message;
        }
        
        // Count unread messages (received and not read)
        if (message.receiver_id === user.id && !message.read) {
          conversation.unreadCount++;
        }
      });

      // Fetch profiles for conversations where we don't have them
      const conversationsWithoutProfiles = Array.from(conversationMap.values())
        .filter(conv => !conv.otherUserProfile);

      if (conversationsWithoutProfiles.length > 0) {
        const userIds = conversationsWithoutProfiles.map(conv => conv.otherUserId);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        conversationsWithoutProfiles.forEach(conv => {
          conv.otherUserProfile = profiles?.find(p => p.id === conv.otherUserId);
        });
      }

      const conversationList = Array.from(conversationMap.values())
        .sort((a, b) => {
          if (!a.lastMessage || !b.lastMessage) return 0;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

      setConversations(conversationList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const formatMessageTime = (dateString: string) => {
    const messageDate = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - messageDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Your conversations</Text>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={20} color="#8B7355" />
          <Text style={styles.searchText}>Search messages</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {conversations.map((conversation) => (
          <TouchableOpacity key={conversation.otherUserId} style={styles.conversationCard}>
            <View style={styles.conversationHeader}>
              <View style={styles.avatarContainer}>
                {conversation.otherUserProfile?.avatar_url ? (
                  <Image 
                    source={{ uri: conversation.otherUserProfile.avatar_url }} 
                    style={styles.avatar} 
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {conversation.otherUserProfile?.first_name?.[0]}
                      {conversation.otherUserProfile?.last_name?.[0]}
                    </Text>
                  </View>
                )}
                {conversation.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.conversationInfo}>
                <View style={styles.conversationMeta}>
                  <Text style={styles.conversationName}>
                    {conversation.otherUserProfile?.first_name} {conversation.otherUserProfile?.last_name}
                  </Text>
                  {conversation.lastMessage && (
                    <Text style={styles.messageTime}>
                      {formatMessageTime(conversation.lastMessage.created_at)}
                    </Text>
                  )}
                </View>
                
                {conversation.lastMessage && (
                  <View style={styles.lastMessageContainer}>
                    <Text style={[
                      styles.lastMessage,
                      conversation.unreadCount > 0 && styles.lastMessageUnread
                    ]}>
                      {conversation.lastMessage.sender_id === user?.id && 'You: '}
                      {truncateMessage(conversation.lastMessage.content)}
                    </Text>
                  </View>
                )}
                
                {conversation.otherUserProfile?.job_title && (
                  <Text style={styles.jobTitle}>
                    {conversation.otherUserProfile.job_title}
                    {conversation.otherUserProfile.company && ` at ${conversation.otherUserProfile.company}`}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {conversations.length === 0 && (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color="#8B7355" />
            <Text style={styles.emptyStateText}>No conversations yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start connecting with others to begin messaging
            </Text>
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
    marginBottom: 20,
  },
  searchButton: {
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
  searchText: {
    fontSize: 16,
    color: '#8B7355',
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conversationCard: {
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
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#8B7355',
  },
  lastMessageContainer: {
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#333',
  },
  jobTitle: {
    fontSize: 12,
    color: '#8B7355',
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