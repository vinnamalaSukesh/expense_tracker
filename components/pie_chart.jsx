import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from 'nativewind';

const COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#84CC16','#EC4899','#14B8A6'];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  // Fix minor math precision clipping on a perfect 360-degree loop
  const largeArc = endAngle - startAngle >= 359.9 ? 1 : (endAngle - startAngle > 180 ? 1 : 0);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function PieChart({ data, total }) {
  const [selectedSlice, setSelectedSlice] = useState(null);
  const SIZE = 350, cx = 175, cy = 175, r = 150, innerR = 75;
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  if (!data || !data.length || total === 0) {
    return <Text style={{ color: isDark ? '#9ca3af' : '#aaa', textAlign: 'center', paddingVertical: 24 }}>No expenses this month</Text>;
  }

  let startAngle = 0;
  const slices = data.map((item, i) => {
    const angle = (item.amount / total) * 360;
    const s = { ...item, startAngle, endAngle: startAngle + angle, color: COLORS[i % COLORS.length] };
    startAngle += angle;
    return s;
  });

  const currentSlice = selectedSlice !== null && slices[selectedSlice] ? slices[selectedSlice] : null;

  return (
    <View className="w-full flex items-center justify-center mb-10">
      <Svg width={SIZE} height={SIZE}>
        {slices.map((s, i) => {
          const interactionProps = Platform.OS === 'web' 
            ? {
                onClick: () => setSelectedSlice(selectedSlice === i ? null : i),
                onMouseEnter: () => setSelectedSlice(i),
                onMouseLeave: () => setSelectedSlice(null)
              }
            : {
                onPress: () => setSelectedSlice(selectedSlice === i ? null : i)
              };

          return (
            <G key={i} {...interactionProps}>
              <Path
                d={slicePath(cx, cy, r, s.startAngle, s.endAngle)}
                fill={s.color}
                stroke="#fff"
                strokeWidth={selectedSlice === i ? 4 : 2}
                opacity={selectedSlice !== null && selectedSlice !== i ? 0.5 : 1}
              />
            </G>
          );
        })}

        <G 
          {...(Platform.OS === 'web' 
            ? { onClick: () => setSelectedSlice(null) } 
            : { onPress: () => setSelectedSlice(null) }
          )}
        >
          <Circle cx={cx} cy={cy} r={innerR} fill={isDark ? '#555555' : '#ffffff'} />
        </G>

        <G pointerEvents="none">
          <SvgText x={cx} y={cy - 12} textAnchor="middle" fontSize={11} fontWeight="600" fill={isDark ? '#cbd5e1' : '#666'}>
            {currentSlice ? currentSlice.name : 'Total Spend'}
          </SvgText>
          
          <SvgText x={cx - 12} y={cy + 8} textAnchor="middle" fontSize={16} fontWeight="bold" fill={isDark ? '#fff' : '#111'}>
            ₹  {currentSlice ? currentSlice.amount : total}
          </SvgText>

          {currentSlice && (
            <SvgText x={cx} y={cy + 26} textAnchor="middle" fontSize={12} fontWeight="bold" fill={isDark ? '#818cf8' : '#4F46E5'}>
              {((currentSlice.amount / total) * 100).toFixed(1)}%
            </SvgText>
          )}
        </G>
      </Svg>
    </View>
  );
}