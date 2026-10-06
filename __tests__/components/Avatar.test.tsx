import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Avatar, initialsOf, defaultAvatarColor } from '../../src/components/ui/Avatar';
import { AvatarEditorSheet } from '../../src/components/AvatarEditorSheet';
import { getProfiles, onProfilesChanged, updateProfileAvatar } from '../../src/services/profiles';
import { PASTEL_LIST } from '../../src/constants/theme';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

describe('Avatar', () => {
  it('iniciales de hasta dos palabras', () => {
    expect(initialsOf('Camilo Martínez Ruiz')).toBe('CM');
    expect(initialsOf('ana')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
  });

  it('el color por defecto es un pastel y no cambia para el mismo perfil', () => {
    expect(PASTEL_LIST).toContain(defaultAvatarColor('profile-123'));
    expect(defaultAvatarColor('profile-123')).toBe(defaultAvatarColor('profile-123'));
  });

  it('pinta iniciales, emoji o la vista previa de la foto', async () => {
    const base = { id: 'p1', name: 'Laura Gómez' };
    const { rerender } = await render(<Avatar profile={{ ...base, avatarType: 'initials' }} />);
    expect(screen.getByText('LG', { includeHiddenElements: true })).toBeTruthy();

    await rerender(<Avatar profile={{ ...base, avatarType: 'emoji', avatarEmoji: '🦊' }} />);
    expect(screen.getByText('🦊', { includeHiddenElements: true })).toBeTruthy();

    await rerender(<Avatar profile={{ ...base, avatarType: 'photo' }} previewUri="file:///tmp/foto.jpg" />);
    expect(screen.getByTestId('avatar-photo', { includeHiddenElements: true }).props.source).toEqual({ uri: 'file:///tmp/foto.jpg' });
  });
});

describe('avatar del perfil', () => {
  it('se guarda en el perfil y avisa a las pantallas abiertas', async () => {
    const listener = jest.fn();
    const unsubscribe = onProfilesChanged(listener);
    await updateProfileAvatar('default', { avatarType: 'emoji', avatarUri: null, avatarEmoji: '🚀', avatarColor: '#CDEEF7' });
    unsubscribe();

    const [principal] = await getProfiles();
    expect(principal).toMatchObject({ id: 'default', avatarType: 'emoji', avatarEmoji: '🚀', avatarColor: '#CDEEF7' });
    expect(listener).toHaveBeenCalled();
  });

  it('la hoja permite elegir emoji y color y lo guarda', async () => {
    const [principal] = await getProfiles();
    const onClose = jest.fn();
    await render(<AvatarEditorSheet visible profile={{ ...principal, avatarType: 'initials' }} name="Laura" onClose={onClose} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Emoji' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Emoji 🦊' }));
    await fireEvent.press(screen.getByRole('radio', { name: `Color 3 de ${PASTEL_LIST.length}` }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [saved] = await getProfiles();
    expect(saved).toMatchObject({ avatarType: 'emoji', avatarEmoji: '🦊', avatarColor: PASTEL_LIST[2] });
  });
});
