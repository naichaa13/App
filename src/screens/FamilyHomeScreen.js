import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { colors, radius, shadow, text } from '../theme';
import DateRangePicker from '../components/DateRangePicker';

const ITEM_ICONS = {
  '飲食': '🍽️', '用藥': '💊', '清潔': '🛁', '活動': '🚶', '睡眠': '😴', '其他': '📝'
};
const getItemIcon = (meals) => ITEM_ICONS[meals] || '📋';

const QUICK_BTNS = [
  { label: '異常統計', icon: '📈', route: 'AbnormalStats',       color: colors.primary, bg: colors.primaryBg },
  { label: '異常紀錄', icon: '📊', route: 'AbnormalList',       color: colors.danger,  bg: colors.dangerBg },
  { label: '提醒清單', icon: '📋', route: 'FamilyReminderList', color: colors.success, bg: colors.successBg },
];

export default function FamilyHomeScreen({ navigation }) {
  const [records, setRecords]       = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  const fetchRecords = async () => {
    try {
      const res = await client.get('/care-records');
      setRecords(res.data); setFiltered(res.data);
    } catch { console.error('抓取失敗'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchRecords(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchRecords(); };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (!range.start) {
      setFiltered(records);
    } else {
      const filtered = records.filter(r => {
        const d = new Date(r.createdAt);
        const start = new Date(range.start);
        const end = range.end ? new Date(range.end) : new Date(range.start);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      });
      setFiltered(filtered);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={s.card} activeOpacity={0.8}
      onPress={() => navigation.navigate('RecordDetail', { record: item })}>
      <View style={s.cardTop}>
        <Text style={s.cardTitle} numberOfLines={1}>{getItemIcon(item.meals)} {item.meals || '未填寫'}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
      <Text style={s.cardNote} numberOfLines={1}>📝 {item.note || '無詳細內容'}</Text>
      <Text style={s.cardTime}>{new Date(item.createdAt).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* 快速按鈕 */}
      <View style={s.quickRow}>
        {QUICK_BTNS.map(btn => (
          <TouchableOpacity key={btn.route} style={[s.quickBtn, { backgroundColor: btn.bg }]}
            onPress={() => navigation.navigate(btn.route)}>
            <Text style={s.quickIcon}>{btn.icon}</Text>
            <Text style={[s.quickLabel, { color: btn.color }]}>{btn.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 日期區間篩選 */}
      <View style={s.filterBar}>
        <DateRangePicker onRangeChange={handleDateRangeChange} />
      </View>

      <Text style={s.sectionLabel}>
        {dateRange.start
          ? `（${dateRange.start}${dateRange.end && dateRange.end !== dateRange.start ? ` ~ ${dateRange.end}` : ''}）`
          : `（${records.length} 筆記錄）`}
      </Text>

      {loading ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} /> : (
        <FlatList data={filtered} keyExtractor={i => i._id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={s.empty}>此日期沒有照護紀錄</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  quickRow:   { flexDirection: 'row', backgroundColor: colors.card, padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  quickBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: radius.md },
  quickIcon:  { fontSize: 18 },
  quickLabel: { fontSize: 13, fontWeight: '700' },

  filterBar:  { backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  sectionLabel: { ...text.sm, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  card:       { backgroundColor: colors.card, borderRadius: radius.md, padding: 15, marginBottom: 12, ...shadow.sm },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle:  { ...text.h3, flex: 1 },
  cardNote:   { ...text.body, color: colors.textSub, marginBottom: 8 },
  cardTime:   { ...text.xs, textAlign: 'right' },
  empty:      { textAlign: 'center', marginTop: 50, color: colors.textMuted, fontSize: 15 },
});
