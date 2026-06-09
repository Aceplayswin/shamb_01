import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing } from '../theme';

export function PasswordInput({ label, error, style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.textDim}
          style={[styles.input, styles.inputWithToggle, error && styles.inputError, style]}
          secureTextEntry={!visible}
          {...props}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Icon
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textDim}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.surface700,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: 48,
  },
  toggle: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.red,
  },
  error: {
    color: colors.red,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
