import { Entypo, FontAwesome } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import PieChart from './pie_chart';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
// Starter categories; more can be added on the fly from the type picker.
const SEED_TYPES = ['Food', 'Fruits', 'Snacks', 'Curd', 'Grocery', 'Travel', 'Education', 'Shopping', 'Entertainment', 'Recharge', 'Cycle'];

const DATA_BUCKET = 'app-data';
const EXPENSES_FILE = 'expenses.json';

// Expenses were plain numbers before the "type" column was added; these
// helpers keep old entries readable instead of crashing on `.amount`.
function getAmount(entry) {
  return typeof entry === 'number' ? entry : entry.amount;
}
function getType(entry) {
  return typeof entry === 'number' ? null : entry.type ?? null;
}

async function fetchExpensesFile() {
  const { data } = supabase.storage.from(DATA_BUCKET).getPublicUrl(EXPENSES_FILE);
  const res = await fetch(`${data.publicUrl}?t=${Date.now()}`);
  if (res.ok) return res.json();
  // Supabase Storage returns this exact body for a genuinely missing object.
  // Any other failure (network blip, 5xx, etc.) must throw - treating it as
  // "no file yet" is what previously caused a silent overwrite of real data.
  const body = await res.json().catch(() => null);
  if (res.status === 400 && body?.code === 'NoSuchKey') return null;
  throw new Error(`Failed to fetch expenses (status ${res.status}): ${body?.message ?? 'unknown error'}`);
}

async function saveExpensesFile(expenses) {
  const { error } = await supabase.storage
    .from(DATA_BUCKET)
    .upload(EXPENSES_FILE, JSON.stringify(expenses), { contentType: 'application/json', upsert: true });
  if (error) throw error;
}

function PickerModal({ visible, title, options, selected, onSelect, onClose, allowCustom, onAddCustom }) {
  const [customText, setCustomText] = useState('');

  const submitCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onAddCustom(trimmed);
    setCustomText('');
    onClose();
  };

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
          {allowCustom && (
            <View className="flex-row items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-slate-700">
              <TextInput
                className="flex-1 border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg py-2 px-2.5 text-sm"
                placeholder="New category"
                placeholderTextColor="#9ca3af"
                value={customText}
                onChangeText={setCustomText}
                onSubmitEditing={submitCustom}
              />
              <TouchableOpacity className="bg-indigo-600 rounded-lg px-3 py-2" onPress={submitCustom}>
                <Text className="text-white font-bold text-sm">Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function Index() {
  const [expensesData, setExpensesData] = useState({});
  const monthsData = [];
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState(SEED_TYPES[0]);
  const [extraTypes, setExtraTypes] = useState([]);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const usedTypes = new Set();
  for (const months of Object.values(expensesData)) {
    for (const days of Object.values(months)) {
      for (const dayExpenses of Object.values(days)) {
        for (const entry of Object.values(dayExpenses)) {
          const t = getType(entry);
          if (t) usedTypes.add(t);
        }
      }
    }
  }
  const allTypes = Array.from(new Set([...SEED_TYPES, ...usedTypes, ...extraTypes])).sort();

  const addCustomType = (newType) => {
    setExtraTypes((prev) => (prev.includes(newType) ? prev : [...prev, newType]));
    setType(newType);
  };

  const dataYears = Object.keys(expensesData).map(Number);
  const currentYear = new Date().getFullYear();
  const allYears = Array.from(new Set([...dataYears, currentYear])).sort((a, b) => b - a).map(String);

  // Loads expenses.json from Supabase Storage. No local fallback: if this
  // fails, dataLoaded stays false so nothing can be saved (which would
  // overwrite the cloud file) until a real load succeeds.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchExpensesFile();
        if (cancelled) return;
        setExpensesData(remote ?? {});
        setDataLoaded(true);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load expenses', err);
        setLoadError(err.message ?? 'Failed to load expenses.');
        Alert.alert('Load Error', `Could not load your expenses from Supabase:\n${err.message}`);
      }
    })();

    return () => { cancelled = true; };
  }, []);

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
      for (const [, expenses] of Object.entries(days)) {
        for (const [, entry] of Object.entries(expenses)) {
          total += getAmount(entry);
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
    if (!dataLoaded) {
      Alert.alert('Not Ready', 'Still loading your data from Supabase - please wait before adding an expense.');
      return;
    }
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

    updatedData[selectedYear][selectedMonth][selectedDay][expenseName.trim()] = { amount: numericAmount, type };

    setExpensesData(updatedData); // Update UI
    setExpenseName('');
    setAmount('');

    // Save permanently to the cloud
    try {
      await saveExpensesFile(updatedData);
    } catch {
      Alert.alert('Storage Error', 'Failed to save expense permanently.');
    }
  };

  const monthlyExpenseMap = {};
  const typeTotals = {};
  let monthTotal = 0;
  const monthData = (expensesData)[selectedYear]?.[selectedMonth] ?? {};
  for (const [, expenses] of Object.entries(monthData)) {
    for (const [name, entry] of Object.entries(expenses)) {
      const amt = getAmount(entry);
      const entryType = getType(entry) ?? 'Unknown';
      monthlyExpenseMap[name] = (monthlyExpenseMap[name] ?? 0) + amt;
      typeTotals[entryType] = (typeTotals[entryType] ?? 0) + amt;
      monthTotal += amt;
    }
  }
  const pieData = Object.entries(monthlyExpenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const typeData = Object.entries(typeTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const handleExportMonth = async () => {
    if (Object.keys(monthData).length === 0) {
      Alert.alert('Nothing to Export', `No expenses found for ${selectedMonth} ${selectedYear}.`);
      return;
    }
    try {
      const fileName = `${selectedYear}-${selectedMonth}.json`;
      const file = new FileSystem.File(FileSystem.Paths.cache, fileName);
      file.create({ overwrite: true });
      file.write(JSON.stringify(monthData, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: fileName });
      } else {
        Alert.alert('Sharing Unavailable', `Exported to ${file.uri}`);
      }
    } catch (error) {
      Alert.alert('Export Error', error.message ?? 'Failed to export expenses.');
    }
  };

  const handleDeleteExpense = async (name) => {
    if (!dataLoaded) {
      Alert.alert('Not Ready', 'Still loading your data from Supabase - please wait before deleting an expense.');
      return;
    }
    const updatedData = JSON.parse(JSON.stringify(expensesData));
    if (updatedData[selectedYear]?.[selectedMonth]?.[selectedDay]) {
      delete updatedData[selectedYear][selectedMonth][selectedDay][name];
    }
    setExpensesData(updatedData);
    try {
      await saveExpensesFile(updatedData);
    } catch {
      Alert.alert('Storage Error', 'Failed to delete expense.');
    }
  };
  const [editingName, setEditingName] = useState(null);
  const [editAmount, setEditAmount] = useState('');

  const handleEditSave = async (oldName) => {
    if (!dataLoaded) {
      Alert.alert('Not Ready', 'Still loading your data from Supabase - please wait before editing an expense.');
      return;
    }
    const numericAmount = parseFloat(editAmount);
    if (isNaN(numericAmount)) return;
    const updatedData = JSON.parse(JSON.stringify(expensesData));
    const existingEntry = updatedData[selectedYear][selectedMonth][selectedDay][oldName];
    updatedData[selectedYear][selectedMonth][selectedDay][oldName] = {
      amount: numericAmount,
      type: getType(existingEntry),
    };
    setExpensesData(updatedData);
    setEditingName(null);
    try {
      await saveExpensesFile(updatedData);
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

  return (
  <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 pb-5" edges={['bottom']}>
    <ScrollView className="flex-1 p-4">
      {loadError && (
        <View className="bg-red-100 dark:bg-red-900/40 border border-red-400 dark:border-red-700 rounded-lg p-3 mb-4">
          <Text className="text-red-700 dark:text-red-300 font-bold">Could not load your data</Text>
          <Text className="text-red-700 dark:text-red-300 text-sm mt-1">{loadError}</Text>
        </View>
      )}
      {!dataLoaded && !loadError && (
        <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4">Loading your expenses…</Text>
      )}
      <View className="flex-row items-center gap-2 mb-5">
        <TouchableOpacity className="border border-indigo-600 rounded-lg py-1.5 px-3 bg-indigo-50" onPress={() => setShowYearPicker(true)}>
          <Text className="text-indigo-600 font-bold text-[16px]">{selectedYear} ▾</Text>
        </TouchableOpacity>
        <TouchableOpacity className="border border-indigo-600 rounded-lg py-1.5 px-3 bg-indigo-50" onPress={() => setShowMonthPicker(true)}>
          <Text className="text-indigo-600 font-bold text-[16px]">{selectedMonth.slice(0, 3).toUpperCase()} ▾</Text>
        </TouchableOpacity>
        <View className="flex-1" />
        <TouchableOpacity className="border border-emerald-600 rounded-lg p-2 bg-emerald-50" onPress={handleExportMonth}>
          <Entypo name="share" size={18} color="#059669" />
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

      <View className="flex-row items-center gap-2 mb-2">
        <TextInput
          className="flex-1 border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base"
          placeholder="Expense name"
          placeholderTextColor="#9ca3af"
          value={expenseName}
          onChangeText={setExpenseName}
        />
        <TouchableOpacity className="border border-emerald-600 rounded-lg px-2 py-3 bg-emerald-50" onPress={() => setShowTypePicker(true)}>
          <Text className="text-emerald-600 font-bold text-xs" numberOfLines={1}>{type} ▾</Text>
        </TouchableOpacity>
        <TextInput
          className="w-20 border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base"
          placeholder="₹ Amt"
          placeholderTextColor="#9ca3af"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity className="w-10 h-10 bg-indigo-600 rounded-lg justify-center items-center" onPress={handleAddExpense}>
          <Text className="text-white text-[22px] leading-6">+</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-5">
        {todayExpenses.length === 0 ? (
          <Text className="text-gray-600 dark:text-gray-400 text-xl font-bold my-5 text-center">No expenses for this day.</Text>
        ) : (
          todayExpenses.map(([name, entry]) => {
            const amt = getAmount(entry);
            const entryType = getType(entry);
            return (
            <View key={name} className="flex-row justify-between items-center mb-5 border-b border-gray-100 dark:border-slate-700">
              <View className="w-[50%]">
                <Text className="text-xl font-bold dark:text-white" numberOfLines={1}>{name}</Text>
                {entryType && <Text className="text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>{entryType}</Text>}
              </View>
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
            );
          })
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

      <View className="p-5">
        <Text className="text-2xl font-bold mb-5 dark:text-white">By Type ({selectedMonth})</Text>
        <View>
          {typeData.length === 0 ? (
            <Text className="text-gray-600 dark:text-gray-400 text-base text-center">No expenses this month.</Text>
          ) : (
            typeData.map((item) => (
              <View key={item.name} className="flex-row justify-between py-3.5 border-b border-gray-200 dark:border-slate-700">
                <Text className="text-lg dark:text-gray-200">{item.name}</Text>
                <Text className="text-lg font-bold dark:text-white">₹{item.amount}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
    <PickerModal visible={showYearPicker} title="Select Year" options={allYears} selected={selectedYear} onSelect={changeYear} onClose={() => setShowYearPicker(false)} />
    <PickerModal visible={showMonthPicker} title="Select Month" options={MONTHS} selected={selectedMonth} onSelect={changeMonth} onClose={() => setShowMonthPicker(false)} />
    <PickerModal
      visible={showTypePicker}
      title="Select Type"
      options={allTypes}
      selected={type}
      onSelect={setType}
      onClose={() => setShowTypePicker(false)}
      allowCustom
      onAddCustom={addCustomType}
    />
  </SafeAreaView>
  )
}

export default Index;