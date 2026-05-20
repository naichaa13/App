import React, { useState, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

const ITEM_H = 44;
const VISIBLE_COUNT = 5;

const MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export default function DateRangePicker({ onRangeChange, initialStart, initialEnd }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentDay = new Date().getDate();

  const [startDate, setStartDate] = useState(initialStart || null);
  const [endDate, setEndDate] = useState(initialEnd || null);
  const [mode, setMode] = useState('single');
  const [visible, setVisible] = useState(false);

  const years = useMemo(() => {
    const arr = [];
    for (let y = 2026; y <= 2030; y++) arr.push(y);
    return arr;
  }, []);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const days = useMemo(() => {
    const arr = [];
    for (let d = 1; d <= 31; d++) arr.push(d);
    return arr;
  }, []);

  const parseDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  };

  const formatDisplay = (str) => {
    if (!str) return '請選擇';
    const { year, month, day } = parseDate(str);
    return `${year}年${month + 1}月${day}日`;
  };

  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selDay, setSelDay] = useState(currentDay);
  const [pickingFor, setPickingFor] = useState('start');

  const yearRef = useRef(null);
  const monthRef = useRef(null);
  const dayRef = useRef(null);

  const validDays = useMemo(() => days.slice(0, getDaysInMonth(selYear, selMonth)), [selYear, selMonth]);

  const centerOffset = Math.floor(VISIBLE_COUNT / 2) * ITEM_H;

  const scrollToIdx = (ref, idx) => {
    if (!ref.current) return;
    ref.current.scrollToOffset({ offset: idx * ITEM_H, animated: false });
  };

  const handleVisibleChange = (isVisible) => {
    setVisible(isVisible);
    if (isVisible) {
      setTimeout(() => {
        const yIdx = years.indexOf(selYear);
        const mIdx = selMonth;
        const dIdx = validDays.indexOf(selDay);
        if (yIdx >= 0) scrollToIdx(yearRef, yIdx);
        if (mIdx >= 0) scrollToIdx(monthRef, mIdx);
        if (dIdx >= 0) scrollToIdx(dayRef, dIdx);
      }, 150);
    }
  };

  const selectDate = () => {
    const dateStr = `${selYear}-${String(selMonth + 1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`;
    if (mode === 'single') {
      setStartDate(dateStr);
      setEndDate(null);
      handleVisibleChange(false);
      setPickingFor('start');
      onRangeChange && onRangeChange({ start: dateStr, end: null });
    } else {
      if (pickingFor === 'start') {
        setStartDate(dateStr);
        setEndDate(null);
        setPickingFor('end');
        setTimeout(() => {
          scrollToIdx(monthRef, selMonth);
          scrollToIdx(dayRef, Math.max(0, validDays.indexOf(selDay)));
        }, 50);
      } else {
        setEndDate(dateStr);
        handleVisibleChange(false);
        setPickingFor('start');
        onRangeChange && onRangeChange({ start: startDate, end: dateStr });
      }
    }
  };

  const handleClear = () => {
    setStartDate(null);
    setEndDate(null);
    onRangeChange && onRangeChange({ start: null, end: null });
  };

  const displayText = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return formatDisplay(startDate);
      return `${formatDisplay(startDate)} ~ ${formatDisplay(endDate)}`;
    }
    if (startDate) return `從 ${formatDisplay(startDate)}`;
    return mode === 'range' ? '選擇日期區間' : '選擇日期';
  };

  const handleModeChange = (newMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      handleClear();
    }
  };

  const pickerStyles = { height: ITEM_H * VISIBLE_COUNT };

  const renderPicker = (data, value, onChange, label) => {
    const padStyle = { paddingVertical: centerOffset };
    const isSelected = (val) => {
      if (label === '月') return val === value;
      if (label === '日') return val === value;
      return val === value;
    };
    const fmtItem = (item) => {
      if (label === '月') return `${item + 1}月`;
      if (label === '日') return `${item}日`;
      return item;
    };
    const isThisYear = label === '年';
    const isThisMonth = label === '月';
    const isThisDay = label === '日';
    const ref = isThisYear ? yearRef : isThisMonth ? monthRef : dayRef;
    return (
      <View style={[s.pickerCol, pickerStyles]}>
        <Text style={s.pickerLabel}>{label}</Text>
        <View style={s.pickerWrapper}>
          <FlatList
            ref={ref}
            data={data}
            keyExtractor={(_, i) => String(i)}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_H}
            decelerationRate="fast"
            contentContainerStyle={padStyle}
            getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
            onMomentumScrollEnd={(e) => {
              const rawIdx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
              const clamped = Math.max(0, Math.min(rawIdx, data.length - 1));
              const newVal = data[clamped];
              if (newVal !== value) onChange(newVal);
            }}
            renderItem={({ item }) => {
              const active = item === value;
              return (
                <View style={[s.pickerItem, active && s.pickerItemActive]}>
                  <Text style={[s.pickerItemText, active && s.pickerItemTextActive]}>
                    {fmtItem(item)}
                  </Text>
                </View>
              );
            }}
          />
          <View style={s.pickerHighlight} pointerEvents="none" />
        </View>
      </View>
    );
  };

  return (
    <View>
      <TouchableOpacity style={s.trigger} onPress={() => handleVisibleChange(true)}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={[s.triggerText, (startDate || endDate) && s.triggerTextActive]}>
          {displayText()}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSub} />
      </TouchableOpacity>

      <View style={s.modeRow}>
        <TouchableOpacity
          style={[s.modeBtn, mode === 'single' && s.modeBtnActive]}
          onPress={() => handleModeChange('single')}>
          <Text style={[s.modeBtnText, mode === 'single' && s.modeBtnTextActive]}>單一日期</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeBtn, mode === 'range' && s.modeBtnActive]}
          onPress={() => handleModeChange('range')}>
          <Text style={[s.modeBtnText, mode === 'range' && s.modeBtnTextActive]}>日期區間</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={visible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleVisibleChange(false)} />
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {mode === 'range' ? `選擇${pickingFor === 'start' ? '開始' : '結束'}日期` : '選擇日期'}
              </Text>
              <TouchableOpacity onPress={() => handleVisibleChange(false)}>
                <Ionicons name="close" size={24} color={colors.textSub} />
              </TouchableOpacity>
            </View>

            <View style={s.pickerRow}>
              {renderPicker(years, selYear, setSelYear, '年')}
              {renderPicker(MONTHS, selMonth, setSelMonth, '月')}
              {renderPicker(validDays, selDay, setSelDay, '日')}
            </View>

            <View style={s.actionRow}>
              <TouchableOpacity style={s.clearBtn} onPress={handleClear}>
                <Text style={s.clearBtnText}>清除</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={selectDate}>
                <Text style={s.confirmBtnText}>確認</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryBg, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary,
  },
  triggerText: { fontSize: 14, color: colors.textSub },
  triggerTextActive: { color: colors.primary, fontWeight: '600' },

  modeRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { fontSize: 13, color: colors.textSub },
  modeBtnTextActive: { color: '#fff', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  pickerRow: { flexDirection: 'row', marginBottom: 20 },
  pickerCol: { flex: 1, alignItems: 'center' },
  pickerLabel: { fontSize: 13, color: colors.textSub, marginBottom: 8, fontWeight: '600' },
  pickerWrapper: { flex: 1, width: '100%' },
  pickerItem: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  pickerItemActive: { backgroundColor: colors.primaryBg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary },
  pickerItemText: { fontSize: 15, color: colors.text },
  pickerItemTextActive: { color: colors.primary, fontWeight: '700' },
  pickerHighlight: { display: 'none' },

  actionRow: { flexDirection: 'row', gap: 12 },
  clearBtn: { flex: 1, paddingVertical: 14, borderRadius: radius.md, backgroundColor: '#F1F5F9', alignItems: 'center' },
  clearBtnText: { fontSize: 15, color: colors.textSub, fontWeight: '600' },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});
