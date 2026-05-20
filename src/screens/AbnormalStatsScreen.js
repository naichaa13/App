import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import DateRangePicker from '../components/DateRangePicker';

export default function AbnormalStatsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  const fetchEvents = async () => {
    try {
      const response = await client.get('/api/abnormal-events');
      setEvents(response.data);
    } catch (error) {
      console.error("抓取異常失敗:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchEvents(); };

  // 过滤日期范围内的数据
  const filteredEvents = dateRange.start
    ? events.filter(e => {
        const d = new Date(e.createdAt);
        const start = new Date(dateRange.start);
        const end = dateRange.end ? new Date(dateRange.end) : new Date(dateRange.start);
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);
        return d >= start && d <= end;
      })
    : events;

  // 统计
  const total = filteredEvents.length;
  const handled = filteredEvents.filter(e => e.isHandled).length;
  const unhandled = total - handled;
  const urgent = filteredEvents.filter(e => e.severity === '緊急').length;
  const notice = filteredEvents.filter(e => e.severity === '注意').length;
  const mild = filteredEvents.filter(e => e.severity === '輕微').length;

  // 按月统计 - 跌倒/受傷 和 生理異常
  const monthlyStats = filteredEvents.reduce((acc, e) => {
    const d = new Date(e.createdAt);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${month}`;
    if (!acc[key]) {
      acc[key] = {
        year,
        month,
        label: `${month}月`,
        total: 0,
        fall: 0,
        health: 0,
        emotion: 0,
        diet: 0,
        other: 0
      };
    }
    acc[key].total++;
    if (e.type === '跌倒/受傷') acc[key].fall++;
    else if (e.type === '生理異常') acc[key].health++;
    else if (e.type === '情緒/行為') acc[key].emotion++;
    else if (e.type === '飲食/排泄') acc[key].diet++;
    else acc[key].other++;
    return acc;
  }, {});

  // 按年月排序
  const monthlyData = Object.entries(monthlyStats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12); // 最近12个月

  const maxCount = Math.max(...monthlyData.map(m => m[1].total), 1);

  // 类型统计
  const typeCounts = filteredEvents.reduce((acc, e) => {
    const t = e.type || e.eventType || '未知';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4d4f" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>異常統計分析</Text>

      {/* 日期筛选 */}
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>📅 選擇統計區間</Text>
        <DateRangePicker onRangeChange={setDateRange} />
      </View>

      {/* 总览卡片 */}
      <View style={styles.overviewRow}>
        <View style={[styles.overviewCard, { backgroundColor: '#fff2f0' }]}>
          <Text style={styles.overviewNum}>{total}</Text>
          <Text style={styles.overviewLabel}>總異常數</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: '#f6ffed' }]}>
          <Text style={[styles.overviewNum, { color: '#52c41a' }]}>{handled}</Text>
          <Text style={styles.overviewLabel}>已處理</Text>
        </View>
        <View style={[styles.overviewCard, { backgroundColor: '#fff7e6' }]}>
          <Text style={[styles.overviewNum, { color: '#faad14' }]}>{unhandled}</Text>
          <Text style={styles.overviewLabel}>未處理</Text>
        </View>
      </View>

      {/* 📊 月度異常長條圖 - 水平堆疊 */}
      {monthlyData.length > 0 && (
        <View style={styles.barChartSection}>
          <Text style={styles.sectionTitle}>📊 月度異常次數比較</Text>
          <Text style={styles.chartSubtitle}>全部異常事件類型</Text>

          {/* 水平堆疊長條圖 */}
          <View style={styles.horizontalChartContainer}>
            {monthlyData.map(([key, data]) => {
              const total = data.fall + data.health + data.emotion + data.diet + data.other;
              if (total === 0) return null;
              
              return (
                <View key={key} style={styles.horizontalBarRow}>
                  <Text style={styles.horizontalLabel}>{data.label}</Text>
                  <View style={styles.horizontalBarBg}>
            {data.fall > 0 && (
              <View style={[styles.horizontalSegment, { backgroundColor: '#e74c3c', flex: data.fall }]} />
            )}
            {data.health > 0 && (
              <View style={[styles.horizontalSegment, { backgroundColor: '#3498db', flex: data.health }]} />
            )}
                    {data.emotion > 0 && (
                      <View style={[styles.horizontalSegment, { backgroundColor: '#fa8c16', flex: data.emotion }]} />
                    )}
                    {data.diet > 0 && (
                      <View style={[styles.horizontalSegment, { backgroundColor: '#52c41a', flex: data.diet }]} />
                    )}
                    {data.other > 0 && (
                      <View style={[styles.horizontalSegment, { backgroundColor: '#8c8c8c', flex: data.other }]} />
                    )}
                  </View>
                  <Text style={styles.horizontalValue}>{total}</Text>
                </View>
              );
            })}
          </View>

          {/* 圖例 */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.legendText}>跌倒/受傷</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3498db' }]} />
              <Text style={styles.legendText}>生理異常</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#fa8c16' }]} />
              <Text style={styles.legendText}>情緒/行為</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#52c41a' }]} />
              <Text style={styles.legendText}>飲食/排泄</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#8c8c8c' }]} />
              <Text style={styles.legendText}>其他</Text>
            </View>
          </View>

          {/* 詳細統計表 */}
          <View style={styles.statsTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>月份</Text>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>總次數</Text>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>跌倒</Text>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>生理</Text>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>情緒</Text>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>飲食</Text>
              <Text style={styles.tableHeaderCell} numberOfLines={1}>其他</Text>
            </View>
            {monthlyData.slice().reverse().map(([key, data]) => (
              <View key={key} style={styles.tableRow}>
                <Text style={styles.tableCell} numberOfLines={1}>{data.label}</Text>
                <Text style={[styles.tableCell, { fontWeight: '700' }]} numberOfLines={1}>{data.total}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{data.fall}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{data.health}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{data.emotion}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{data.diet}</Text>
                <Text style={styles.tableCell} numberOfLines={1}>{data.other}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 严重程度分布 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔴 嚴重程度分布</Text>
        <View style={styles.severityRow}>
          <View style={[styles.severityCard, { borderColor: '#ff4d4f', backgroundColor: '#fff2f0' }]}>
            <Ionicons name="alert-circle" size={24} color="#ff4d4f" />
            <Text style={[styles.severityNum, { color: '#ff4d4f' }]}>{urgent}</Text>
            <Text style={styles.severityLabel}>緊急</Text>
          </View>
          <View style={[styles.severityCard, { borderColor: '#faad14', backgroundColor: '#fff7e6' }]}>
            <Ionicons name="warning" size={24} color="#faad14" />
            <Text style={[styles.severityNum, { color: '#faad14' }]}>{notice}</Text>
            <Text style={styles.severityLabel}>注意</Text>
          </View>
          <View style={[styles.severityCard, { borderColor: '#52c41a', backgroundColor: '#f6ffed' }]}>
            <Ionicons name="information-circle" size={24} color="#52c41a" />
            <Text style={[styles.severityNum, { color: '#52c41a' }]}>{mild}</Text>
            <Text style={styles.severityLabel}>輕微</Text>
          </View>
        </View>
      </View>

      {/* 类型排行 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 異常類型排行</Text>
        {topTypes.length === 0 ? (
          <Text style={styles.empty}>暫無數據</Text>
        ) : (
          topTypes.map(([type, count], index) => (
            <View key={type} style={styles.typeRow}>
              <View style={styles.typeRank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
              <Text style={styles.typeName} numberOfLines={1}>{type}</Text>
              <View style={styles.typeBarBg}>
                <View
                  style={[
                    styles.typeBar,
                    { width: `${(count / total) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.typeCount}>{count}</Text>
            </View>
          ))
        )}
      </View>

      {/* 处理率 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ 處理率</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: total > 0 ? `${(handled / total) * 100}%` : '0%' }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {total > 0 ? Math.round((handled / total) * 100) : 0}%
          </Text>
        </View>
        <Text style={styles.progressSub}>
          {handled} / {total} 筆已處理
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbfb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffbfb' },
  content: { padding: 16 },

  title: { fontSize: 22, fontWeight: 'bold', color: '#262626', marginBottom: 16, textAlign: 'center' },

  filterCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#595959', marginBottom: 10 },

  overviewRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  overviewCard: { flex: 1, marginHorizontal: 4, padding: 15, borderRadius: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1 },
  overviewNum: { fontSize: 28, fontWeight: 'bold', color: '#262626', marginTop: 8 },
  overviewLabel: { fontSize: 12, color: '#8c8c8c', marginTop: 4 },

  // 📊 長條圖樣式
  barChartSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#262626', marginBottom: 4 },
  chartSubtitle: { fontSize: 13, color: '#8c8c8c', marginBottom: 16 },

  // 📊 水平堆疊長條圖
  horizontalChartContainer: { marginBottom: 16 },
  horizontalBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  horizontalLabel: { width: 45, fontSize: 13, color: '#595959', fontWeight: '600' },
  horizontalBarBg: { flex: 1, height: 24, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  horizontalSegment: { height: '100%' },
  horizontalValue: { width: 35, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#262626', marginLeft: 8 },

  // 舊的長條圖樣式（保留以防需要）
  stackedChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 150, marginBottom: 12, paddingHorizontal: 8 },
  stackedBarWrapper: { alignItems: 'center', flex: 1 },
  stackedTotal: { fontSize: 12, fontWeight: '700', color: '#595959', marginBottom: 4 },
  stackedBarOuter: { width: 28, height: 100, borderRadius: 4, overflow: 'hidden', flexDirection: 'column' },
  stackedSegment: { width: '100%' },
  stackedMonth: { fontSize: 11, color: '#8c8c8c', marginTop: 6, fontWeight: '600' },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendColor: { width: 14, height: 14, borderRadius: 3 },
  legendText: { fontSize: 12, color: '#595959' },

  // 詳細統計表
  statsTable: { borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden', marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#fafafa', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tableHeaderCell: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#595959' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  tableCell: { flex: 1, textAlign: 'center', fontSize: 11, color: '#262626' },

  section: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1 },

  severityRow: { flexDirection: 'row', justifyContent: 'space-around' },
  severityCard: { alignItems: 'center', borderRadius: 12, padding: 15, borderWidth: 2, minWidth: 90 },
  severityNum: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  severityLabel: { fontSize: 13, color: '#595959', marginTop: 4 },

  typeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  typeRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ff4d4f', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  typeName: { flex: 1, fontSize: 14, color: '#262626' },
  typeBarBg: { flex: 1, height: 12, backgroundColor: '#f0f0f0', borderRadius: 6, marginHorizontal: 8, overflow: 'hidden' },
  typeBar: { height: '100%', backgroundColor: '#ff4d4f', borderRadius: 6 },
  typeCount: { width: 30, textAlign: 'right', fontSize: 14, fontWeight: 'bold', color: '#ff4d4f' },

  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressBg: { flex: 1, height: 16, backgroundColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#52c41a', borderRadius: 8 },
  progressText: { fontSize: 20, fontWeight: 'bold', color: '#52c41a', marginLeft: 12, width: 50 },
  progressSub: { fontSize: 12, color: '#8c8c8c', textAlign: 'center' },

  empty: { textAlign: 'center', color: '#bfbfbf', fontSize: 14, marginTop: 20 }
});
