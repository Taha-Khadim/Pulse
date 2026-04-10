import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onResume: () => void;
  onHome: () => void;
  textColor: string;
  mutedColor: string;
};

export const PauseOverlay = ({ visible, onResume, onHome, textColor, mutedColor }: Props) => {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.back, { paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: textColor }]}>Paused</Text>
        <Pressable onPress={onResume} style={[styles.btn, { borderColor: textColor }]}>
          <Text style={[styles.btnText, { color: textColor }]}>Resume</Text>
        </Pressable>
        <Pressable onPress={onHome} style={{ marginTop: 16 }}>
          <Text style={{ color: mutedColor, fontSize: 15 }}>Home</Text>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  back: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: '300', marginBottom: 28 },
  btn: { paddingHorizontal: 40, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  btnText: { letterSpacing: 3 },
});
