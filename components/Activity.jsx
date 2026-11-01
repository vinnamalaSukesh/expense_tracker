import { Entypo } from '@expo/vector-icons';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../lib/firebase';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const ACTIVITY_DOC = doc(db, 'appData', 'activity');

async function fetchActivityFile() {
  const snap = await getDoc(ACTIVITY_DOC);
  return snap.exists() ? snap.data() : null;
}

async function saveActivityFile(activity) {
  await setDoc(ACTIVITY_DOC, activity);
}

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

function Activity() {
  const [activityData, setActivityData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wakeupTime, setWakeupTime] = useState('');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchActivityFile();
        if (cancelled) return;
        setActivityData(remote ?? {});
        setDataLoaded(true);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load activity', err);
        setLoadError(err.message ?? 'Failed to load activity.');
        Alert.alert('Load Error', `Could not load your activity from Supabase:\n${err.message}`);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const selectedYear = selectedDate.getFullYear().toString();
  const selectedMonth = selectedDate.toLocaleString('default', { month: 'long' });
  const selectedDay = selectedDate.getDate().toString();

  const dayEntry = activityData[selectedYear]?.[selectedMonth]?.[selectedDay] ?? null;

  useEffect(() => {
    setWakeupTime(dayEntry?.wakeupTime ?? '');
  }, [selectedYear, selectedMonth, selectedDay, dayEntry?.wakeupTime]);

  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dataYears = Object.keys(activityData).map(Number);
  const currentYear = new Date().getFullYear();
  const allYears = Array.from(new Set([...dataYears, currentYear])).sort((a, b) => b - a).map(String);

  const monthData = activityData[selectedYear]?.[selectedMonth] ?? {};
  let successCount = 0;
  let failCount = 0;
  for (const entry of Object.values(monthData)) {
    if (entry?.status === 'success') successCount += 1;
    else if (entry?.status === 'fail') failCount += 1;
  }

  const persistDay = async (patch) => {
    if (!dataLoaded) {
      Alert.alert('Not Ready', 'Still loading your data from Supabase - please wait.');
      return;
    }
    const updatedData = JSON.parse(JSON.stringify(activityData));
    if (!updatedData[selectedYear]) updatedData[selectedYear] = {};
    if (!updatedData[selectedYear][selectedMonth]) updatedData[selectedYear][selectedMonth] = {};
    const existing = updatedData[selectedYear][selectedMonth][selectedDay] ?? {};
    updatedData[selectedYear][selectedMonth][selectedDay] = { ...existing, ...patch };

    setActivityData(updatedData);
    try {
      await saveActivityFile(updatedData);
    } catch {
      Alert.alert('Storage Error', 'Failed to save activity permanently.');
    }
  };

  const handleSaveWakeupTime = () => {
    persistDay({ wakeupTime: wakeupTime.trim() });
  };

  const handleSetStatus = (status) => {
    persistDay({ status: dayEntry?.status === status ? null : status });
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
          <Text className="text-gray-500 dark:text-gray-400 text-sm mb-4">Loading your activity…</Text>
        )}

        <View className="flex-row items-center gap-2 mb-5">
          <TouchableOpacity className="border border-indigo-600 rounded-lg py-1.5 px-3 bg-indigo-50" onPress={() => setShowYearPicker(true)}>
            <Text className="text-indigo-600 font-bold text-[16px]">{selectedYear} ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity className="border border-indigo-600 rounded-lg py-1.5 px-3 bg-indigo-50" onPress={() => setShowMonthPicker(true)}>
            <Text className="text-indigo-600 font-bold text-[16px]">{selectedMonth.slice(0, 3).toUpperCase()} ▾</Text>
          </TouchableOpacity>
          <View className="flex-1" />
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {successCount} success · {failCount} fail
          </Text>
        </View>

        <FlatList
          style={{ minHeight: 50 }}
          data={calendarDays}
          horizontal
          keyExtractor={(d) => d.toString()}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: day }) => {
            const isSelected = day === selectedDate.getDate();
            const entry = monthData[day.toString()];
            const dotColor = entry?.status === 'success' ? 'bg-emerald-500' : entry?.status === 'fail' ? 'bg-red-500' : null;
            return (
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                className={`w-10 h-10 rounded-full justify-center items-center mx-1 ${isSelected ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-slate-800 border border-indigo-700 dark:border-indigo-400'}`}
              >
                <Text className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-gray-800 dark:text-gray-200'}`}>
                  {day}
                </Text>
                {dotColor && <View className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />}
              </TouchableOpacity>
            );
          }}
        />

        <View className="mt-6">
          <Text className="text-lg font-bold dark:text-white mb-3">
            {selectedMonth} {selectedDay}, {selectedYear}
          </Text>

          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1.5">Wakeup time</Text>
          <View className="flex-row items-center gap-2 mb-5">
            <TextInput
              className="flex-1 border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base"
              placeholder="e.g. 06:30"
              placeholderTextColor="#9ca3af"
              value={wakeupTime}
              onChangeText={setWakeupTime}
              onSubmitEditing={handleSaveWakeupTime}
              onBlur={handleSaveWakeupTime}
            />
            <TouchableOpacity className="bg-indigo-600 rounded-lg px-4 py-3" onPress={handleSaveWakeupTime}>
              <Text className="text-white font-bold text-sm">Save</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1.5">Controlled phone use this morning?</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg py-3 border ${dayEntry?.status === 'success' ? 'bg-emerald-600 border-emerald-600' : 'border-emerald-600 bg-emerald-50'}`}
              onPress={() => handleSetStatus('success')}
            >
              <Entypo name="check" size={16} color={dayEntry?.status === 'success' ? '#fff' : '#059669'} />
              <Text className={`font-bold ${dayEntry?.status === 'success' ? 'text-white' : 'text-emerald-600'}`}>Success</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg py-3 border ${dayEntry?.status === 'fail' ? 'bg-red-600 border-red-600' : 'border-red-600 bg-red-50'}`}
              onPress={() => handleSetStatus('fail')}
            >
              <Entypo name="cross" size={16} color={dayEntry?.status === 'fail' ? '#fff' : '#EF4444'} />
              <Text className={`font-bold ${dayEntry?.status === 'fail' ? 'text-white' : 'text-red-500'}`}>Fail</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 p-5">
          <Text className="text-2xl font-bold mb-5 dark:text-white">{selectedMonth} Summary</Text>
          {Object.keys(monthData).length === 0 ? (
            <Text className="text-gray-600 dark:text-gray-400 text-base text-center">No activity logged this month.</Text>
          ) : (
            calendarDays
              .filter((day) => monthData[day.toString()])
              .map((day) => {
                const entry = monthData[day.toString()];
                return (
                  <View key={day} className="flex-row justify-between items-center py-3 border-b border-gray-200 dark:border-slate-700">
                    <Text className="text-base dark:text-gray-200">{selectedMonth} {day}</Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">{entry.wakeupTime || '—'}</Text>
                    <Text className={`text-sm font-bold ${entry.status === 'success' ? 'text-emerald-600' : entry.status === 'fail' ? 'text-red-500' : 'text-gray-400'}`}>
                      {entry.status === 'success' ? 'Success' : entry.status === 'fail' ? 'Fail' : '—'}
                    </Text>
                  </View>
                );
              })
          )}
        </View>
      </ScrollView>
      <PickerModal visible={showYearPicker} title="Select Year" options={allYears} selected={selectedYear} onSelect={changeYear} onClose={() => setShowYearPicker(false)} />
      <PickerModal visible={showMonthPicker} title="Select Month" options={MONTHS} selected={selectedMonth} onSelect={changeMonth} onClose={() => setShowMonthPicker(false)} />
    </SafeAreaView>
  );
}

export default Activity;
