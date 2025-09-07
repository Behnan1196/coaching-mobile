import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../contexts/AuthContext';

const CREDENTIALS_KEY = 'user_credentials';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loadingCredentials, setLoadingCredentials] = useState(true);
  const { signIn } = useAuth();

  // Load saved credentials on component mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedCredentials = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      if (savedCredentials) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(savedCredentials);
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    } catch (error) {
      console.log('Error loading saved credentials:', error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const saveCredentials = async (email: string, password: string) => {
    try {
      const credentials = JSON.stringify({ email, password });
      await SecureStore.setItemAsync(CREDENTIALS_KEY, credentials);
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const clearSavedCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    } catch (error) {
      console.log('Error clearing credentials:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen email ve şifrenizi girin');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Giriş Hatası', error.message);
    } else {
      // Save credentials if remember me is checked
      if (rememberMe) {
        await saveCredentials(email, password);
      } else {
        // Clear credentials if remember me is unchecked
        await clearSavedCredentials();
      }
    }
  };

  const handleRememberMeChange = async (value: boolean) => {
    setRememberMe(value);
    if (!value) {
      // Clear saved credentials when remember me is turned off
      await clearSavedCredentials();
    }
  };

  // Show loading indicator while loading credentials
  if (loadingCredentials) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#01adb8" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../../assets/login.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Koçluk Uygulaması</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email adresinizi girin"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Şifrenizi girin"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
          </View>

          <View style={styles.rememberMeContainer}>
            <Switch
              value={rememberMe}
              onValueChange={handleRememberMeChange}
              trackColor={{ false: '#D1D5DB', true: '#01adb8' }}
              thumbColor={rememberMe ? '#FFFFFF' : '#FFFFFF'}
            />
            <Text style={styles.rememberMeText}>Beni hatırla</Text>
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          {/* Membership Link */}
          <TouchableOpacity 
            style={styles.membershipLink}
            onPress={() => Linking.openURL('https://www.ozgunkocluk.com/')}
          >
            <Text style={styles.membershipText}>
              Hesabınız yok mu? <Text style={styles.membershipLinkText}>Üye olmak için tıklayın</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: -10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  rememberMeText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
  },
  loginButton: {
    backgroundColor: '#01adb8',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  membershipLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  membershipText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  membershipLinkText: {
    color: '#01adb8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
}); 