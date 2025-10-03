import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ReplayButtonProps {
  label?: string;
  onPress: () => void;
}

function ReplayButtonComponent({ label = 'Replay video', onPress }: ReplayButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#1e293b',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export const ReplayButton = memo(ReplayButtonComponent);
