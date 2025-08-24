import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Linking,
  RefreshControl
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useCoachStudent } from '../contexts/CoachStudentContext';
import { supabase } from '../lib/supabase';
import { EducationalLink } from '../types/database';

const Tab = createMaterialTopTabNavigator();

const UsefulLinksScreen = () => {
  const { userProfile } = useAuth();
  const { selectedStudent } = useCoachStudent();
  const [links, setLinks] = useState<EducationalLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    if (!supabase) return;
    
    try {
      const { data, error } = await supabase
        .from('educational_links')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) {
        console.error('Error loading links:', error);
        return;
      }

      setLinks(data || []);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLinks();
    setRefreshing(false);
  };

  const openLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Hata', 'Bu link açılamıyor.');
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Alert.alert('Hata', 'Link açılırken bir hata oluştu.');
    }
  };

  const getCategoryIcon = (title: string) => {
    // Return the first letter of the title for the colorful circle icon
    return title.charAt(0).toUpperCase();
  };

  const getCategoryColor = (category: string | undefined) => {
    // Safety check for undefined category
    if (!category) {
      return '#6B7280'; // Gray for undefined categories
    }
    
    // Use the corrected categories: Web, Video, PDF
    const categoryLower = category.toLowerCase();
    
    if (categoryLower === 'web') {
      return '#3B82F6'; // Blue - for web content
    }
    
    if (categoryLower === 'video') {
      return '#EF4444'; // Red - for video content
    }
    
    if (categoryLower === 'pdf') {
      return '#059669'; // Dark Green - for PDF files
    }
    
    // Default color for "Diğer" and unknown categories
    return '#6B7280'; // Gray
  };

  const getCategoryDisplayName = (category: string | undefined) => {
    // Safety check for undefined category
    if (!category) {
      return 'Diğer';
    }
    
    // Use the corrected categories directly
    const categoryLower = category.toLowerCase();
    
    if (categoryLower === 'web') {
      return 'Web';
    }
    
    if (categoryLower === 'video') {
      return 'Video';
    }
    
    if (categoryLower === 'pdf') {
      return 'PDF';
    }
    
    // Default to "Diğer" for anything else
    return 'Diğer';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Linkler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {links.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyStateIcon, { backgroundColor: '#249096' }]}>
            <Text style={[styles.emptyStateIconText, { color: 'white' }]}>L</Text>
          </View>
          <Text style={styles.emptyStateText}>Henüz yararlı link eklenmemiş</Text>
        </View>
      ) : (
        links.map((link) => (
          <TouchableOpacity
            key={link.id}
            style={styles.linkCard}
            onPress={() => openLink(link.url)}
          >
            <View style={styles.linkHeader}>
              <View 
                style={[
                  styles.linkIconContainer, 
                  { 
                    backgroundColor: getCategoryColor(link.category),
                    borderWidth: 0,
                    shadowColor: getCategoryColor(link.category),
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3
                  }
                ]} 
                key={`icon-${link.id}`}
              >
                <Text style={styles.linkIconText}>
                  {getCategoryIcon(link.title)}
                </Text>
              </View>
              <View style={styles.linkInfo}>
                <Text style={styles.linkName}>{link.title}</Text>
                <Text style={styles.linkCategory}>{getCategoryDisplayName(link.category)}</Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#9CA3AF" />
            </View>
            {link.description && (
              <Text style={styles.linkDescription}>{link.description}</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

export const ToolsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Araçlar</Text>
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#249096',
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: {
            backgroundColor: '#249096',
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: 'white',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          tabBarScrollEnabled: true,
        }}
      >
        <Tab.Screen name="Links" component={UsefulLinksScreen} options={{ title: 'Yararlı Linkler' }} />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateIconText: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  linkCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  linkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkIconText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: 'white',
  },
  linkInfo: {
    flex: 1,
  },
  linkName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  linkCategory: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  linkDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
}); 