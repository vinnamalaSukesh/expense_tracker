import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';

function friendlyError(error) {
  switch (error.code) {
    case 'auth/invalid-email': return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password': return 'Wrong email or password.';
    case 'auth/user-not-found': return 'No account with that email — try creating one.';
    case 'auth/email-already-in-use': return 'An account already exists with that email.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    default: return error.message;
  }
}

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error) {
      Alert.alert(isSignUp ? 'Could not create account' : 'Could not sign in', friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 justify-center px-6">
      <Text className="text-2xl font-bold mb-1 dark:text-white text-center">
        {isSignUp ? 'Create account' : 'Welcome back'}
      </Text>
      <Text className="text-gray-500 dark:text-gray-400 mb-8 text-center">
        Sign in to sync your expenses and planner across devices.
      </Text>

      <TextInput
        className="border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base mb-3"
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base mb-5"
        placeholder="Password"
        placeholderTextColor="#9ca3af"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        className="bg-indigo-600 rounded-lg py-3.5 items-center mb-4"
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text className="text-white font-bold text-base">
          {submitting ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp((v) => !v)}>
        <Text className="text-indigo-600 dark:text-indigo-400 text-center">
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}