import React from 'react';
import { View, StyleSheet, useWindowDimensions, ViewProps, StyleProp, ViewStyle } from 'react-native';

interface ResponsiveContainerProps extends ViewProps {
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function ResponsiveContainer({
  children,
  maxWidth = 450,
  style,
  ...props
}: ResponsiveContainerProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <View
      style={[
        styles.container,
        isLargeScreen && { maxWidth, alignSelf: 'center', width: '100%' },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
