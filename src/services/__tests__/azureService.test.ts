
import { fetchAppServices } from '../azureService';

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ name: 'app1' }]),
  })
) as jest.Mock;

describe('azureService', () => {
  it('fetches app services', async () => {
    const data = await fetchAppServices();
    expect(data).toEqual([{ name: 'app1' }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
