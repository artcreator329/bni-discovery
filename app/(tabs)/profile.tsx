import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { 
  Edit3, 
  MapPin, 
  Briefcase, 
  Mail, 
  Settings, 
  LogOut,
  Camera,
  Clock,
  Bell
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, profile, signOut, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    bio: profile?.bio || '',
    job_title: profile?.job_title || '',
    company: profile?.company || '',
    industry: profile?.industry || '',
    location: profile?.location || '',
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSave = async () => {
    try {
      const { error } = await updateProfile(editedProfile);
      if (error) {
        Alert.alert('Error', error);
      } else {
        setEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const updateStatus = async (status: 'available' | 'busy' | 'offline') => {
    const { error } = await updateProfile({ status });
    if (error) {
      Alert.alert('Error', 'Failed to update status');
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

  const industries = ['Technology', 'Finance', 'Healthcare', 'Marketing', 'Design', 'Consulting', 'Education', 'Other'];

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImageText}>
                {profile.first_name[0]}{profile.last_name[0]}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraButton}>
            <Camera size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile.first_name} {profile.last_name}
          </Text>
          {profile.job_title && (
            <Text style={styles.jobTitle}>
              {profile.job_title}
              {profile.company && ` at ${profile.company}`}
            </Text>
          )}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(profile.status) }]} />
            <Text style={styles.statusText}>
              {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setEditing(!editing)}
        >
          <Edit3 size={20} color="#8B4513" />
        </TouchableOpacity>
      </View>

      {editing ? (
        <View style={styles.editSection}>
          <Text style={styles.sectionTitle}>Edit Profile</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.first_name}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, first_name: text }))}
              placeholder="First name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.last_name}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, last_name: text }))}
              placeholder="Last name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editedProfile.bio}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, bio: text }))}
              placeholder="Tell others about yourself..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Job Title</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.job_title}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, job_title: text }))}
              placeholder="Software Engineer, Product Manager, etc."
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.company}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, company: text }))}
              placeholder="Company name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Industry</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.industryPicker}>
              {industries.map((industry) => (
                <TouchableOpacity
                  key={industry}
                  style={[
                    styles.industryChip,
                    editedProfile.industry === industry && styles.industryChipActive
                  ]}
                  onPress={() => setEditedProfile(prev => ({ ...prev, industry }))}
                >
                  <Text style={[
                    styles.industryChipText,
                    editedProfile.industry === industry && styles.industryChipTextActive
                  ]}>
                    {industry}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={editedProfile.location}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, location: text }))}
              placeholder="City, Country"
            />
          </View>

          <View style={styles.editActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setEditing(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusOptions}>
              {['available', 'busy', 'offline'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    profile.status === status && styles.statusOptionActive
                  ]}
                  onPress={() => updateStatus(status as any)}
                >
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
                  <Text style={[
                    styles.statusOptionText,
                    profile.status === status && styles.statusOptionTextActive
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>About</Text>
            
            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : (
              <Text style={styles.emptyText}>Add a bio to tell others about yourself</Text>
            )}

            <View style={styles.infoItems}>
              <View style={styles.infoItem}>
                <Mail size={16} color="#8B7355" />
                <Text style={styles.infoText}>{profile.email}</Text>
              </View>

              {profile.location && (
                <View style={styles.infoItem}>
                  <MapPin size={16} color="#8B7355" />
                  <Text style={styles.infoText}>{profile.location}</Text>
                </View>
              )}

              {profile.job_title && (
                <View style={styles.infoItem}>
                  <Briefcase size={16} color="#8B7355" />
                  <Text style={styles.infoText}>
                    {profile.job_title}
                    {profile.company && ` at ${profile.company}`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Bell size={20} color="#8B7355" />
                <Text style={styles.settingText}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E5E5E5', true: '#8B4513' }}
                thumbColor={notificationsEnabled ? '#FFF' : '#FFF'}
              />
            </View>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Clock size={20} color="#8B7355" />
                <Text style={styles.settingText}>Availability Schedule</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Settings size={20} color="#8B7355" />
                <Text style={styles.settingText}>App Settings</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  jobTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    gap: 8,
  },
  statusOptionActive: {
    backgroundColor: '#8B4513',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statusOptionTextActive: {
    color: '#FFF',
  },
  infoSection: {
    padding: 20,
    paddingTop: 0,
  },
  bio: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  infoItems: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  editSection: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  industryPicker: {
    marginTop: 8,
  },
  industryChip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginRight: 8,
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
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8B4513',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSection: {
    padding: 20,
    paddingTop: 0,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});