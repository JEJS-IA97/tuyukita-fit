import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRequest } from '@/hooks/use-request';
import { ApiError } from '@/api/errors';

describe('useRequest loading and error states (RF-021)', () => {
  it('moves from loading to data', async () => {
    let resolveRequest: (value: string) => void = () => undefined;
    const request = () =>
      new Promise<string>((resolve) => {
        resolveRequest = resolve;
      });

    const { result } = await renderHook(() => useRequest(request));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    await act(async () => {
      resolveRequest('datos');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('datos');
    expect(result.current.error).toBeNull();
  });

  it('captures API errors so screens can show them', async () => {
    const apiError = new ApiError('Sin conexion con el servidor', 'network');
    const { result } = await renderHook(() =>
      useRequest(() => Promise.reject(apiError)),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(apiError);
    expect(result.current.error?.message).toBe('Sin conexion con el servidor');
    expect(result.current.data).toBeNull();
  });

  it('does not run automatically when immediate is false', async () => {
    const request = jest.fn().mockResolvedValue('x');

    const { result } = await renderHook(() => useRequest(request, { immediate: false }));

    expect(result.current.loading).toBe(false);
    expect(request).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.run();
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe('x');
    expect(result.current.loading).toBe(false);
  });
});
