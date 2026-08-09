
import './global.css';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Index from './components/Index';
import Login from './components/Login';
import Planner from './components/Planner';
import { ActivityIndicator, StatusBar, Image, Text, TouchableOpacity, View } from 'react-native';
import { Header } from 'react-native-elements';
import RupeeIcon from './assets/rupee.png'
import { useColorScheme } from 'nativewind';
import { AuthProvider, useAuth } from './lib/AuthContext';

function Tabs({ tab, setTab }) {
  return (
    <View className="flex-row bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
      {['expenses', 'planner'].map((t) => (
        <TouchableOpacity
          key={t}
          className={`flex-1 py-3 items-center border-b-2 ${tab === t ? 'border-indigo-600' : 'border-transparent'}`}
          onPress={() => setTab(t)}
        >
          <Text className={`font-bold ${tab === t ? 'text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`}>
            {t === 'expenses' ? 'Expenses' : 'Planner'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function AppShell() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { user, initializing, signOut } = useAuth();
  const [tab, setTab] = useState('expenses');

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <Header
        backgroundColor={colorScheme === 'dark' ? '#1e293b' : '#4F46E5'}
        leftComponent={<Image source={RupeeIcon} style={{ width: 26, height: 26, resizeMode: 'contain' }} />}
        centerComponent={{ text: 'Expense Tracker', style: { color: '#fff', fontSize: 20, fontWeight: 'bold', letterSpacing: 0.5 } }}
        rightComponent={{
          icon: colorScheme === 'dark' ? 'sun' : 'moon',
          type: 'feather',
          color: '#fff',
          onPress: toggleColorScheme
        }}
      />
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'expenses' ? <Index /> : <Planner />}
      <TouchableOpacity className="py-2 items-center bg-white dark:bg-slate-900" onPress={signOut}>
        <Text className="text-gray-400 dark:text-gray-500 text-xs">Sign out</Text>
      </TouchableOpacity>
    </>
  );
}

export default function App() {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
