import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Mascot } from '../../src/components/mascot/Mascot';
import { MASCOT_POSES, POSES } from '../../src/components/mascot/poses';
import { CelebrationSheet } from '../../src/components/mascot/CelebrationSheet';
import { haptics } from '../../src/utils/haptics';

describe('Mascot', () => {
  it.each(MASCOT_POSES)('dibuja la pose "%s" y la anuncia', async (pose) => {
    await render(<Mascot pose={pose} testID="moni" />);
    expect(screen.getByTestId('moni').props.accessibilityLabel).toBe(`Moni ${POSES[pose].label}`);
  });

  it('decorativa: no se anuncia', async () => {
    await render(<Mascot pose="descansando" decorative testID="moni" />);
    const moni = screen.getByTestId('moni', { includeHiddenElements: true });
    expect(moni.props.accessibilityLabel).toBeUndefined();
    expect(moni.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('al tocarla vibra y avisa', async () => {
    const light = jest.spyOn(haptics, 'light').mockImplementation(() => {});
    const onPress = jest.fn();
    await render(<Mascot pose="saludando" interactive onPress={onPress} testID="moni" />);
    fireEvent.press(screen.getByTestId('moni'));
    expect(light).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
    light.mockRestore();
  });
});

describe('CelebrationSheet', () => {
  it('muestra el logro y ejecuta la acción', async () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    await render(
      <CelebrationSheet visible title="¡Meta completada!" message="Lograste ahorrar $500.000" actionLabel="Compartir" onAction={onAction} onClose={onClose} />,
    );
    expect(screen.getByText('¡Meta completada!')).toBeTruthy();
    fireEvent.press(screen.getByText('Compartir'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });
});
