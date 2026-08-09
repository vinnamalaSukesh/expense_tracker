import { Entypo, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { MARCH_2026_DATA } from '../lib/marchImportData';
import PieChart from './pie_chart';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function PickerModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity className="flex-1 bg-black/40 justify-center items-center" activeOpacity={1} onPress={onClose}>
        <View className="w-[70%] bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg">
          <Text className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-2.5">{title}</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                className={`py-2.5 px-2.5 rounded-lg ${opt === selected ? 'bg-indigo-50 dark:bg-indigo-900/50' : ''}`}
                onPress={() => { onSelect(opt); onClose(); }}
              >
                <Text className={`text-[15px] ${opt === selected ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function Index() {
  const { user } = useAuth();
  const [expensesData, setExpensesData] = useState({});
  const monthsData = [];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const migrationAttempted = useRef(false);

  const dataYears = Object.keys(expensesData).map(Number);
  const currentYear = new Date().getFullYear();
  const allYears = Array.from(new Set([...dataYears, currentYear])).sort((a, b) => b - a).map(String);

  // Syncs expenses from Firestore in real time; on first login for this account
  // (no "expenses" field yet) it migrates any pre-existing local AsyncStorage data up.
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, async (snap) => {
      const remoteExpenses = snap.data()?.expenses;
      if (remoteExpenses) {
        setExpensesData(remoteExpenses);
        return;
      }
      if (migrationAttempted.current) return;
      migrationAttempted.current = true;
      try {
        const savedData = await AsyncStorage.getItem('expenses-data');
        const parsed = savedData ? JSON.parse(savedData) : {};
        setExpensesData(parsed);
        await setDoc(userDocRef, { expenses: parsed }, { merge: true });
      } catch (error) {
        console.error('Failed to load/migrate expenses', error);
      }
    });
    return unsubscribe;
  }, [user]);

  const selectedYear = selectedDate.getFullYear().toString();
  const selectedMonth = selectedDate.toLocaleString('default', { month: 'long' });
  const selectedDay = selectedDate.getDate().toString();

  const todayExpenses = (() => {
    try {
      return Object.entries(
        expensesData[selectedYear]?.[selectedMonth]?.[selectedDay] ?? {}
      );
    } catch { return []; }
  })();
  
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  for (const [year, months] of Object.entries(expensesData)) {
    for (const [month, days] of Object.entries(months)) {
      let total = 0;
      for (const [day, expenses] of Object.entries(days)) {
        for (const [expenseName, amount] of Object.entries(expenses)) {
          total += amount;
        }
      }
      monthsData.push({
        id: `${year}-${month}`,
        year,
        month,
        total,
      });
    }
  }

  const handleAddExpense = async () => {
    if (!expenseName.trim() || !amount.trim()) {
      Alert.alert('Validation Error', 'Please enter both an expense name and an amount.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      Alert.alert('Validation Error', 'Please enter a valid number for the amount.');
      return;
    }

    // Create a copy of our data to safely update React state
    const updatedData = JSON.parse(JSON.stringify(expensesData));

    if (!updatedData[selectedYear]) updatedData[selectedYear] = {};
    if (!updatedData[selectedYear][selectedMonth]) updatedData[selectedYear][selectedMonth] = {};
    if (!updatedData[selectedYear][selectedMonth][selectedDay]) updatedData[selectedYear][selectedMonth][selectedDay] = {};

    updatedData[selectedYear][selectedMonth][selectedDay][expenseName.trim()] = numericAmount;

    setExpensesData(updatedData); // Update UI
    setExpenseName('');
    setAmount('');

    // Save permanently to the cloud
    try {
      await setDoc(doc(db, 'users', user.uid), { expenses: updatedData }, { merge: true });
    } catch (error) {
      Alert.alert('Storage Error', 'Failed to save expense permanently.');
    }
  };

  const monthlyExpenseMap = {};
  let monthTotal = 0;
  const monthData = (expensesData)[selectedYear]?.[selectedMonth] ?? {};
  for (const [, expenses] of Object.entries(monthData)) {
    for (const [name, amt] of Object.entries(expenses)) {
      monthlyExpenseMap[name] = (monthlyExpenseMap[name] ?? 0) + amt;
      monthTotal += amt;
    }
  }
  const pieData = Object.entries(monthlyExpenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const handleDeleteExpense = async (name) => {
    const updatedData = JSON.parse(JSON.stringify(expensesData));
    if (updatedData[selectedYear]?.[selectedMonth]?.[selectedDay]) {
      delete updatedData[selectedYear][selectedMonth][selectedDay][name];
    }
    setExpensesData(updatedData);
    try {
      await setDoc(doc(db, 'users', user.uid), { expenses: updatedData }, { merge: true });
    } catch {
      Alert.alert('Storage Error', 'Failed to delete expense.');
    }
  };
  const [editingName, setEditingName] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const handleEditSave = async (oldName) => {
    const numericAmount = parseFloat(editAmount);
    if (isNaN(numericAmount)) return;
    const updatedData = JSON.parse(JSON.stringify(expensesData));
    updatedData[selectedYear][selectedMonth][selectedDay][oldName] = numericAmount;
    setExpensesData(updatedData);
    setEditingName(null);
    try {
      await setDoc(doc(db, 'users', user.uid), { expenses: updatedData }, { merge: true });
    } catch {
      Alert.alert('Storage Error', 'Failed to update expense.');
    }
  };

  const changeYear = (year) => {
    const d = new Date(selectedDate);
    d.setFullYear(parseInt(year));
    setSelectedDate(d);
  };

  const changeMonth = (month) => {
    const d = new Date(selectedDate);
    d.setMonth(MONTHS.indexOf(month));
    setSelectedDate(d);
  };

  const handleImportMarch2026 = async () => {
    const updatedData = JSON.parse(JSON.stringify(expensesData));
    if (!updatedData['2026']) updatedData['2026'] = {};
    updatedData['2026']['March'] = MARCH_2026_DATA;
    setExpensesData(updatedData);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { expenses: { '2026': { March: MARCH_2026_DATA } } }, { merge: true });
      const verifySnap = await getDoc(userDocRef);
      const daysWritten = Object.keys(verifySnap.data()?.expenses?.['2026']?.March ?? {}).length;
      Alert.alert('Synced', `uid: ${user.uid}\nVerified in Firestore: ${daysWritten} days of March 2026 data.`);
    } catch (error) {
      Alert.alert('Storage Error', `${error.code ?? ''} ${error.message}`);
    }
  };

  const handleCheckCloudData = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const marchData = snap.data()?.expenses?.['2026']?.March;
      const daysFound = marchData ? Object.keys(marchData).length : 0;
      Alert.alert('Cloud Check', `uid: ${user.uid}\nDoc exists: ${snap.exists()}\nMarch 2026 days found: ${daysFound}`);
    } catch (error) {
      Alert.alert('Cloud Check Error', `${error.code ?? ''} ${error.message}`);
    }
  };

  return (
  <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 pb-5" edges={['bottom']}>
    <ScrollView className="flex-1 p-4">
      <View className="flex-row items-center gap-5 mb-5">
        <Text className="text-xl font-bold dark:text-white">Select a Month</Text>
        <TouchableOpacity className="border border-indigo-600 rounded-lg py-1.5 px-3 bg-indigo-50" onPress={() => setShowYearPicker(true)}>
          <Text className="text-indigo-600 font-bold text-[16px]">{selectedYear} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity className="border border-indigo-600 rounded-lg py-1.5 px-3 bg-indigo-50" onPress={() => setShowMonthPicker(true)}>
          <Text className="text-indigo-600 font-bold text-[16px]">{selectedMonth} ▾</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row gap-2 mb-5">
        <TouchableOpacity className="flex-1 bg-amber-500 rounded-lg py-3 px-4" onPress={handleImportMarch2026}>
          <Text className="text-white text-center font-bold">Sync March 2026 Data</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-slate-500 rounded-lg py-3 px-4" onPress={handleCheckCloudData}>
          <Text className="text-white text-center font-bold">Check Cloud Data</Text>
        </TouchableOpacity>
      </View>

      <FlatList style={{minHeight: 50}}
        data={calendarDays}
        horizontal
        keyExtractor={(d) => d.toString()}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: day }) => {
          const isSelected = day === selectedDate.getDate();
          return (
            <TouchableOpacity
              onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
              className={`w-10 h-10 rounded-full justify-center items-center mx-1 ${isSelected ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-slate-800 border border-indigo-700 dark:border-indigo-400'}`}
            >
              <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-gray-800 dark:text-gray-200'}`}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View className="flex-row items-center mb-2 justify-between">
        <TextInput
          className="w-[50%] border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base"
          placeholder="Expense name"
          placeholderTextColor="#9ca3af"
          value={expenseName}
          onChangeText={setExpenseName}
        />
        <TextInput
          className="w-[30%] border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base"
          placeholder="₹ Amount"
          placeholderTextColor="#9ca3af"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity className="w-[10%] aspect-square bg-indigo-600 rounded-lg justify-center items-center" onPress={handleAddExpense}>
          <Text className="text-white text-[22px] leading-6">+</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-5">
        {todayExpenses.length === 0 ? (
          <Text className="text-gray-600 dark:text-gray-400 text-xl font-bold my-5 text-center">No expenses for this day.</Text>
        ) : (
          todayExpenses.map(([name, amt]) => (
            <View key={name} className="flex-row justify-between items-center mb-5 border-b border-gray-100 dark:border-slate-700">
              <Text className="w-[50%] text-xl font-bold dark:text-white" numberOfLines={1}>{name}</Text>
              {editingName === name ? (
                <>
                  <TextInput
                    className="w-[25%] border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg py-3 px-2 text-sm"
                    value={editAmount}
                    onChangeText={setEditAmount}
                    keyboardType="numeric"
                    autoFocus
                  />
                  <TouchableOpacity className="w-[7%] items-center justify-center" onPress={() => handleEditSave(name)}>
                    <FontAwesome name="check" size={18} color="#10B981" />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-[7%] items-center justify-center" onPress={() => setEditingName(null)}>
                    <Entypo name="cross" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text className="w-[25%] text-base font-bold dark:text-gray-200" numberOfLines={1}>₹{amt}</Text>
                  <TouchableOpacity onPress={() => { setEditingName(name); setEditAmount(String(amt)); }} className="w-[7%] items-center justify-center bg-yellow-500 rounded-md aspect-square">
                    <FontAwesome name="edit" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (Platform.OS === 'web') {
                      if (window.confirm(`Delete "${name}"?`)) {
                        handleDeleteExpense(name);
                      }
                    } else {
                      Alert.alert('Delete', `Delete "${name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteExpense(name) }
                      ]);
                    }
                  }} className="w-[7%] items-center justify-center bg-red-500 rounded-md aspect-square">
                    <Entypo name="trash" size={16} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))
        )}
      </View>

      <View className="p-5">
        <Text className="text-2xl font-bold mb-5 dark:text-white">Expenses Summary</Text>
        <View>
          {monthsData.map((item) => (
            <View key={item.id} className="flex-row justify-between py-3.5 border-b border-gray-200 dark:border-slate-700">
              <Text className="text-lg dark:text-gray-200">{item.month} {item.year}</Text>
              <Text className="text-lg font-bold dark:text-white">₹{item.total}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <PieChart data={pieData} total={monthTotal} />
    </ScrollView>
    <PickerModal visible={showYearPicker} title="Select Year" options={allYears} selected={selectedYear} onSelect={changeYear} onClose={() => setShowYearPicker(false)} />
    <PickerModal visible={showMonthPicker} title="Select Month" options={MONTHS} selected={selectedMonth} onSelect={changeMonth} onClose={() => setShowMonthPicker(false)} />
  </SafeAreaView>
  )
}

export default Index;