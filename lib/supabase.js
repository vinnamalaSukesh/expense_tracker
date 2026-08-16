import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jlgkkussaiioygieibut.supabase.co';
const supabaseKey = 'sb_publishable_Atc9HpKHqy-2h7ZhlpFzyw_GvP0eXpq';

export const supabase = createClient(supabaseUrl, supabaseKey);
