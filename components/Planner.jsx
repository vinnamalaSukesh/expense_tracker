import { Entypo } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const WEEKDAY_TASKS = ["exam prep 1 hour", "exam prep 1 hour"];
const WEEKEND_TASKS = ["exam prep 2.5 hour", "exam prep 2.5 hour"];

const DATA_BUCKET = 'app-data';
const PLANNER_FILE = 'planner.json';

async function fetchPlannerFile() {
  const { data } = supabase.storage.from(DATA_BUCKET).getPublicUrl(PLANNER_FILE);
  const res = await fetch(`${data.publicUrl}?t=${Date.now()}`);
  if (!res.ok) return {};
  return res.json();
}

async function savePlannerFile(planner) {
  const { error } = await supabase.storage
    .from(DATA_BUCKET)
    .upload(PLANNER_FILE, JSON.stringify(planner), { contentType: 'application/json', upsert: true });
  if (error) throw error;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function defaultTasksFor(d) {
  const template = isWeekend(d) ? WEEKEND_TASKS : WEEKDAY_TASKS;
  return template.map((text, i) => ({ id: `${dateKey(d)}-${i}`, text, done: false }));
}

export default function Planner() {
  const [plannerData, setPlannerData] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const remote = await fetchPlannerFile();
        if (cancelled) return;
        setPlannerData(remote);
      } catch (err) {
        console.error('Failed to load planner', err);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const key = dateKey(selectedDate);
  const tasksForDay = plannerData[key] ?? defaultTasksFor(selectedDate);

  const saveTasks = async (tasks) => {
    const updated = { ...plannerData, [key]: tasks };
    setPlannerData(updated);
    try {
      await savePlannerFile(updated);
    } catch (err) {
      console.error('Failed to save planner', err);
    }
  };

  const toggleTask = (id) => {
    saveTasks(tasksForDay.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTask = (id) => {
    saveTasks(tasksForDay.filter((t) => t.id !== id));
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    saveTasks([...tasksForDay, { id: `${key}-${Date.now()}`, text: newTask.trim(), done: false }]);
    setNewTask('');
  };

  const weekDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 3 + i);
    return d;
  });

  const doneCount = tasksForDay.filter((t) => t.done).length;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-slate-900 pb-5" edges={['bottom']}>
      <ScrollView className="flex-1 p-4">
        <Text className="text-xl font-bold dark:text-white mb-4">Daily Planner</Text>

        <FlatList
          style={{ minHeight: 60 }}
          data={weekDays}
          horizontal
          keyExtractor={(d) => dateKey(d)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item: d }) => {
            const selected = dateKey(d) === key;
            return (
              <TouchableOpacity
                onPress={() => setSelectedDate(d)}
                className={`w-14 h-14 rounded-2xl justify-center items-center mx-1 ${selected ? 'bg-indigo-600' : isWeekend(d) ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700' : 'bg-gray-100 dark:bg-slate-800 border border-indigo-700 dark:border-indigo-400'}`}
              >
                <Text className={`text-[11px] ${selected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {d.toLocaleDateString('default', { weekday: 'short' })}
                </Text>
                <Text className={`text-base font-bold ${selected ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View className="flex-row items-center justify-between mt-5 mb-2">
          <Text className="text-lg font-bold dark:text-white">
            {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {doneCount}/{tasksForDay.length} done
          </Text>
        </View>
        <Text className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-4">
          {isWeekend(selectedDate) ? 'Weekend plan' : 'Weekday plan'}
        </Text>

        <View className="mb-5">
          {tasksForDay.length === 0 ? (
            <Text className="text-gray-600 dark:text-gray-400 text-base my-5 text-center">No tasks for this day.</Text>
          ) : (
            tasksForDay.map((task) => (
              <View key={task.id} className="flex-row items-center justify-between mb-3 border-b border-gray-100 dark:border-slate-700 pb-3">
                <TouchableOpacity className="flex-row items-center flex-1" onPress={() => toggleTask(task.id)}>
                  <View className={`w-6 h-6 rounded-md border-2 mr-3 justify-center items-center ${task.done ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-slate-500'}`}>
                    {task.done && <Entypo name="check" size={16} color="#fff" />}
                  </View>
                  <Text
                    className={`text-base flex-1 ${task.done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'}`}
                    numberOfLines={2}
                  >
                    {task.text}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTask(task.id)} className="w-8 h-8 items-center justify-center">
                  <Entypo name="cross" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View className="flex-row items-center gap-2">
          <TextInput
            className="flex-1 border border-gray-300 dark:border-slate-600 dark:text-white rounded-lg p-3 text-base"
            placeholder="Add a task"
            placeholderTextColor="#9ca3af"
            value={newTask}
            onChangeText={setNewTask}
            onSubmitEditing={addTask}
          />
          <TouchableOpacity className="w-12 h-12 bg-indigo-600 rounded-lg justify-center items-center" onPress={addTask}>
            <Text className="text-white text-[22px] leading-6">+</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
