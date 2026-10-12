import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { haptics, heavy, selection, success, tap, warning } from '../haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const mocked = jest.mocked(Haptics);

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('haptics', () => {
  it('maps each wrapper to the right feedback', () => {
    tap();
    expect(mocked.impactAsync).toHaveBeenLastCalledWith(Haptics.ImpactFeedbackStyle.Light);
    heavy();
    expect(mocked.impactAsync).toHaveBeenLastCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
    success();
    expect(mocked.notificationAsync).toHaveBeenLastCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
    warning();
    expect(mocked.notificationAsync).toHaveBeenLastCalledWith(
      Haptics.NotificationFeedbackType.Warning
    );
    selection();
    expect(mocked.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('exposes the same functions on the haptics object', () => {
    expect(haptics).toEqual({ tap, selection, success, warning, heavy });
  });

  it('returns nothing and swallows native failures', async () => {
    mocked.impactAsync.mockRejectedValueOnce(new Error('no haptics engine'));
    expect(tap()).toBeUndefined();
    mocked.notificationAsync.mockImplementationOnce(() => {
      throw new Error('native module missing');
    });
    expect(() => success()).not.toThrow();
    await Promise.resolve(); // let the rejected promise settle; Jest fails on unhandled rejections
  });

  it('no-ops on web', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    tap();
    selection();
    success();
    warning();
    heavy();
    expect(mocked.impactAsync).not.toHaveBeenCalled();
    expect(mocked.notificationAsync).not.toHaveBeenCalled();
    expect(mocked.selectionAsync).not.toHaveBeenCalled();
  });
});
