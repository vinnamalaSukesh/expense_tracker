
import './global.css';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Index from './components/Index';
import { StatusBar, Image } from 'react-native';
import { Header } from 'react-native-elements';
import RupeeIcon from './assets/rupee.png'
import { useColorScheme } from 'nativewind';

export default function App() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
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
      <Index />
    </SafeAreaProvider>
  );
}
