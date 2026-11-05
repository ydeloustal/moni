import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render';
import { AccentPicker } from '../components/AccentPicker';

describe('AccentPicker', () => {
  it('offers one labelled radio per colour', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<AccentPicker value="ink" onChange={onChange} />);
    expect(screen.getAllByRole('radio')).toHaveLength(6);
    expect(screen.getByRole('radio', { name: 'Neutre' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Vert' }));
    expect(onChange).toHaveBeenCalledWith('green');
  });
});
